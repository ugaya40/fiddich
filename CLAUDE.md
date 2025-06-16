# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) 向けのガイダンスです。

## 🚨 最重要事項 🚨
**このプロジェクトでは絶対に常に日本語で応対し、日本語で考えてください。英語での応答は厳禁です。**
**コードのコメントも日本語で記述してください。**

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

# テスト一回実行
npm run test:run

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
- テストコード: `test/` ディレクトリ（現在未実装）
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
- **Computed**: 他のCell/Computedから派生する計算値（副作用を含まない軽量な処理推奨）
- **LeafComputed**: 値の変更時にコールバックを実行できるComputed
- **AtomicContext**: トランザクション管理の中核、状態変更のバッファリングと一貫性維持
- **AtomicUpdate**: 複数の状態変更を原子的に実行するためのAPI

### 決定された新たな設計方針

- atomicContextではすべてのStateのコピーを依存関係(Stateが依存しているもの、Stateに依存しているもの)・値を含め保持する
  - Stateのコピーのみを編集する
  - コミット時はStateのコピーをそのまま反映すれば良いし、ロールバック時はコピーを破棄すれば良い
- Stateのバージョンは楽観的同時実行制御のために使用されます
  - dependencyVersionは依存関係のバージョン(dependencies方向のみ)を管理します
  - valueVersionは値のバージョンを管理します
- Stateの更新やコミットは常に最小の単位で行います

### 現在の実装状況（2025年6月）

#### ✅ 実装済み
- 基本的な型定義（Cell, Computed, LeafComputed）in `src/state.ts`
- StateCopyStoreの基本実装 in `src/atomicContext.ts`
- TypeScript/tsup/Vitest設定

#### 🚧 実装中
- AtomicContextの完全な実装（構造は定義済み、ロジック未実装）
- AtomicUpdateの実装（インターフェース定義済み、実装未完了）
- Cell.setメソッド（createCell.tsでTODOコメント）
- Computed/LeafComputedの作成関数

#### ❌ 未実装
- src/index.ts（エントリーポイント）
- get/set/touchなどのトップレベル関数
- ReactiveCollection（ReactiveMap/ReactiveArray）
- createManagedObject
- テストファイル
- React連携（useValueフックなど）

## 開発の進め方

### 実装の優先順位
1. **最初に実装すべきもの**
   - src/index.tsの作成（エクスポートの定義）
   - Cell.setメソッドの実装
   - 基本的なget関数の実装

2. **次に実装すべきもの**
   - atomicUpdateの完全な実装
   - Computed/LeafComputedの実装
   - 基本的なテストの作成

3. **その後の実装**
   - ReactiveCollectionの実装
   - createManagedObjectの実装
   - React連携機能

### デバッグ時の注意点
- Symbol.disposeはTypeScript 5.2以降の機能
- tsconfig.jsonの`lib`に`ESNext.Disposable`が含まれていることを確認
- StateCopyの管理では、originalプロパティで元のStateへの参照を保持

### ファイル命名規則
- 関数名と同じファイル名（例: createCell.ts）
- 型定義は集約（state.ts）
- ユーティリティはutil.tsに集約
