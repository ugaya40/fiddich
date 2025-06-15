# Fiddich State Management Architecture

## Overview

Fiddichの状態管理は、通常時とatomicUpdate（トランザクション）時で異なる動作をします。
この文書では、値の取得と依存関係管理の詳細な仕組みを説明します。

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

1. **StateCopyの作成**
   ```typescript
   const copy = {
     dependencies: new Set([...state.dependencies].map(getCopy)),
     dependents: new Set([...state.dependents].map(getCopy))
   };
   ```
   - 元の依存関係をコピーの世界に複製

2. **再計算時の依存関係更新（createDependencyTracker）**
   ```typescript
   // 差分検出パターン（引き算方式）
   const remainingDependencies = new Set(copy.dependencies);
   
   // 再計算中に参照されたものをremainingから削除
   // 残ったもの = もう依存していない
   // 新規追加 = remainingになかったもの
   ```

3. **コミット時の反映**
   - コピーの依存関係を元のStateに反映
   - 双方向の参照を適切に更新

## 初期化のタイミング

### 遅延初期化の利点
- 使用されないComputedは初期化されない（パフォーマンス向上）
- 初期化時のコンテキストに応じた適切な値取得

### 初期化が発生するケース
1. `get(computed)` - 通常のアクセス
2. `ops.get(computed)` - atomicUpdate内でのアクセス  
3. `computed.toJSON()` - シリアライズ時
4. 他のComputedから参照された時

## トランザクション（atomicUpdate）の流れ

```typescript
atomicUpdate((ops) => {
  // 1. 変更操作
  ops.set(cellA, 10);
  
  // 2. 新規State作成（遅延初期化）
  const computed = createComputed(({ get }) => get(cellA) * 2);
  
  // 3. 値の取得（この時点で初期化）
  const value = ops.get(computed);  // 20（コピーの値を使用）
  
  // 4. コミット
  // - valueChangedDirtyの変更を反映
  // - dependencyDirtyの依存関係を更新
});
```

## エラー時のロールバック

- コピーは破棄される
- 元のStateは変更されない
- 新規作成されたStateは参照が残らない（GCされる）

## 重要な実装詳細

### createDependencyTracker（差分検出）
最も複雑な部分。Computed再計算時の依存関係の変更を効率的に検出。

### バージョン管理
- `valueVersion`: 値の変更を追跡
- `dependencyVersion`: 依存関係の変更を追跡
- 楽観的同時実行制御に使用

### 3つのdirtyセット
- `valueDirty`: 再計算が必要なComputed/LeafComputed
- `valueChangedDirty`: 値が変更されたState（Cellの直接更新を含む）
- `dependencyDirty`: 依存関係が変更されたState