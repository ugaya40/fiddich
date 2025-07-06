# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) 向けのガイダンスです。

## 🚨 最重要事項 🚨
**このプロジェクトでは絶対に常に日本語で応対し、日本語で考えてください。英語での応答は厳禁です。**
**コードのコメントはコードを見れば明快なものなどは記述しない事。**

### 開発時の重要な注意事項

#### ⚠️ Claudeが過去に犯した重大な失敗と教訓 ⚠️

**循環依存検出問題での失敗（2025年6月）:**
- 場当たり的な対応を繰り返し、コードベースを混乱させた
- コードを理解せずに修正を試み、ユーザーの生産性を著しく損なった
- デバッグコードを無計画に追加し、問題を複雑化させた

**テスト実装での失敗（2025年6月）:**
- テストの期待値を実装に合わせて変更した
- あるべき仕様を確認せずに勝手に判断した
- テスト失敗時の報告が不適切だった

**厳守すべき作業手順:**
1. **必ずコードリーディングから始める** - 問題を理解せずにコードを書かない
2. **コード編集前に必ず説明して承認を得る** - 「こう修正します」ではなく「こう修正したいが良いか」と確認
3. **デバッグコードの追加も計画的に** - むやみにログを追加しない
4. **何度も失敗した問題では特に慎重に** - 同じ間違いを繰り返さない
5. **場当たり的な対応は絶対に避ける** - 全体を理解してから行動する

### テスト実装の絶対原則

1. **テストはあるべき仕様に基づいて実装する**
   - 期待値を実装に合わせて変更してはいけない
   - 実装をテストに合わせて変更してはいけない
   - あるべき仕様が不明確な場合は、必ず先にユーザーに確認する

2. **テスト失敗時の報告手順**
   必ず以下をリスト形式で報告する：
   - どのテストが失敗したか
   - 何を期待していたか
   - 実際の動作は何だったか
   - 仕様が不明確な点は何か

3. **仕様が不明確な場合**
   - 勝手に判断しない
   - 実装に合わせない
   - 必ずユーザーに確認する

4. **バグを隠蔽しない**
   - 不要な初期化を入れない
   - 実際のユーザーの使用パターンに基づく
   - 問題を回避するコードを書かない
   - テストは「通る」ためではなく「問題を発見する」ために存在する

### 既存の開発時の重要な注意事項

1. **仕様の確認を最優先に**
   - 現在のコードの動作が必ずしも正しい仕様とは限らない
   - 仕様が不明確、または一貫性に疑問がある場合は必ずユーザーに確認する
   - 「現在のコードがこう動いているから、これが正しい」という思い込みは厳禁

2. **テストケースの作成**
   - テストケースは「あるべき仕様」に基づいて作成する
   - 現在のコードの動作に合わせてテストを作ってはいけない
   - テストが失敗した場合、まず「このテストが期待する動作は正しい仕様か？」を確認する

3. **実装前の確認**
   - 実装が仕様を決めるのではなく、仕様が実装を決める
   - バグかもしれない動作を見つけたら、修正前に必ず確認する
   - 一貫性のない動作を見つけたら、どちらが正しいか確認する

## プロジェクト概要

FiddichはReact向けの状態管理ライブラリです。現在、モノレポ構造から単一パッケージ構造への移行中です（バージョン0.17.0）。
基本的な設計思想はDESIGN.MDに記述してあるので常にマスターとして参照してください。もし現在の設計と乖離している部分があれば知らせてください

### 設計哲学

- **手続き的プログラミングの自然さ**: atomicUpdateスコープ内でミュータブルな操作を可能にし、開発者が慣れ親しんだ書き方を維持
- **明示的なリアクティビティ**: MobXのような暗黙的なリアクティビティではなく、Cell/Computedによる明示的な状態管理
- **リソース管理の自動化**: Symbol.disposeを活用した確実なメモリ管理
- **アプリケーションロジックの集約**: 状態とその操作を同じ場所にカプセル化し、副作用も操作の文脈内で管理

## 開発コマンド

```bash
# プロジェクトのビルド
npm run build

# 開発モード（watch）
npm run dev

# テスト実行
npm run test

# テストUIモード
npm run test:ui

# 型チェック
npm run type-check
```

## プロジェクト構造

現在の構造：
- ビルド出力: 
  - ESModules形式: `dist/index.js`
  - CommonJS形式: `dist/index.cjs`
  - TypeScript型定義: `dist/index.d.ts`
- ソースコード: `src/` ディレクトリ
- テストコード: `test/` ディレクトリ
- パッケージタイプ: ESモジュール + CommonJS（tsupで両対応）

## 技術スタック

- **TypeScript 5.0+**: 最新のTypeScript機能を使用
- **tsup**: 高速なTypeScriptバンドラー
- **Vitest**: 高速なテストフレームワーク（jsdom環境）
- **React 18+**: peerDependencyとして設定

## 開発環境セットアップ

新しい構造で以下が設定済み：
- tsup設定（ESモジュール出力、型定義生成）
- Vitest設定（jsdom環境、グローバル設定）
- TypeScript設定（strict mode、最新機能）

## コーディングルール

- 出来るだけクラスを使用しないように
- 出来るだけinterfaceよりtypeを使用
- コードを読めば意図が明快なコードコメントを追加しないように
- **型安全性を最優先**: TypeScriptの型システムを最大限活用し、`as`によるキャストは極力避ける
- **オーバーロードによる型推論**: 関数のオーバーロードを使用して、型安全かつ推論が効く実装を心がける
- **コメント・エラーメッセージはすべて英語**: 国際的な開発者にも理解しやすいように
- **コメントは最小限に**: 必要不可欠な説明のみ記載

## アーキテクチャと実装の要点

詳細な状態管理の仕組みについては、[docs/architecture.md](docs/architecture.md)を参照してください。

### コアエンティティ

- **Cell**: 基本的な状態コンテナ（TC39 Signalsに類似するが独自実装）
- **Computed**: 他のCell/Computedから派生する計算値（副作用を含まない軽量な処理推奨、onChangeオプションで値変更時のコールバックも可能）
- **AtomicContext**: トランザクション管理の中核、状態変更のバッファリングと一貫性維持
- **AtomicUpdate**: 複数の状態変更を原子的に実行するためのAPI

### 決定された新たな設計方針

- atomicContextではすべてのStateのコピーを依存関係(Stateが依存しているもの、Stateに依存しているもの)・値を含め保持する
  - Stateのコピーのみを編集する
  - コミット時はStateのコピーをそのまま反映すれば良いし、ロールバック時はコピーを破棄すれば良い
- Pull型評価では：
  - Cell: stableValue変更時/dispose時/pending時/touch時にdependentsをisDirtyにマーク（Push）
  - Computed: get時にisDirtyならcompute実行（Pull）
  - 依存関係の収集・更新はcompute時のみ発生
- dependentsをisDirtyにマークする条件：
  - Cell: set（値変更時）、dispose、pending、touch時
  - Computed: dispose、pending設定時
- バージョン管理は完全に撤廃されました（2025年6月）
  - デフォルトは"Last writer wins"動作
  - 同時実行制御が必要な場合はオプトインでトークンを使用
- Stateの更新やコミットは常に最小の単位で行います

### 現在の実装状況（2025年6月）

#### ✅ 実装済み
- 基本的な型定義（Cell, Computed）in `src/state.ts`
- StateCopyStoreの実装 in `src/atomicContext/`
- AtomicContextの実装（Pull型評価）
- AtomicUpdateの実装（トランザクション管理）
- tryAtomicUpdateの実装（エラーを投げずに結果を返すAPI）
- 同時実行制御トークン（Guard, Exclusive, Sequencer）in `src/concurrent/`
- Cell/Computedの作成関数（cell, computed）
- get/set/touch/pending/disposeなどのトップレベル関数
- ops.rejectAllChanges（atomicUpdate内での全変更破棄・リセット機能）
- 循環依存検出（スコープベースのCircularDetectorによる静的・動的循環依存の検出）
- pending機能（非同期状態管理、React Suspense連携、同期atomicUpdateでも使用可能）
- React連携（useValueフック - useCallbackで最適化済み）
- 包括的なテストファイル（basic, atomic-update, dependency-tracking, commit-rollback, diamond-dependency, circular-detection等）
- TypeScript/tsup/Vitest設定

#### ❌ 未実装
- ReactiveCollection（ReactiveMap/ReactiveArray）
- createManagedObject（リソース管理の自動化）

### 最近の主要な改善

#### 完全なPull型評価への移行（2025年7月）
- Push/Pull混在型から完全なPull型へ移行
- ComputedはisDirtyフラグベースの遅延評価
- CellはPush型通知でdependentsをisDirtyにマーク
- compute時にのみ依存関係を収集・更新
- バージョン管理システムを完全に削除

#### バージョン管理の完全撤廃（2025年6月）
- valueVersion、dependencyVersion、checkpointの概念を完全削除
- デフォルトを"Last writer wins"に変更（楽観的同時実行制御の削除）
- 同時実行制御はオプトインでトークンを使用する方式に移行

#### Pull型でのダイヤモンド依存解決
- 完全なPull型評価により自然に解決
- 各Computedはget時に必要に応じて再計算
- 依存関係は計算時に動的に収集
- Rankベースの管理は不要に（Pull型の利点）

#### 同時実行制御のオプトイン化（2025年6月）
- GuardToken: 楽観的同時実行制御（競合時にロールバック）
- ExclusiveToken: 排他制御（実行中は即座に拒否）
- SequencerToken: 直列化（キューで順次実行）
- tryAtomicUpdateでGuard/Exclusiveを使用、非同期atomicUpdateでSequencerを使用可能

#### スコープベースの循環依存検出
- グローバルな`CircularDetector`を使用し、各操作の起点ごとに検出
- 入れ子のスコープでも正確に動作（ルートスコープの管理）
- 循環依存検出の起点：compute（トップレベルget経由）、computeForCopy（ops.get経由）

## 開発の進め方

### 実装の優先順位（2025年6月時点）
1. **次に実装すべきもの**
   - ReactiveCollection（ReactiveMap/ReactiveArray）の実装
   - createManagedObjectの実装

2. **その後の検討事項**
   - パフォーマンス最適化
   - より高度なReact連携機能（SSR対応等）
   - デバッグツールの提供

### デバッグ時の注意点
- Symbol.disposeはTypeScript 5.2以降の機能
- tsconfig.jsonの`lib`に`ESNext.Disposable`が含まれていることを確認
- StateCopyの管理では、originalプロパティで元のStateへの参照を保持

### ファイル命名規則
- 関数名と同じファイル名（例: cell.ts）
- 型定義は集約（state.ts）
- ユーティリティはutil.tsに集約

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.