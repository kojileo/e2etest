# 実装ガイド

このドキュメントでは、Playwright MCPとGemini APIを使用したE2Eテスト自動化システムの実装詳細について説明します。

## アーキテクチャ概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express Server │    │  Playwright MCP │
│                 │    │                 │    │                 │
│ - テスト管理    │◄──►│ - API エンドポイント│◄──►│ - ブラウザ自動化│
│ - 結果表示      │    │ - WebSocket     │    │ - スナップショット│
│ - リアルタイム監視│    │ - Gemini AI統合 │    │ - アクセシビリティ│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tailwind CSS  │    │   SQLite DB     │    │  Gemini API     │
│                 │    │                 │    │                 │
│ - モダンUI      │    │ - テスト履歴    │    │ - テスト生成    │
│ - レスポンシブ  │    │ - シナリオ管理  │    │ - 結果分析      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 主要コンポーネント

### 1. Gemini AI統合 (`server/src/services/gemini.ts`)

Gemini APIを使用してテストケースを自動生成します。

**主な機能:**
- 自然言語でのテストシナリオ説明から具体的なテストステップを生成
- Playwright MCPのアクセシビリティツリーに最適化されたセレクタ生成
- テスト実行結果の分析と改善提案

**使用例:**
```typescript
const gemini = new GeminiService();
const testCase = await gemini.generateTestCase({
  targetUrl: 'https://example.com',
  description: 'ユーザーログイン機能をテストしたい',
  requirements: ['正常ログイン', 'エラーハンドリング']
});
```

### 2. Playwright MCP実行エンジン (`server/src/services/playwright-runner.ts`)

Playwright MCPプロセスを管理し、テストを実行します。

**主な機能:**
- MCPプロセスの起動・管理
- テストステップの順次実行
- スクリーンショット取得
- エラーハンドリングとリトライ

**実行フロー:**
1. MCPプロセス起動
2. ブラウザ初期化
3. テストステップ実行
4. 結果収集
5. プロセス終了

### 3. WebSocket通信 (`server/src/websocket/handler.ts`)

リアルタイムでテスト実行状況を通知します。

**イベント種類:**
- `test_started`: テスト開始
- `test_progress`: ステップ進行状況
- `test_completed`: テスト完了
- `test_error`: エラー発生

## API エンドポイント

### テストシナリオ管理

```
GET    /api/scenarios          # シナリオ一覧取得
POST   /api/scenarios          # 新規シナリオ作成
GET    /api/scenarios/:id      # シナリオ詳細取得
PUT    /api/scenarios/:id      # シナリオ更新
DELETE /api/scenarios/:id      # シナリオ削除
```

### テスト実行

```
POST   /api/tests/run          # テスト実行
GET    /api/tests/executions   # 実行履歴取得
GET    /api/tests/executions/:id # 実行詳細取得
POST   /api/tests/stop/:id     # テスト停止
```

### AI統合

```
POST   /api/ai/generate        # テストケース生成
POST   /api/ai/analyze         # 結果分析
```

## フロントエンド構成

### 主要ページ

1. **ダッシュボード** (`client/src/pages/Dashboard.tsx`)
   - テスト実行状況の概要
   - 最近の実行履歴
   - 統計情報

2. **テストシナリオ管理** (`client/src/pages/TestScenarios.tsx`)
   - シナリオ一覧表示
   - 検索・フィルタリング
   - 実行・編集・削除

3. **シナリオ作成** (`client/src/pages/CreateScenario.tsx`)
   - AI支援によるシナリオ生成
   - 手動でのステップ編集
   - プレビュー機能

4. **実行詳細** (`client/src/pages/ExecutionDetail.tsx`)
   - ステップごとの実行結果
   - スクリーンショット表示
   - エラー詳細

### 状態管理

React Queryを使用してサーバー状態を管理:

```typescript
// テストシナリオ取得
const { data: scenarios } = useQuery('scenarios', fetchScenarios);

// テスト実行
const runTestMutation = useMutation(runTest, {
  onSuccess: () => {
    queryClient.invalidateQueries('executions');
  }
});
```

## Playwright MCP連携

### MCPコマンド形式

```json
{
  "action": "browser_navigate",
  "params": {
    "url": "https://example.com"
  }
}
```

### サポートするアクション

- `browser_navigate`: ページ遷移
- `browser_click`: 要素クリック
- `browser_type`: テキスト入力
- `browser_wait`: 待機
- `browser_assert`: アサーション
- `browser_screenshot`: スクリーンショット

### アクセシビリティツリーの活用

Playwright MCPはアクセシビリティツリーを使用して要素を特定します:

```typescript
// 従来のセレクタベース
await page.click('#login-button');

// MCP（アクセシビリティベース）
await browserClick({ element: "ログインボタン" });
```

## データベーススキーマ

### テストシナリオ

```sql
CREATE TABLE test_scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_url TEXT NOT NULL,
  steps TEXT NOT NULL, -- JSON形式
  ai_prompt TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### テスト実行結果

```sql
CREATE TABLE test_executions (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  duration INTEGER,
  steps TEXT NOT NULL, -- JSON形式
  screenshots TEXT, -- JSON配列
  error TEXT,
  metadata TEXT NOT NULL, -- JSON形式
  FOREIGN KEY (scenario_id) REFERENCES test_scenarios(id)
);
```

## セキュリティ考慮事項

1. **API キー管理**
   - 環境変数でGemini API キーを管理
   - 本番環境では外部キー管理サービスの使用を推奨

2. **入力検証**
   - すべてのユーザー入力に対するバリデーション
   - SQLインジェクション対策

3. **プロセス分離**
   - Playwright MCPプロセスの適切な管理
   - リソースリークの防止

## パフォーマンス最適化

1. **並列実行**
   - 複数テストの並列実行サポート
   - リソース使用量の監視

2. **キャッシュ戦略**
   - React Queryによるクライアントサイドキャッシュ
   - ブラウザプロファイルの再利用

3. **リソース管理**
   - 使用済みブラウザプロセスの適切な終了
   - メモリ使用量の最適化

## トラブルシューティング

### よくある問題

1. **MCP プロセスが起動しない**
   - Playwright のインストール確認
   - 権限の確認

2. **テストが失敗する**
   - ターゲットサイトの変更確認
   - セレクタの更新

3. **パフォーマンスの問題**
   - 同時実行数の調整
   - タイムアウト設定の見直し

### ログ確認

```bash
# サーバーログ
docker-compose logs app

# 特定の実行のログ
grep "execution-id" /app/logs/server.log
```

## 開発・デプロイメント

### 開発環境セットアップ

```bash
# 依存関係インストール
npm run setup

# 環境変数設定
cp server/env.example server/.env
# Gemini API キーを設定

# 開発サーバー起動
npm run dev
```

### 本番環境デプロイ

```bash
# Docker イメージビルド
docker build -t e2e-automation .

# 環境変数ファイル作成
echo "GEMINI_API_KEY=your_key_here" > .env

# アプリケーション起動
docker-compose up -d
```

### CI/CD パイプライン

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and deploy
        run: |
          docker build -t e2e-automation .
          # デプロイ処理
```

## 今後の拡張計画

1. **AI機能強化**
   - 画像認識によるテスト生成
   - 自然言語でのアサーション

2. **レポート機能**
   - HTML/PDF レポート生成
   - Slack/Teams 通知

3. **スケジューリング**
   - 定期実行機能
   - CI/CD 統合

4. **多言語対応**
   - 国際化（i18n）対応
   - 多言語サイトのテスト 