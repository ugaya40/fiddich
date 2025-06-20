# Fiddich State Management Architecture

## Overview

Fiddichの状態管理は、通常時とatomicUpdate（トランザクション）時で異なる動作をします。
この文書では、現在の実装における値の取得、依存関係管理、および再計算の詳細な仕組みを説明します。

### 重要な設計原則
- **Copy-on-Write**: atomicUpdate内では、すべての状態のコピーを作成して操作
- **遅延評価**: Computedの再計算は実際に値が必要になるまで遅延
- **トランザクショナル**: すべての変更はコミット時に一括適用、エラー時は完全にロールバック

## State Types

- **Cell**: 基本的な状態コンテナ（読み書き可能）
- **Computed**: 他のStateから派生する計算値（読み取り専用、`onChange`コールバック付きも可能）

## 値の管理

### 通常時
- すべてのStateは`stableValue`プロパティに値を保持
- `get(state)`で`stableValue`を返す
- 変更は即座に`stableValue`に反映される

### atomicUpdate時
- StateCopyが作成され、`value`プロパティに一時的な値を保持
- `ops.get(state)`でコピーの`value`を返す
- 変更はコピーに保存され、コミット時に`stableValue`に反映される

## 依存関係の管理

### データ構造
```typescript
// 各Stateが持つ依存関係
Cell/Computed: {
  dependents: Set<DependentState>  // このStateに依存しているState
}

Computed: {
  dependencies: Set<DependencyState>  // このStateが依存しているState
  dependents: Set<DependentState>    // このStateに依存しているState
}
```

### 通常時の依存関係登録

1. **Computedの遅延初期化**
   ```typescript
   const computed = createComputed(({ get }) => get(cellA) + get(cellB));
   // この時点では初期化されない（isInitialized: false）
   ```

2. **初回アクセス時の初期化**
   ```typescript
   const value = get(computed);  // ここで初期化
   // 1. compute関数を実行
   // 2. getが呼ばれるたびにdependenciesに追加
   // 3. 各dependencyのdependentsにcomputedを追加
   // 4. isInitializedフラグをtrueに設定
   ```

### atomicUpdate時の依存関係管理

1. **未初期化Computedの扱い**
   - 通常時: 初回アクセス時に元のStateで初期化
   - atomicUpdate時: コピー世界でのみ初期化し、コミット時に元に反映
   - この設計により、ロールバック時も元のStateは変更されない

2. **StateCopyの作成とビルド**
   ```typescript
   // createCopyStore.getCopy()の動作
   function getCopy(state) {
     const existing = copyStoreMap.get(state);
     if (existing) {
       // 循環参照チェック: 初期化中のComputedが再度アクセスされた場合
       // copyingStatesに含まれている = 現在コピー作成中 = 循環参照
       const isCircularDependency = 
         isComputed(state) && 
         !state.isInitialized && 
         copyingStates.has(state) &&  // キーとなるチェック: コピー作成中 = 循環参照
         isComputedCopy(existing) && 
         !existing.isInitialized;
       
       if (isCircularDependency) {
         throw new Error(`Circular dependency detected: ${state.id}`);
       }
       return existing;
     }
     
     copyingStates.add(state);
     
     try {
       const newCopy = createCopy(state);  // 基本構造のコピー
       copyStoreMap.set(state, newCopy);
       
       // 未初期化Computedの場合、コピー世界で初期化
       if (isComputed(state) && !state.isInitialized) {
         const value = withCircularDetection(state, () => 
           state.compute(copyGetter)
         );
         // 依存関係の設定
       }
       
       return newCopy;
     } finally {
       copyingStates.delete(state);  // 確実にクリーンアップ
     }
   }
   ```

3. **再計算の仕組み（Push型評価）**
   ```typescript
   // ops.set(cell, value)が呼ばれると：
   // 1. cellのコピーの値を更新
   // 2. cellの依存先（dependents）をvalueDirtyに追加
   
   // コミット時のhandleValueDirty：
   // 1. valueDirtyをrank順にソート
   // 2. 低いrankから順に処理（依存元から依存先へ）
   // 3. 各Computedを再計算し、変更があれば依存先を追加
   ```

4. **再計算時の依存関係更新（createDependencyTracker）**
   ```typescript
   // 差分検出パターン（引き算方式）
   const remainingDependencies = new Set(copy.dependencies);
   let hasNewDependencies = false;
   
   // 既存の依存関係をクリア（双方向）
   for(const dep of copy.dependencies) {
     dep.dependents.delete(copy);
   }
   copy.dependencies.clear();
   
   // 再計算中に新しい依存関係を構築
   const getter = (target) => {
     const targetCopy = getCopy(target);
     
     // 依存先も再計算が必要なら先に再計算（再帰的）
     if (targetCopy.kind === 'computed' && valueDirty.has(targetCopy)) {
       recomputeDependent(targetCopy);
     }
     
     // 依存関係を追跡
     trackDependency(targetCopy);
     return targetCopy.value;
   };
   ```

5. **コミット時の処理**
   - Phase 1: newlyInitializedの処理（コピー世界で初期化されたComputedを元に反映）
   - Phase 2: valueDirtyにあるComputedを再計算
   - Phase 3: バージョンチェック（楽観的同時実行制御）
   - Phase 4: valueChangedDirtyの変更を元のStateに反映
   - Phase 5: dependencyDirtyの依存関係を更新
   - Phase 6: toDisposeのオブジェクトをdispose

## 初期化のタイミング

### 遅延初期化の利点
- 使用されないComputedは初期化されない（パフォーマンス向上）
- 初期化時のコンテキストに応じた適切な値取得

### 初期化が発生するケース
1. `get(computed)` - 通常のアクセス
2. `ops.get(computed)` - atomicUpdate内でのアクセス  
3. `computed.toJSON()` - シリアライズ時
4. 他のComputedから参照された時

## トランザクション（atomicUpdate）の詳細な流れ

### 例：依存関係のある状態更新
```typescript
// 初期状態
const cellA = createCell(5);
const cellB = createCell(3);
const computedSum = createComputed(({ get }) => get(cellA) + get(cellB));
const computedDouble = createComputed(({ get }) => get(computedSum) * 2);

atomicUpdate((ops) => {
  // 1. Cellの更新
  ops.set(cellA, 10);
  // → cellAのコピーのvalueが10に更新
  // → computedSumとcomputedDoubleがvalueDirtyに追加
  
  // 2. Computedの値取得（遅延再計算）
  const sum = ops.get(computedSum);
  // → valueDirtyにあるので再計算が必要
  // → 再計算: get(cellA) + get(cellB) = 10 + 3 = 13
  // → computedDoubleもvalueDirtyに追加（連鎖）
  
  // 3. 依存するComputedの値取得
  const double = ops.get(computedDouble);
  // → valueDirtyにあるので再計算
  // → 再計算: get(computedSum) * 2 = 13 * 2 = 26
  
  // 4. touchによる手動通知
  ops.touch(cellB);
  // → cellBはvalueChangedDirtyに追加
  // → computedSumが再度valueDirtyに追加
});
// → コミット処理が実行される
```

### コミット処理の詳細
```typescript
const commit = () => {
  // Phase 1: 新規初期化されたComputedの処理
  handleNewlyInitialized(newlyInitialized);
  // → コピー世界で初期化されたComputedを元のStateに反映
  // → 値、依存関係、isInitializedフラグを設定
  
  // Phase 2: 残っているvalueDirtyを処理
  handleValueDirty(context);
  // → まだ再計算されていないComputedを再計算
  
  // Phase 3: バージョンチェック（楽観的同時実行制御）
  handleConcurrentModification(context);
  // → Cellのバージョンが変更されていないか確認
  
  // Phase 4: 値の反映とコールバック実行
  handleValueChanges(context);
  // → stableValueを更新
  // → Cellのバージョンをインクリメント
  // → ComputedのchangeCallbackを実行
  
  // Phase 5: 依存関係の更新
  handleDependencyChanges(context);
  // → 古い依存関係をクリア
  // → 新しい依存関係を設定
  // → dependencyVersionを更新
  
  // Phase 6: dispose処理
  handleDisposables(context);
  // → 登録されたDisposableオブジェクトをdispose
};
```

## エラー時のロールバック

- コピーは破棄される
- 元のStateは変更されない
- 新規作成されたStateは参照が残らない（GCされる）

## 重要な実装詳細

### createDependencyTracker（差分検出）
最も複雑な部分。Computed再計算時の依存関係の変更を効率的に検出。

```typescript
function createDependencyTracker(copy, store, recomputeDependent) {
  // 既存の依存関係を記録（差分検出用）
  const remainingDependencies = new Set(copy.dependencies);
  let hasNewDependencies = false;
  
  // trackDependency: getter内で呼ばれる度に依存関係を更新
  const trackDependency = (targetCopy) => {
    if (!remainingDependencies.has(targetCopy)) {
      hasNewDependencies = true;  // 新しい依存関係
    } else {
      remainingDependencies.delete(targetCopy);  // 既存の依存関係
    }
    // 双方向の参照を更新
    copy.dependencies.add(targetCopy);
    targetCopy.dependents.add(copy);
  };
  
  // hasChanges: 依存関係に変更があったか
  // - 新しい依存関係が追加された
  // - または、以前の依存関係が使われなくなった
  const hasChanges = () => 
    hasNewDependencies || remainingDependencies.size > 0;
}
```

### バージョン管理
- `valueVersion`: Cellの値の変更を追跡（楽観的同時実行制御）
- `dependencyVersion`: Computedの依存関係の変更を追跡
- コミット時にバージョンチェックを行い、並行変更を検出

### 5つのdirtyセットとtoDispose
- `valueDirty: Set<DependentCopy>`: 再計算が必要なComputed
- `valueChangedDirty: Set<StateCopy>`: 値が変更されたState（Cell/Computed）
- `dependencyDirty: Set<StateCopy>`: 依存関係が変更されたState
- `newlyInitialized: Set<ComputedCopy>`: atomicUpdate中に初期化されたComputed
- `toDispose: Set<Disposable>`: コミット時にdisposeするオブジェクト

### Rankベースの実行順序管理

#### ダイヤモンド依存の問題
```
root (Cell)
├─ left (Computed)  ─┐
└─ right (Computed) ─┘→ bottom (Computed)
```

素朴な実装では、bottomがleftとrightの両方に依存している場合、
rootが更新されるとbottomが2回計算される可能性がある。

#### Rankによる解決
```typescript
// 初期化時
root.rank = 0     // Cellはrankは0
left.rank = 1     // max(root.rank) + 1
right.rank = 1    // max(root.rank) + 1
bottom.rank = 2   // max(left.rank, right.rank) + 1

// handleValueDirtyでの処理
valueDirty = {left(1), right(1), bottom(2)}
// rank順にソート: [left(1), right(1), bottom(2)]
// leftとrightが先に処理され、bottomは一度だけ計算される
```

### 再計算の流れ（Push型）
1. Cell Aが変更される → AのdependentsがvalueDirtyに追加
2. handleValueDirtyでrank順に処理
   - 低いrank（依存元）から順に処理
   - 各Computedを再計算
   - 値が変わればそのdependentsをvalueDirtyに追加
3. whileループで新たに追加されたノードも処理
4. すべての影響を受けるComputedが正しい順序で1回だけ更新される

### メモリ管理とリソース解放
- `isDisposable`型ガードでオブジェクトがDisposableかチェック
- `set`操作時に古い値を自動的にdispose（トランザクショナル）
- Cell自体のdispose時に保持している値もdispose
- すべてのdispose処理はコミット時まで遅延

## 循環依存検出

スコープベースの`CircularDetector`により、Computedの初期化時と再計算時に循環依存を検出：

```typescript
// stateUtil.tsのglobalCircularDetector
type CircularDetector = {
  setScope: (obj: {}) => void,
  exitScope: (obj: {}) => void,
  add(targetUnit: string, target: Computed | ComputedCopy): void,
}

function createCircularDetector(): CircularDetector {
  let rootObject: {} | null = null;
  const map = new Map<string, Set<string>>();
  
  const setScope = (obj: {}) => {
    if (rootObject == null) {
      rootObject = obj; // 最初のスコープがルートになる
    }
  };
  
  const exitScope = (obj: {}) => {
    if (obj === rootObject) {
      map.clear(); // ルートスコープ終了時のみクリア
      rootObject = null;
    }
  };
  
  const add = (targetUnit: string, target: Computed | ComputedCopy) => {
    // targetUnitごとに独立したSetで管理
    if (!map.has(targetUnit)) {
      map.set(targetUnit, new Set());
    }
    const targetSet = map.get(targetUnit)!;
    
    if (targetSet.has(target.id)) {
      throw new Error(`Circular dependency detected: ${target.id}`);
    }
    targetSet.add(target.id);
  };
  
  return { setScope, exitScope, add };
}
```

### 入れ子スコープの扱い
- 最初に`setScope`を呼んだオブジェクトがルートスコープとなる
- 入れ子で`setScope/exitScope`が呼ばれても、ルートスコープのみが有効
- ルートスコープが終了するまで、すべての循環依存情報が保持される
- これにより、深い再帰呼び出しでも正確に循環依存を検出

### 検出される場所（4つの起点）
1. **トップレベルget（初期化）**: `initializeComputedState`内
2. **ops.get（再計算とコピー初期化）**: `createGet`および`createInnerGet`内  
3. **getCopy（コピー初期化）**: `copyStore.getCopy`内で未初期化Computed処理時
4. **handleValueDirty（コミット時）**: `commit.ts`のhandleValueDirty内

各起点はtargetUnit（'initialize', 'recompute', 'copy-initialize'など）で文脈を区別。

## Pending機能（非同期状態の伝播）

React Suspenseとの統合のため、非同期処理中の状態を伝播：

```typescript
// 使用例
atomicUpdate(async (ops) => {
  const data = await fetchData();
  ops.set(cell, data);
  ops.pending(cell); // 自動的にatomicUpdateのPromiseが使用される
});

// または明示的にPromiseを指定
const promise = fetchData();
pending(cell, promise);
```

### 実装の詳細（最適化済み）
```typescript
export function pending<T>(state: State<T>, promise: Promise<any>): void {
  const visited = new Set<State>();
  const states: State[] = [];
  
  // 依存グラフ全体を収集
  function collectStates(s: State): void {
    if (visited.has(s)) return;
    visited.add(s);
    states.push(s);
    s.pendingPromise = promise;
    
    for (const dependent of s.dependents) {
      collectStates(dependent);
    }
  }
  
  collectStates(state);
  
  // Promiseごとに1回だけfinallyコールバックを登録（メモリ効率化）
  promise.finally(() => {
    for (const s of states) {
      if (s.pendingPromise === promise) {
        s.pendingPromise = undefined;
      }
    }
  });
}
```

## React連携

### useValueフック
```typescript
export function useValue<T>(state: State<T>): T {
  const value = useSyncExternalStore(
    (onStoreChange) => {
      // 変更監視用のComputedを作成
      const watcher = createComputed(
        ({ get }) => get(state),
        { onChange: onStoreChange }
      );
      initializeComputedState(watcher);
      return () => watcher[Symbol.dispose]();
    },
    () => getSuspense(state), // Suspenseサポート
    () => getSuspense(state)  // SSR対応
  );
  return value;
}
```

## パフォーマンス最適化

### lazyFunction - 遅延初期化
atomicOperations内で使用されない関数の初期化を遅延：

```typescript
export function lazyFunction<T extends (...args: any[]) => any>(
  factory: () => T
): T {
  let fn: T | undefined;
  return ((...args) => {
    if (!fn) fn = factory();
    return fn(...args);
  }) as T;
}

// 使用例：atomicOperations
{
  get: context.contextGetter, // 常に使用されるので事前作成
  set: lazyFunction(() => createSet(context)), // 必要時に作成
  touch: lazyFunction(() => createTouch(context)),
  dispose: lazyFunction(() => createDispose(context)),
  pending: lazyFunction(() => createPending(context))
}
```

### コピー作成の最適化
- `copyingStates`セットで循環参照を検出
- 早期にcopyStoreMapに登録して自己参照を処理
- 依存関係の再帰的コピーを効率化
- try-finallyで`copyingStates`を確実にクリーンアップ

## モジュール構造

### コアモジュール
- `state.ts` - 型定義
- `createCell.ts` / `createComputed.ts` - State作成
- `get.ts` / `set.ts` / `touch.ts` - 基本操作
- `atomicUpdate.ts` - トランザクションAPI
- `pending.ts` - 非同期状態管理
- `stateUtil.ts` - 共通ユーティリティ（withCircularDetection含む）

### atomicContext/
- `index.ts` - コンテキスト作成
- `types.ts` - 型定義
- `copyStore.ts` - コピー管理とコピー世界での初期化
- `commit.ts` - コミット処理

### atomicOperations/
- `get.ts` - コンテキスト対応のget
- `set.ts` - コンテキスト対応のset
- `touch.ts` - 手動での変更通知
- `dispose.ts` - リソース解放予約
- `pending.ts` - 非同期状態設定
- `recompute.ts` - 再計算ロジック

## 実装上の重要な原則

### 1. 副作用の実行タイミング
- **ユーザーコード**: atomicUpdate内でユーザーは自由に副作用を実行できる
  - API呼び出し、DOM操作、ログ出力など
  - これらの副作用はロールバック時も元に戻せない（想定された動作）
- **ライブラリ管理の副作用**: changeCallbackやdisposeはコミット時まで遅延
  - ロールバック時にライブラリ起因の副作用が実行されない
  - 状態の一貫性を保証

### 2. 初期化の扱い
- 通常時：元のStateで初期化
- atomicUpdate時：コピー世界でのみ初期化し、コミット時に元に反映
- これによりロールバック時も元のStateは不変

### 3. バージョン管理
- 楽観的同時実行制御により並行変更を検出
- valueVersion（Cell）とdependencyVersion（Computed）を別管理
- 競合時は明確なエラーで失敗

### 4. 型安全性
- 関数オーバーロードで型推論を最大化
- ジェネリクスで型の伝播を保証
- `as`キャストを極力回避
- テストコードでも`any`の使用を避け、適切な型定義を使用

## 実装の最適化

### ComputedCopyの簡潔化
- ComputedCopyに`compute`フィールドは不要
- 常に`original.compute`を使用することで、コピーのサイズを削減
- 初期化フラグ（`isInitialized`）のみをコピーで管理

### getCopyの循環参照検出
- `copyingStates`セットで現在コピー中のStateを追跡
- 既存のコピーが存在し、かつ`copyingStates`に含まれている場合のみ循環参照と判定（より正確な検出）
- 初期化されていないComputedが再帰的にアクセスされた場合、循環依存エラー
- `withCircularDetection`と組み合わせて二重の安全性を確保

### ｒベースの実行順序管理
- 各StateCopyに`rank`フィールドを追加
- `rank = max(dependencies.rank) + 1`で計算
- handleValueDirtyでrank順にソートして処理
- ダイヤモンド依存でも正しい順序で1回だけ計算