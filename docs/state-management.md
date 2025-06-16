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
- **Computed**: 他のStateから派生する計算値（読み取り専用）
- **LeafComputed**: 値の変更時にコールバックを実行できるComputed

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

Computed/LeafComputed: {
  dependencies: Set<DependencyState>  // このStateが依存しているState
  dependents: Set<DependentState>    // このStateに依存しているState
}
```

### 通常時の依存関係登録

1. **Computed/LeafComputedの遅延初期化**
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
   ```

### atomicUpdate時の依存関係管理

1. **StateCopyの作成とビルド**
   ```typescript
   // createStateCopyStore.getCopy()の動作
   function getCopy(state) {
     if (copyStore.has(state)) return copyStore.get(state);
     
     const newCopy = createCopy(state);  // 基本構造のコピー
     copyStore.set(state, newCopy);
     buildDependencies(state, newCopy);  // 依存関係の複製
     return newCopy;
   }
   ```

2. **再計算の仕組み（遅延評価）**
   ```typescript
   // ops.set(cell, value)が呼ばれると：
   // 1. cellのコピーの値を更新
   // 2. cellの依存先（dependents）をvalueDirtyに追加
   
   // ops.get(computed)が呼ばれると：
   // 1. computedがvalueDirtyに含まれているかチェック
   // 2. 含まれていれば、その場でrecomputeDependentを実行
   // 3. 再計算後、valueDirtyから削除
   ```

3. **再計算時の依存関係更新（createDependencyTracker）**
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

4. **コミット時の処理**
   - Phase 1: valueDirtyにあるComputed/LeafComputedを再計算
   - Phase 2: バージョンチェック（楽観的同時実行制御）
   - Phase 3: valueChangedDirtyの変更を元のStateに反映
   - Phase 4: dependencyDirtyの依存関係を更新
   - Phase 5: toDisposeのオブジェクトをdispose

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
  // Phase 1: 残っているvalueDirtyを処理
  for(const copy of valueDirty) {
    if(copy.kind === 'computed' || copy.kind === 'leafComputed') {
      recomputeDependent(copy);
    }
  }
  
  // Phase 2: バージョンチェック
  for(const copy of valueChangedDirty) {
    if (copy.kind === 'cell' && 
        copy.original.valueVersion !== copy.valueVersion) {
      throw new Error('Concurrent modification');
    }
  }
  
  // Phase 3: 値の反映とコールバック実行
  for(const copy of valueChangedDirty) {
    const prevValue = copy.original.stableValue;
    copy.original.stableValue = copy.value;
    
    if (copy.original.kind === 'cell') {
      copy.original.valueVersion++;
    }
    
    if(copy.original.kind === 'leafComputed' && 
       copy.original.changeCallback) {
      copy.original.changeCallback(prevValue, copy.value);
    }
  }
  
  // Phase 4: 依存関係の更新
  for(const copy of dependencyDirty) {
    // 古い依存関係をクリア
    // 新しい依存関係を設定
    // dependencyVersionを更新
  }
  
  // Phase 5: dispose処理
  for (const disposable of toDispose) {
    disposable[Symbol.dispose]();
  }
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
- `dependencyVersion`: Computed/LeafComputedの依存関係の変更を追跡
- コミット時にバージョンチェックを行い、並行変更を検出

### 4つのdirtyセットとtoDispose
- `valueDirty: Set<DependentCopy>`: 再計算が必要なComputed/LeafComputed
- `valueChangedDirty: Set<StateCopy>`: 値が変更されたState（Cell/Computed/LeafComputed）
- `dependencyDirty: Set<StateCopy>`: 依存関係が変更されたState
- `toDispose: Set<Disposable>`: コミット時にdisposeするオブジェクト

### 再計算の連鎖
1. Cell Aが変更される → AのdependentsがvalueDirtyに追加
2. Computed Bがget時に再計算 → Bの値が変わればBのdependentsもvalueDirtyに追加
3. この連鎖により、影響を受けるすべてのComputedが適切に更新される

### メモリ管理とリソース解放
- `isDisposable`型ガードでオブジェクトがDisposableかチェック
- `set`操作時に古い値を自動的にdispose（トランザクショナル）
- Cell自体のdispose時に保持している値もdispose
- すべてのdispose処理はコミット時まで遅延