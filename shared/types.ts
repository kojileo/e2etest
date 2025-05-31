// テストの状態
export enum TestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// テストステップの種類
export enum StepType {
  NAVIGATE = 'navigate',
  CLICK = 'click',
  TYPE = 'type',
  WAIT = 'wait',
  ASSERT = 'assert',
  SCREENSHOT = 'screenshot'
}

// テストステップ
export interface TestStep {
  id: string;
  type: StepType;
  description: string;
  selector?: string;
  value?: string;
  timeout?: number;
  expected?: string;
  screenshot?: string;
  status: TestStatus;
  executedAt?: Date;
  error?: string;
}

// テストシナリオ
export interface TestScenario {
  id: string;
  name: string;
  description: string;
  targetUrl: string;
  steps: TestStep[];
  aiPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

// テスト実行結果
export interface TestExecution {
  id: string;
  scenarioId: string;
  status: TestStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  steps: TestStep[];
  screenshots: string[];
  error?: string;
  metadata: {
    browserName: string;
    browserVersion: string;
    viewportSize: { width: number; height: number };
    userAgent: string;
  };
}

// AIが生成したテストケース
export interface GeneratedTestCase {
  scenario: Omit<TestScenario, 'id' | 'createdAt' | 'updatedAt'>;
  confidence: number;
  reasoning: string;
}

// WebSocket メッセージ
export interface WebSocketMessage {
  type: 'test_started' | 'test_progress' | 'test_completed' | 'test_error' | 'connection' | 'error' | 'pong';
  payload: any;
  executionId: string;
  timestamp: Date;
}

// API レスポンス
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// テスト実行リクエスト
export interface RunTestRequest {
  scenarioId: string;
  options?: {
    headless?: boolean;
    timeout?: number;
    retries?: number;
    parallel?: boolean;
  };
}

// AI プロンプト リクエスト
export interface GenerateTestRequest {
  targetUrl: string;
  description: string;
  requirements?: string[];
  existingScenarios?: string[];
} 