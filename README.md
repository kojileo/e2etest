# Playwright MCP E2Eテスト自動化システム

Playwright MCPとGemini APIを使用して、さまざまなWebアプリケーションに対してE2Eテストを自動実行できるWebアプリケーションです。

## 特徴

- 🎭 **Playwright MCP**: アクセシビリティツリーを活用した安定したブラウザ自動化
- 🤖 **Gemini AI**: 自然言語でのテストケース生成と結果解析
- 🌐 **Web管理画面**: 直感的なUI/UXでテストの管理・実行・結果確認
- 📊 **リアルタイム監視**: テスト実行状況のリアルタイム表示
- 💾 **テスト履歴**: 過去のテスト結果の保存・検索・比較

## システム構成

```
├── client/          # React フロントエンド
├── server/          # Node.js バックエンド
├── shared/          # 共通型定義
└── docs/           # ドキュメント
```

## セットアップ

### 前提条件

- Node.js 18.x以上
- npm or yarn
- Gemini API キー

### インストール

1. リポジトリをクローン
2. 依存関係をインストール:
   ```bash
   npm run setup
   ```

3. 環境変数を設定:
   ```bash
   cp server/.env.example server/.env
   ```
   `.env`ファイルにGemini API キーを設定

4. 開発サーバーを起動:
   ```bash
   npm run dev
   ```

## 使用方法

1. ブラウザで `http://localhost:3000` にアクセス
2. テスト対象のWebアプリケーションURLを入力
3. Gemini AIにテストシナリオを自然言語で記述
4. テストを実行し、結果を確認

## 技術スタック

### フロントエンド
- React 18 + TypeScript
- Tailwind CSS
- React Query
- React Router

### バックエンド
- Node.js + Express + TypeScript
- Playwright MCP
- Gemini API
- SQLite / PostgreSQL
- WebSocket (リアルタイム更新)

### その他
- Docker対応
- CI/CD対応 