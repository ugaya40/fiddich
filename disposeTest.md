# Dispose単体テスト項目一覧

## test-new/unit/atomic-operations/ops-dispose.test.ts

### 1. should schedule disposal for commit time
- **確認内容**: atomicUpdate内でのdisposeが即座に実行されず、commit時まで遅延される
- **テスト内容**: dispose呼び出し直後は未実行、atomicUpdate完了後に実行を確認

### 2. should not dispose on rollback
- **確認内容**: エラーによるロールバック時にdisposeが実行されない
- **テスト内容**: エラーをthrowした場合、disposeが呼ばれないことを確認

### 3. should handle multiple dispose calls
- **確認内容**: 複数のdispose呼び出しが順序通りに実行される
- **テスト内容**: 3つのCellをdisposeし、実行順序を確認

### 4. should dispose current value when cell is disposed
- **確認内容**: Cellのdispose時に、保持している値もdisposeされる
- **テスト内容**: disposable値を持つCellをdisposeすると、値のdisposeも呼ばれる

### 5. should work with computed states
- **確認内容**: Computedのdisposeが正しく動作する
- **テスト内容**: Computedをdisposeできることを確認

### 6. should handle dispose with set operations
- **確認内容**: setとdisposeを組み合わせた場合の動作
- **テスト内容**: set後にdisposeすると、古い値と新しい値の両方がdisposeされる

### 7. should not dispose twice if already scheduled
- **確認内容**: 同じ対象を複数回disposeしても1回だけ実行される
- **テスト内容**: 同じCellを3回disposeしても、実際のdisposeは1回のみ

### 8. should clear dispose queue on rejectAllChanges
- **確認内容**: rejectAllChangesでdispose予約がクリアされる
- **テスト内容**: dispose後にrejectAllChangesを呼ぶとdisposeが実行されない

### 9. should handle dispose after rejectAllChanges
- **確認内容**: rejectAllChanges後の再dispose
- **テスト内容**: rejectAllChanges後に再度disposeした場合は実行される

### 10. should dispose in correct order with dependencies
- **確認内容**: 依存関係がある場合でも指定順序でdispose
- **テスト内容**: Cell A, Computed, Cell Bの順でdisposeし、順序を確認

## 追加したテスト（新しいdispose仕様）

### chain disposal セクション

#### 11. should dispose dependent computed when cell is disposed
- **確認内容**: Cellをdisposeすると依存しているComputedも連鎖的にdisposeされる
- **概念**: 親（Cell）が破棄されたら、それに依存する子（Computed）も自動的に破棄されるべき

#### 12. should dispose entire dependency chain deeply
- **確認内容**: A→B→C→Dのような深い依存チェーンで、Aをdisposeすると全てが連鎖的にdisposeされる
- **概念**: 依存チェーンがどれだけ深くても、ルートの破棄が末端まで伝播する

#### 13. should dispose all branches in forked dependencies
- **確認内容**: 1つのCellから複数のComputedが派生している場合、全ての分岐がdisposeされる
- **概念**: 依存ツリーの全ての枝が漏れなく破棄される

#### 14. should handle diamond dependency correctly
- **確認内容**: ダイヤモンド型依存（A→B,C→D）で、各ノードが1回だけdisposeされる
- **概念**: 複数経路から到達可能なノードでも、破棄は1回だけ実行される

### access control after dispose セクション

#### 15. should error on get after dispose in atomicUpdate
- **確認内容**: atomicUpdate内でdispose後にgetするとエラーになる
- **概念**: 破棄したリソースへのアクセスは即座にエラーになる（手続き型の自然さ）

#### 16. should error when accessing uninitialized computed after disposing its dependency
- **確認内容**: cell→computedA→computedB（未初期化）の構造で、cellをdispose後にcomputedBをgetするとエラー
- **概念**: 未初期化のComputedでも、依存チェーンのルートがdisposeされていればアクセス不可

#### 17. should allow access to cell but not to dependent computed after middle computed disposal
- **確認内容**: computedAのみdisposeした場合、cellは内外でアクセス可能、computedBはエラー
- **概念**: disposeは上流（依存元）には影響せず、下流（依存先）のみに影響する

#### 18. should error when accessing deeply nested uninitialized computed after root disposal
- **確認内容**: cell→A→B（両方未初期化）でcellをdispose後、atomicUpdate外でBにアクセスするとエラー
- **概念**: 深くネストした未初期化Computedでも、ルートがdisposeされていれば初期化時にエラー

#### 19. should error on set after dispose in atomicUpdate
- **確認内容**: atomicUpdate内でdispose後にsetするとエラーになる
- **概念**: 破棄したCellへの値設定は論理的に不正

#### 20. should error on touch after dispose in atomicUpdate
- **確認内容**: atomicUpdate内でdispose後にtouchするとエラーになる
- **概念**: 破棄したStateの更新通知も不正な操作

### circular dependency handling セクション

#### 21. should handle mutual dependency without infinite loop
- **確認内容**: 複雑な共有依存関係でも無限ループしない
- **概念**: visitedセットにより、どんなに複雑なグラフ構造でも各ノードは1回だけ処理される

#### 22. should not dispose the same state multiple times
- **確認内容**: 複数の経路から到達可能なノードでも1回だけdisposeされる
- **概念**: ダイヤモンド依存などで同じノードに複数経路から到達しても、visitedで重複を防ぐ

### isCommitting flag interaction セクション

#### 23. should skip dispose check during commit phase
- **確認内容**: commit処理中（isCommitting=true）はdisposeチェックがスキップされる
- **概念**: commit処理では内部的にdispose済みのStateにもアクセスする必要があるため、特別扱いする