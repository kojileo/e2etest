import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { setupDatabase } from './database/setup';
import { scenarioRoutes } from './routes/scenarios';
import { testRoutes } from './routes/tests';
import { aiRoutes } from './routes/ai';
import { setupWebSocket } from './websocket/handler';

// 環境変数を読み込み
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// ミドルウェア設定
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API ルート
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/ai', aiRoutes);

// ヘルスチェック
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// エラーハンドリング
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 ハンドリング
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// サーバー開始
async function startServer() {
  try {
    // データベース初期化
    await setupDatabase();
    console.log('✅ データベースが初期化されました');

    // HTTP サーバー作成
    const server = createServer(app);
    
    // WebSocket サーバー作成
    const wss = new WebSocketServer({ server });
    setupWebSocket(wss);
    console.log('✅ WebSocket サーバーが設定されました');

    // サーバー開始
    server.listen(port, () => {
      console.log(`🚀 サーバーが起動しました: http://localhost:${port}`);
      console.log(`📊 環境: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('❌ サーバーの起動に失敗しました:', error);
    process.exit(1);
  }
}

startServer();

// グレースフル シャットダウン
process.on('SIGINT', () => {
  console.log('\n🛑 サーバーを停止しています...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 サーバーを停止しています...');
  process.exit(0);
}); 