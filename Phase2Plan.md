# Phase 2 統合テスト計画

## 概要
Phase 2では、Fiddichライブラリの複数の機能が連携して動作する統合的なシナリオをテストします。
単体テストでは検証できない、機能間の相互作用や複雑な使用パターンを重点的に検証します。

## テストファイル構成

### 1. dependency-propagation.test.ts
**目的**: 依存関係の伝播が正しく動作することを検証

#### 基本的な依存関係（3テスト）
1. `should propagate changes from Cell to Computed`
   - 単一のCellからComputedへの変更伝播
   - 検証: Cellの値を変更したときComputedが再計算される

2. `should propagate changes from Cell to multiple Computeds`
   - 1つのCellが複数のComputedに影響する場合
   - 検証: 全ての依存Computedが更新される

3. `should handle computed depending on multiple cells`
   - Computedが複数のCellに依存する場合
   - 検証: どのCellを変更してもComputedが再計算される

#### 連鎖的な依存関係（3テスト）
4. `should propagate through chain of computeds`
   - A → B → C → Dのような連鎖
   - 検証: Aの変更がDまで正しく伝播する

5. `should handle branching dependency chains`
   - A → B, A → C, B → D, C → Eのような分岐
   - 検証: 全ての経路で正しく伝播する

6. `should update all affected computeds in correct order`
   - 深い依存関係での更新順序
   - 検証: Rankベースの順序で更新される

#### ダイヤモンド依存（3テスト）
7. `should compute diamond dependency only once`
   - A → B, A → C, B → D, C → Dの菱形構造
   - 検証: Dの再計算が1回だけ実行される

8. `should handle complex diamond patterns`
   - 複数のダイヤモンドが組み合わさったパターン
   - 検証: 各Computedが適切な回数だけ計算される

9. `should maintain correct values through diamond updates`
   - ダイヤモンド構造での値の整合性
   - 検証: 最終的な値が正しい

### 2. dynamic-dependencies.test.ts
**目的**: 動的に変化する依存関係が正しく管理されることを検証

1. `should track dependencies that change based on values`
   - 条件分岐による依存の切り替え
   - 例: `useA ? get(cellA) : get(cellB)`
   - 検証: 使用されなくなった依存が切断される

2. `should add new dependencies dynamically`
   - 実行時に新しい依存を追加
   - 例: 配列の要素数に応じて依存するCellが増える
   - 検証: 新しい依存が正しく追跡される

3. `should remove old dependencies when no longer used`
   - 使われなくなった依存の削除
   - 検証: 古い依存のCellを変更してもComputedが再計算されない

4. `should handle switching between multiple dependency sets`
   - 複数の依存セット間の切り替え
   - 例: モードによって完全に異なるCellセットに依存
   - 検証: 切り替え時に依存関係が正しく更新される

5. `should update dependency graph on nested computed changes`
   - 入れ子のComputedでの依存変更
   - 検証: 中間のComputedの依存が変わったとき、最終的なComputedも正しく動作

6. `should handle rapid dependency changes`
   - 高頻度での依存関係の変更
   - 検証: 短時間に何度も依存が変わってもクラッシュしない

### 3. transaction-atomicity.test.ts
**目的**: atomicUpdateの原子性（全て成功するか全て失敗するか）を検証

1. `should rollback all changes on error`
   - エラー時の完全なロールバック
   - 検証: エラー前に行った全ての変更が元に戻る

2. `should rollback complex state changes`
   - 複数のCell/Computed変更のロールバック
   - 検証: 複雑な状態変更も全て元に戻る

3. `should rollback dispose operations on error`
   - disposeスケジュールもロールバック
   - 検証: エラー時はdisposeが実行されない

4. `should maintain consistency after failed transaction`
   - 失敗後の状態の一貫性
   - 検証: 依存関係やComputedの状態が壊れない

### 4. transaction-isolation.test.ts
**目的**: トランザクション実行中の変更が外部から見えないことを検証

1. `should isolate changes during transaction`
   - 実行中の変更が外部から見えない
   - 検証: 非同期atomicUpdate実行中に外部からgetしても古い値

2. (削除済)

3. (削除済)

4. (削除済)

### 5. nested-transactions.test.ts
**目的**: 入れ子のatomicUpdateが正しく動作することを検証

#### 同じトランザクションとしての入れ子（推奨パターン）
1. `should share same transaction with context`
   - コンテキストを渡して同じトランザクションで動作
   - 使用方法: `atomicUpdate(({ ... }, { context: ops.context })`
   - 検証: 内側の変更が外側のコミット時に反映

2. `should see changes from outer in nested with context`
   - 外側の変更が内側から見える
   - 検証: 外側でsetした値が内側のgetで取得できる

3. `should rollback all changes on nested error with context`
   - 内側のエラーで全体がロールバック
   - 検証: 外側の変更も含めて全て元に戻る

4. `should handle multiple nested levels with shared context`
   - 3層以上の入れ子でコンテキスト共有
   - 検証: 最も深い層の変更も最外層のコミットで反映

#### 独立したトランザクション（非推奨だが動作確認）
5. `should create independent transaction without context`
   - コンテキストなしで独立動作
   - 検証: 内側が即座にコミットされる

6. `should commit independently without context`
   - 内側が独立してコミット
   - 検証: 外側のトランザクション中でも内側の変更が外部から見える

7. `should not rollback outer on inner error without context`
   - 内側のエラーが外側に影響しない
   - 検証: 独立した内側のエラーでも外側は正常にコミット

### 6. circular-dependency.test.ts
**目的**: 循環依存を正しく検出してエラーにすることを検証

1. `should detect simple circular dependency`
   - A → B → A の単純な循環
   - 検証: 適切なエラーメッセージでスロー

2. `should detect indirect circular dependency`
   - A → B → C → A の間接的な循環
   - 検証: 長い循環も検出される

3. `should detect self-referencing computed`
   - 自己参照するComputed
   - 例: `createComputed(({ get }) => get(self) + 1)`
   - 検証: 即座にエラー

4. `should detect dynamic circular dependency`
   - 実行時に発生する循環依存
   - 例: 条件によって循環が発生
   - 検証: 動的な循環も検出される

5. (削除済)

### 7. resource-management.test.ts
**目的**: リソース管理とdisposeが正しく動作することを検証

1. `should remove from dependency graph on dispose`
   - disposeで依存グラフから削除
   - 検証: dispose後は依存関係が切断される

2. `should clean up dependent relationships`
   - 依存/被依存の両方向のクリーンアップ
   - 検証: AがBに依存している場合、Aのdisposeで両方向の参照が削除

3. `should handle dispose during transaction`
   - トランザクション中のdispose
   - 検証: atomicUpdate内でのdisposeがコミット時に実行

4. `should dispose computed with multiple dependencies`
   - 複数依存を持つComputedのdispose
   - 検証: 全ての依存関係が正しくクリーンアップ

5. (削除済)

### 8. complex-scenarios.test.ts
**目的**: 実践的な複雑なシナリオでの動作を検証

1. `should handle form state management pattern`
   - フォームの状態管理パターン
   - 例: 入力値、検証状態、エラーメッセージの連携
   - 検証: 実際のフォームUIで使われるパターンが動作

2. `should handle async data fetching pattern`
   - 非同期データ取得パターン
   - 例: loading状態、データ、エラーの管理
   - 検証: pendingとの連携が正しく動作

3. `should handle computed with side effects`
   - 副作用を持つComputed（onChangeコールバック）
   - 例: 値が変わったらログを出力
   - 検証: onChangeが適切なタイミングで呼ばれる

4. `should handle high-frequency updates`
   - 高頻度の更新
   - 例: アニメーションやリアルタイムデータ
   - 検証: パフォーマンスが劣化しない

5. `should handle large dependency graphs`
   - 大規模な依存グラフ
   - 例: 100以上のCell/Computedの複雑な依存関係
   - 検証: スケールしても正しく動作

## 特に注意すべきポイント

1. **動的な依存関係の変更**
   - 依存の追加・削除・入れ替えが同時に発生するケース
   - 依存グラフの整合性が常に保たれること

2. **入れ子atomicUpdateの仕様**
   - コンテキストを渡す = 同じトランザクションの一部（推奨）
   - コンテキストを渡さない = 独立したトランザクション
   - この違いを明確にテストすること

3. **エラー時の状態復元**
   - rejectAllChangesが完全に状態を復元すること
   - 依存関係、dispose予約、初期化状態など全てが元に戻ること

4. **パフォーマンスとメモリ管理**
   - 大規模なグラフでもメモリリークがないこと
   - 不要になった依存関係が適切に削除されること