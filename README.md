# E2E Test Automation Platform

Playwright MCP と Gemini AI を活用したWebアプリケーション向けのE2Eテスト自動化プラットフォームです。

## 🚀 主な機能

- **AI駆動テスト生成**: Gemini AIを使用した自然言語からのテストケース自動生成
- **リアルタイム実行監視**: WebSocketを使った実行状況のリアルタイム表示
- **視覚的テスト管理**: Reactベースの直感的なWebインターフェース
- **Playwright MCP統合**: 実際のブラウザ操作による高精度なE2Eテスト
- **実行履歴管理**: SQLiteデータベースによるテスト結果の永続化

## 🏗️ アーキテクチャ

```
├── client/           # React + TypeScript + Vite フロントエンド
├── server/           # Node.js + Express + TypeScript バックエンド
├── shared/           # 共通型定義
└── docs/             # ドキュメント
```

### 技術スタック

**フロントエンド:**
- React 18
- TypeScript
- Vite
- Tailwind CSS (予定)

**バックエンド:**
- Node.js
- Express
- TypeScript
- SQLite3
- WebSocket (ws)
- Google Generative AI

## 📦 セットアップ

### 1. 依存関係のインストール

```bash
# ルートディレクトリで
npm install

# 各サブプロジェクトでも依存関係をインストール
cd client && npm install
cd ../server && npm install
```

### 2. 環境変数の設定

サーバーディレクトリに `.env` ファイルを作成:

```bash
cd server
cp env.example .env
```

`.env` ファイルを編集してGemini APIキーを設定:

```env
# Gemini AI設定
GEMINI_API_KEY=your_actual_gemini_api_key_here

# その他の設定はデフォルトで動作します
PORT=5000
NODE_ENV=development
DATABASE_URL=./data/e2e_tests.db
```

### 3. 開発サーバーの起動

```bash
# ルートディレクトリで
npm run dev
```

このコマンドで以下が同時に起動します:
- フロントエンド開発サーバー: http://localhost:3000
- バックエンドAPIサーバー: http://localhost:5000

## 🛠️ 使用方法

### 1. テストシナリオの作成

Webインターフェースを使用してテストシナリオを作成できます:

1. http://localhost:3000 にアクセス
2. 「新規シナリオ作成」をクリック
3. テスト対象URLと説明を入力
4. AIによる自動生成または手動でステップを追加

### 2. AIテスト生成の使用

```bash
# Gemini AIを使用したテスト生成例
curl -X POST http://localhost:5000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://example.com",
    "description": "ログイン機能のテスト",
    "requirements": ["正常ログイン", "エラーハンドリング"]
  }'
```

### 3. テストの実行

```bash
# テスト実行例
curl -X POST http://localhost:5000/api/tests/run \
  -H "Content-Type: application/json" \
  -d '{
    "scenarioId": "your-scenario-id",
    "options": {
      "headless": true,
      "timeout": 30000
    }
  }'
```

## 📊 API エンドポイント

### シナリオ管理
- `GET /api/scenarios` - シナリオ一覧取得
- `POST /api/scenarios` - 新規シナリオ作成
- `GET /api/scenarios/:id` - シナリオ詳細取得
- `PUT /api/scenarios/:id` - シナリオ更新
- `DELETE /api/scenarios/:id` - シナリオ削除

### テスト実行
- `POST /api/tests/run` - テスト実行
- `GET /api/tests/executions` - 実行履歴取得
- `GET /api/tests/executions/:id` - 実行詳細取得
- `POST /api/tests/stop/:id` - テスト停止
- `GET /api/tests/running` - 実行中テスト一覧

### AI機能
- `POST /api/ai/generate` - AIテストケース生成
- `POST /api/ai/analyze` - テスト結果分析
- `GET /api/ai/status` - Gemini API状態確認
- `GET /api/ai/templates` - プロンプトテンプレート取得

## 🔧 開発

### プロジェクト構造

```
server/src/
├── database/         # データベース設定
├── routes/           # APIルート
├── services/         # ビジネスロジック
├── websocket/        # WebSocket処理
└── index.ts          # エントリーポイント

client/src/
├── components/       # Reactコンポーネント
├── hooks/           # カスタムフック
├── types/           # 型定義
├── utils/           # ユーティリティ
└── App.tsx          # メインアプリケーション

shared/
└── types.ts         # 共通型定義
```

### TypeScript設定

プロジェクトは厳密なTypeScript設定を使用:
- `strict: true`
- `exactOptionalPropertyTypes: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

### WebSocket通信

リアルタイム更新のためのWebSocket接続:
- テスト開始/完了通知
- 進行状況の更新
- エラー通知

## 🧪 現在の実装状況

### ✅ 完了済み

- [x] プロジェクト構造設定
- [x] TypeScript設定とビルド環境
- [x] Express APIサーバー
- [x] SQLiteデータベース設定
- [x] WebSocket通信
- [x] Gemini AI統合
- [x] Playwright MCP基盤
- [x] 基本APIエンドポイント
- [x] React開発環境

### 🔄 進行中・今後の実装

- [ ] Reactフロントエンドコンポーネント
- [ ] 実際のPlaywright MCP連携
- [ ] テスト結果ビューアー
- [ ] スクリーンショット表示
- [ ] テストスケジューリング
- [ ] Docker化
- [ ] CI/CD設定

## 🤝 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🔗 関連リンク

- [Playwright Documentation](https://playwright.dev/)
- [Gemini AI API](https://ai.google.dev/)
- [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/specification)

---

**開発者向けメモ**: 
Gemini APIキーは必須です。取得方法については[Google AI Studio](https://aistudio.google.com/)をご参照ください。 