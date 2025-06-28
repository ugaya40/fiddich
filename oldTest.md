# Fiddich テストファイル詳細サマリー

## 1. pending.test.ts (17個のテスト)

### describe: Pending functionality

#### describe: Global pending function
1. **should set pending promise on state**
   - Stateにpending promiseを設定できることを確認

2. **should propagate pending to dependents**
   - pendingがdependentsに伝播することを確認

3. **should clear pending after promise resolves**
   - Promiseが解決された後、pendingがクリアされることを確認

4. **should clear pending after promise rejects**
   - Promiseが拒否された後でも、pendingがクリアされることを確認

5. **should handle multiple states with same promise efficiently**
   - 同じPromiseを複数のStateで効率的に処理できることを確認

#### describe: ops.pending in atomicUpdate
6. **should use atomicUpdate promise when no promise provided**
   - Promiseが提供されない場合、atomicUpdateのPromiseを使用することを確認

7. **should accept explicit promise in async atomicUpdate**
   - 非同期atomicUpdate内で明示的なPromiseを受け入れることを確認

8. **should propagate through dependencies in atomicUpdate**
   - atomicUpdate内で依存関係を通じてpendingが伝播することを確認

#### describe: Complex pending scenarios
9. **should handle overlapping pending states**
   - 重複するpending状態を適切に処理できることを確認（新しいpendingが古いものを上書き）

10. **should handle pending with dynamic dependencies**
    - 動的な依存関係でpendingを処理できることを確認

11. **should work with nested atomicUpdate**
    - ネストされたatomicUpdateでpendingが機能することを確認

12. **should handle pending with rejectAllChanges**
    - rejectAllChangesを使用してもpendingPromiseが保持されることを確認

#### describe: Pending with computed initialization
13. **should handle pending during lazy initialization**
    - 新規作成したComputedは、初期化時に依存するCellのpending状態を自動的に継承することを確認

14. **should handle pending in atomicUpdate initialization**
    - atomicUpdate内での初期化時のpending処理を確認

#### describe: Error handling
15. **should continue clearing pending even if finally handler throws**
    - finallyハンドラーがエラーを投げてもpendingがクリアされることを確認

#### describe: Performance considerations
16. **should handle large dependency graphs correctly**
    - 大規模な依存グラフでpendingが正しく処理されることを確認

17. **should avoid duplicate work when visiting same state multiple times**
    - ダイヤモンド依存構造で各Stateが一度だけ訪問されることを確認

## 2. minimal-computation.test.ts (12個のテスト)

### describe: Minimal Computation

#### describe: Diamond dependency pattern
1. **should compute each node only once in diamond pattern**
   - ダイヤモンド型の依存関係で、各ノードが一度だけ計算されることを確認

2. **should handle multiple diamond patterns**
   - 複数のダイヤモンド型パターンでも各ノードが一度だけ計算されることを確認

#### describe: Propagation stopping
3. **should stop propagation when computed value does not change**
   - Computedの値が変わらない場合、伝播が停止することを確認

4. **should handle complex propagation stopping chains**
   - 複雑な伝播停止チェーンでも正しく動作することを確認

#### describe: Conditional dependencies
5. **should not recompute branches not taken**
   - 条件分岐で選択されていないブランチは再計算されないことを確認（ただし一貫性のため計算される）

#### describe: Batch updates
6. **should compute each dependent only once in atomicUpdate**
   - atomicUpdate内で複数の変更があっても、各依存は一度だけ計算されることを確認

7. **should handle complex batch updates efficiently**
   - 複雑なバッチ更新でも効率的に処理されることを確認

#### describe: Lazy evaluation
8. **should not compute until accessed**
   - アクセスされるまで計算されないことを確認（ただし、依存が更新されると即座に再計算される）

9. **should handle lazy evaluation in dependency chains**
   - 依存チェーンで遅延評価が正しく動作することを確認

#### describe: Custom compare functions
10. **should use custom compare to determine minimal updates**
    - カスタム比較関数を使用して最小限の更新を決定することを確認

#### describe: Edge cases
11. **should handle empty dependency changes**
    - 空の依存関係変更を処理できることを確認

12. **should handle rapid changes efficiently**
    - 高速な変更を効率的に処理できることを確認（atomicUpdate内で）

## 3. lazy-initialization.test.ts (10個のテスト)

### describe: Computed lazy initialization

#### describe: Basic lazy initialization
1. **should not compute value until first access**
   - 最初のアクセスまで値が計算されないことを確認

2. **should establish dependencies on first access**
   - 最初のアクセス時に依存関係が確立されることを確認

3. **should cache value after initialization**
   - 初期化後は値がキャッシュされることを確認

#### describe: Lazy initialization in atomicUpdate
4. **should initialize with atomicUpdate context values**
   - atomicUpdateコンテキスト内の値で初期化されることを確認

5. **should handle computed created but not accessed in atomicUpdate**
   - atomicUpdate内で作成されたがアクセスされなかったComputedの処理を確認

6. **should handle complex initialization scenario**
   - 複雑な初期化シナリオ（atomicUpdate内外でのComputed作成）を処理できることを確認

#### describe: Dependency tracking during lazy initialization
7. **should track nested computed dependencies correctly**
   - ネストされたComputed依存関係が正しく追跡されることを確認

8. **should handle conditional dependencies during initialization**
   - 初期化中の条件付き依存関係を処理できることを確認

#### describe: Edge cases
9. **should handle self-referential computed gracefully**
   - 自己参照のComputedを適切に処理できることを確認

10. **should maintain consistency when mixing lazy and eager computeds**
    - 遅延と即座に初期化されたComputedの混在時の一貫性を確認

## 4. compare-function.test.ts (11個のテスト)

### describe: Custom Compare Functions

#### describe: Cell with onChange
1. **should trigger onChange when value changes**
   - 値が変更されたときにonChangeがトリガーされることを確認

2. **should not trigger onChange when value is same**
   - 値が同じ場合はonChangeがトリガーされないことを確認

3. **should work with custom compare and onChange**
   - カスタム比較関数とonChangeが一緒に動作することを確認

#### describe: Cell with custom compare
4. **should use custom compare for object values**
   - オブジェクト値でカスタム比較関数が使用されることを確認

5. **should use custom compare for array values**
   - 配列値でカスタム比較関数が使用されることを確認

6. **should propagate changes based on custom compare**
   - カスタム比較関数に基づいて変更が伝播されることを確認

#### describe: Computed with custom compare
7. **should use custom compare for computed values**
   - Computed値でカスタム比較関数が使用されることを確認

8. **should not propagate when computed value is same according to compare**
   - カスタム比較関数で同じと判断された場合、伝播しないことを確認

#### describe: Compare function edge cases
9. **should handle exceptions in compare function**
   - 比較関数内の例外が適切に処理されることを確認

10. **should handle NaN comparisons**
    - NaNの比較が適切に処理されることを確認

11. **should handle deep equality compare**
    - 深い等価性比較が機能することを確認

## 5. diamond-glitch.test.ts (2個のテスト)

### describe: Diamond Dependency Glitch Test
1. **should ensure no glitch occurs with separate set operations**
   - 個別のset操作でグリッチが発生しないことを確認（ダイヤモンド依存構造で）

2. **should ensure no intermediate inconsistent state is observable**
   - 中間の不整合状態が観測可能でないことを確認

## 6. touch.test.ts (13個のテスト)

### describe: Touch functionality

#### describe: Basic touch behavior
1. **should trigger recomputation when cell is touched**
   - Cellがタッチされたときに再計算がトリガーされることを確認

2. **should force computed recalculation when touched directly**
   - Computedが直接タッチされたときに強制的に再計算されることを確認

#### describe: Notification behavior
3. **should trigger onScheduledNotify when cell is touched**
   - CellがタッチされたときにonScheduledNotifyがトリガーされることを確認

4. **should NOT trigger onChange when cell is touched (value unchanged)**
   - 値が変わらないCellのタッチではonChangeがトリガーされないことを確認

5. **should trigger onScheduledNotify for computed when touched**
   - ComputedがタッチされたときにonScheduledNotifyがトリガーされることを確認

#### describe: Propagation behavior
6. **should propagate touch through entire dependency chain**
   - タッチが依存関係チェーン全体に伝播することを確認

7. **should propagate even when computed values do not change**
   - Computedの値が変わらなくてもタッチが伝播することを確認

#### describe: atomicUpdate integration
8. **should batch touch operations**
   - atomicUpdate内でタッチ操作がバッチ処理されることを確認

9. **should handle touch and set in same atomicUpdate**
   - 同じatomicUpdate内でタッチとセットを処理できることを確認

#### describe: Custom compare function
10. **should not trigger onChange on touch regardless of custom compare**
    - カスタム比較関数に関わらず、タッチではonChangeがトリガーされないことを確認

#### describe: Edge cases
11. **should handle touch on uninitialized computed**
    - 初期化されていないComputedのタッチを処理できることを確認

12. **should detect circular dependencies on touch commit**
    - タッチのコミット時に循環依存を検出することを確認

13. **should handle touching during computation**
    - 計算中のタッチを処理できることを確認

## 7. type-utils.test.ts (7個のテスト)

### describe: Type utilities

#### describe: Type extraction utilities
1. **should extract value types correctly**
   - StateValue、CellValue、ComputedValueの型抽出が正しく動作することを確認

#### describe: Type guards
2. **should correctly identify Cell**
   - isCellが正しくCellを識別することを確認

3. **should correctly identify Computed**
   - isComputedが正しくComputedを識別することを確認

4. **should correctly identify State**
   - isStateが正しくState（CellまたはComputed）を識別することを確認

5. **should narrow types with guards**
   - 型ガードで型が正しく狭められることを確認

#### describe: Complex type patterns
6. **should handle nested state structures**
   - ネストされた状態構造を処理できることを確認

7. **should work with array of states**
   - State配列で動作することを確認

## 8. propagation-without-get.test.ts (4個のテスト)

### describe: Propagation without get in atomicUpdate
1. **should propagate changes through entire dependency chain even without get**
   - atomicUpdate内でgetを呼ばなくても、依存関係チェーン全体に変更が伝播することを確認

2. **should handle multiple disconnected chains**
   - 複数の独立したチェーンを処理できることを確認

3. **should work with deep dependency chains**
   - 深い依存関係チェーンで動作することを確認

4. **should handle diamond dependencies without get**
   - getなしでダイヤモンド依存を処理できることを確認

---

## テスト総数: 76個のテスト