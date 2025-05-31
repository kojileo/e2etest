import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketMessage } from '../../../shared/types';

// 接続中のクライアント管理
const clients = new Set<WebSocket>();

/**
 * WebSocketサーバーのセットアップ
 */
export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket) => {
    console.log('✅ WebSocket client connected');
    
    // クライアントを登録
    clients.add(ws);

    // 接続確認メッセージを送信
    sendToClient(ws, {
      type: 'connection',
      payload: { message: 'Connected to E2E Test Server' },
      executionId: '',
      timestamp: new Date()
    });

    // メッセージ受信ハンドラー
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(ws, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
        sendToClient(ws, {
          type: 'error',
          payload: { error: 'Invalid message format' },
          executionId: '',
          timestamp: new Date()
        });
      }
    });

    // 接続終了ハンドラー
    ws.on('close', () => {
      console.log('❌ WebSocket client disconnected');
      clients.delete(ws);
    });

    // エラーハンドラー
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });

    // Ping/Pongによる接続維持
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // 30秒間隔

    ws.on('pong', () => {
      // Pongレスポンスを受信（接続が生きている）
    });
  });

  console.log('✅ WebSocket server setup completed');
}

/**
 * クライアントからのメッセージを処理
 */
function handleClientMessage(ws: WebSocket, message: any): void {
  switch (message.type) {
    case 'ping':
      sendToClient(ws, {
        type: 'pong',
        payload: { timestamp: new Date() },
        executionId: '',
        timestamp: new Date()
      });
      break;

    case 'subscribe':
      // 特定の実行に対する購読（実装予定）
      console.log('Client subscribed to:', message.executionId);
      break;

    case 'unsubscribe':
      // 購読解除（実装予定）
      console.log('Client unsubscribed from:', message.executionId);
      break;

    default:
      console.warn('Unknown message type:', message.type);
  }
}

/**
 * 特定のクライアントにメッセージを送信
 */
function sendToClient(ws: WebSocket, message: Partial<WebSocketMessage>): void {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message to client:', error);
    }
  }
}

/**
 * 全クライアントにブロードキャスト
 */
export function broadcast(message: Partial<WebSocketMessage>): void {
  const messageData = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageData);
      } catch (error) {
        console.error('Failed to broadcast message:', error);
        // 送信に失敗したクライアントを削除
        clients.delete(client);
      }
    } else {
      // 接続が閉じられたクライアントを削除
      clients.delete(client);
    }
  });
}

/**
 * テスト開始の通知
 */
export function notifyTestStarted(executionId: string, scenarioName: string): void {
  broadcast({
    type: 'test_started',
    payload: {
      executionId,
      scenarioName,
      startedAt: new Date()
    },
    executionId,
    timestamp: new Date()
  });
}

/**
 * テスト進行状況の通知
 */
export function notifyTestProgress(
  executionId: string, 
  stepName: string, 
  progress: number,
  totalSteps: number
): void {
  broadcast({
    type: 'test_progress',
    payload: {
      executionId,
      stepName,
      progress,
      totalSteps,
      percentage: Math.round((progress / totalSteps) * 100)
    },
    executionId,
    timestamp: new Date()
  });
}

/**
 * テスト完了の通知
 */
export function notifyTestCompleted(
  executionId: string, 
  success: boolean, 
  duration: number,
  results?: any
): void {
  broadcast({
    type: 'test_completed',
    payload: {
      executionId,
      success,
      duration,
      results,
      completedAt: new Date()
    },
    executionId,
    timestamp: new Date()
  });
}

/**
 * テストエラーの通知
 */
export function notifyTestError(
  executionId: string, 
  error: string, 
  stepName?: string
): void {
  broadcast({
    type: 'test_error',
    payload: {
      executionId,
      error,
      stepName,
      timestamp: new Date()
    },
    executionId,
    timestamp: new Date()
  });
}

/**
 * 接続中のクライアント数を取得
 */
export function getConnectedClientsCount(): number {
  return clients.size;
}

/**
 * WebSocketの統計情報を取得
 */
export function getWebSocketStats(): {
  connectedClients: number;
  uptime: number;
} {
  return {
    connectedClients: clients.size,
    uptime: process.uptime()
  };
} 