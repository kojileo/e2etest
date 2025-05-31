import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { TestScenario, TestExecution, TestStep, TestStatus, StepType } from '../../../shared/types';

export class PlaywrightMCPRunner {
  private runningTests: Map<string, ChildProcess> = new Map();
  private screenshotDir: string;

  constructor() {
    this.screenshotDir = path.join(process.cwd(), 'screenshots');
    this.ensureScreenshotDir();
  }

  /**
   * テストシナリオを実行
   */
  async runTest(
    scenario: TestScenario,
    options: {
      headless?: boolean;
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<TestExecution> {
    const executionId = uuidv4();
    const execution: TestExecution = {
      id: executionId,
      scenarioId: scenario.id,
      status: TestStatus.RUNNING,
      startedAt: new Date(),
      steps: scenario.steps.map(step => ({ ...step, status: TestStatus.PENDING })),
      screenshots: [],
      metadata: {
        browserName: 'chromium',
        browserVersion: 'latest',
        viewportSize: { width: 1280, height: 720 },
        userAgent: 'PlaywrightMCP/1.0'
      }
    };

    try {
      // Playwright MCPプロセスを起動
      const mcpProcess = await this.startMCPProcess(options);
      this.runningTests.set(executionId, mcpProcess);

      // テストステップを順次実行
      for (let i = 0; i < execution.steps.length; i++) {
        const step = execution.steps[i];
        step.status = TestStatus.RUNNING;
        step.executedAt = new Date();

        try {
          await this.executeStep(mcpProcess, step, scenario.targetUrl);
          step.status = TestStatus.COMPLETED;
        } catch (error) {
          step.status = TestStatus.FAILED;
          step.error = error instanceof Error ? error.message : String(error);
          
          // ステップが失敗した場合、実行を停止
          execution.status = TestStatus.FAILED;
          execution.error = `Step "${step.description}" failed: ${step.error}`;
          break;
        }
      }

      // 全ステップが完了した場合
      if (execution.status === TestStatus.RUNNING) {
        execution.status = TestStatus.COMPLETED;
      }

      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      // プロセスをクリーンアップ
      this.cleanupProcess(executionId);

      return execution;

    } catch (error) {
      execution.status = TestStatus.FAILED;
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      
      this.cleanupProcess(executionId);
      return execution;
    }
  }

  /**
   * テスト実行を停止
   */
  async stopTest(executionId: string): Promise<boolean> {
    const process = this.runningTests.get(executionId);
    if (process) {
      process.kill('SIGTERM');
      this.runningTests.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * Playwright MCPプロセスを起動
   */
  private async startMCPProcess(options: any): Promise<ChildProcess> {
    const args = ['@playwright/mcp'];
    
    if (options.headless !== false) {
      args.push('--headless');
    }

    const mcpProcess = spawn('npx', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PLAYWRIGHT_HEADLESS: String(options.headless !== false),
        PLAYWRIGHT_TIMEOUT: String(options.timeout || 30000)
      }
    });

    return new Promise((resolve, reject) => {
      let isResolved = false;

      mcpProcess.on('spawn', () => {
        if (!isResolved) {
          isResolved = true;
          resolve(mcpProcess);
        }
      });

      mcpProcess.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`MCP process failed to start: ${error.message}`));
        }
      });

      // タイムアウト処理
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error('MCP process startup timeout'));
        }
      }, 10000);
    });
  }

  /**
   * 個別のテストステップを実行
   */
  private async executeStep(
    mcpProcess: ChildProcess,
    step: TestStep,
    baseUrl: string
  ): Promise<void> {
    const command = this.buildMCPCommand(step, baseUrl);
    
    return new Promise((resolve, reject) => {
      let responseData = '';
      let errorData = '';

      const timeout = setTimeout(() => {
        reject(new Error(`Step timeout: ${step.description}`));
      }, step.timeout || 30000);

      // データの受信処理
      mcpProcess.stdout?.on('data', (data) => {
        responseData += data.toString();
      });

      mcpProcess.stderr?.on('data', (data) => {
        errorData += data.toString();
      });

      // コマンドを送信
      mcpProcess.stdin?.write(command + '\n');

      // レスポンスの解析（簡略化）
      const checkResponse = () => {
        if (responseData.includes('SUCCESS') || responseData.includes('COMPLETED')) {
          clearTimeout(timeout);
          resolve();
        } else if (responseData.includes('ERROR') || responseData.includes('FAILED')) {
          clearTimeout(timeout);
          reject(new Error(errorData || 'Step execution failed'));
        } else {
          // まだ完了していない場合、少し待ってから再チェック
          setTimeout(checkResponse, 100);
        }
      };

      checkResponse();
    });
  }

  /**
   * MCPコマンドを構築
   */
  private buildMCPCommand(step: TestStep, baseUrl: string): string {
    switch (step.type) {
      case StepType.NAVIGATE:
        return JSON.stringify({
          action: 'browser_navigate',
          params: { url: baseUrl }
        });

      case StepType.CLICK:
        return JSON.stringify({
          action: 'browser_click',
          params: { 
            element: step.selector || step.description,
            description: step.description
          }
        });

      case StepType.TYPE:
        return JSON.stringify({
          action: 'browser_type',
          params: {
            element: step.selector || step.description,
            text: step.value || '',
            description: step.description
          }
        });

      case StepType.WAIT:
        return JSON.stringify({
          action: 'browser_wait',
          params: {
            timeout: step.timeout || 5000,
            description: step.description
          }
        });

      case StepType.ASSERT:
        return JSON.stringify({
          action: 'browser_assert',
          params: {
            element: step.selector || step.description,
            expected: step.expected || '',
            description: step.description
          }
        });

      case StepType.SCREENSHOT:
        return JSON.stringify({
          action: 'browser_screenshot',
          params: {
            description: step.description,
            path: this.getScreenshotPath(step.id)
          }
        });

      default:
        throw new Error(`Unsupported step type: ${step.type}`);
    }
  }

  /**
   * スクリーンショットのパスを生成
   */
  private getScreenshotPath(stepId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.screenshotDir, `${stepId}_${timestamp}.png`);
  }

  /**
   * プロセスをクリーンアップ
   */
  private cleanupProcess(executionId: string): void {
    const process = this.runningTests.get(executionId);
    if (process) {
      if (!process.killed) {
        process.kill('SIGTERM');
      }
      this.runningTests.delete(executionId);
    }
  }

  /**
   * スクリーンショットディレクトリを作成
   */
  private async ensureScreenshotDir(): Promise<void> {
    try {
      await fs.access(this.screenshotDir);
    } catch {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    }
  }

  /**
   * 実行中のテスト一覧を取得
   */
  getRunningTests(): string[] {
    return Array.from(this.runningTests.keys());
  }
} 