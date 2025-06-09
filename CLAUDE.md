# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) 向けのガイダンスです。

## プロジェクト概要

FiddichはReact向けの状態管理ライブラリです。現在、モノレポ構造から単一パッケージ構造への移行中です（バージョン0.17.0）。

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
- ビルド出力: `dist/index.js` (ESモジュール)
- TypeScript定義: `dist/index.d.ts`
- ソースコード: `src/` ディレクトリ
- パッケージタイプ: ESモジュール

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

## 開発状況

以前のアーキテクチャには以下が含まれていました：
- Atomベースの状態管理
- 状態消費用のReactフック
- 階層ストアシステム
- 包括的な型を持つTypeScriptサポート