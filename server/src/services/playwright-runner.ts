import { ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { TestScenario, TestExecution, TestStatus, TestStep, StepType } from '../../../shared/types';
import { notifyTestStarted, notifyTestProgress, notifyTestCompleted, notifyTestError } from '../websocket/handler';

interface MCPCommand {
  command: string;
  args: any[];
}

interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class PlaywrightMCPRunner {
  private runningProcesses = new Map<string, ChildProcess>();

  constructor() {
    // MCP サーバーの設定は今後必要に応じて実装
  }

  /**
   * テストを実行
   */
  async runTest(scenario: TestScenario, options: any = {}): Promise<TestExecution> {
    const executionId = uuidv4();
    const startedAt = new Date();

    console.log(`🚀 テスト実行開始: ${scenario.name} (ID: ${executionId})`);

    // WebSocket通知: テスト開始
    notifyTestStarted(executionId, scenario.name);

    const execution: TestExecution = {
      id: executionId,
      scenarioId: scenario.id,
      status: TestStatus.RUNNING,
      startedAt,
      steps: scenario.steps.map(step => ({
        ...step,
        status: TestStatus.PENDING
      })),
      screenshots: [],
      metadata: {
        browserName: options.browserName || 'chromium',
        browserVersion: 'unknown',
        viewportSize: options.viewportSize || { width: 1920, height: 1080 },
        userAgent: 'Playwright E2E Test Runner'
      }
    };

    try {
      // テスト実行
      await this.executeTestSteps(execution, options);

      // テスト完了
      execution.status = TestStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      // WebSocket通知: テスト完了
      notifyTestCompleted(executionId, true, execution.duration, execution);

      console.log(`✅ テスト実行完了: ${scenario.name} (${execution.duration}ms)`);

    } catch (error) {
      // テスト失敗
      execution.status = TestStatus.FAILED;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.error = error instanceof Error ? error.message : 'Unknown error';

      // WebSocket通知: テストエラー
      notifyTestError(executionId, execution.error);

      console.error(`❌ テスト実行失敗: ${scenario.name}`, error);
    } finally {
      // プロセスをクリーンアップ
      this.runningProcesses.delete(executionId);
    }

    return execution;
  }

  /**
   * テストステップを実行
   */
  private async executeTestSteps(execution: TestExecution, options: any): Promise<void> {
    console.log(`📋 ${execution.steps.length} ステップを実行します`);

    for (let i = 0; i < execution.steps.length; i++) {
      const step = execution.steps[i];
      
      console.log(`🔄 ステップ ${i + 1}/${execution.steps.length}: ${step.description}`);

      // WebSocket通知: 進行状況
      notifyTestProgress(execution.id, step.description, i + 1, execution.steps.length);

      try {
        step.status = TestStatus.RUNNING;
        step.executedAt = new Date();

        await this.executeStep(step, execution, options);

        step.status = TestStatus.COMPLETED;
        console.log(`✅ ステップ完了: ${step.description}`);

      } catch (error) {
        step.status = TestStatus.FAILED;
        step.error = error instanceof Error ? error.message : 'Unknown error';
        
        console.error(`❌ ステップ失敗: ${step.description}`, error);
        
        // ステップが失敗した場合、テスト全体を失敗とする
        throw error;
      }

      // 小さな待機時間を追加（安定性のため）
      await this.sleep(500);
    }
  }

  /**
   * 個別のステップを実行
   */
  private async executeStep(step: TestStep, execution: TestExecution, _options: any): Promise<void> {
    switch (step.type) {
      case StepType.NAVIGATE:
        await this.navigateToPage(step.value || step.selector || '');
        break;

      case StepType.CLICK:
        await this.clickElement(step.selector || '');
        break;

      case StepType.TYPE:
        await this.typeText(step.selector || '', step.value || '');
        break;

      case StepType.WAIT:
        await this.waitForElement(step.selector || '', step.timeout || 5000);
        break;

      case StepType.ASSERT:
        await this.assertElement(step.selector || '', step.expected || '');
        break;

      case StepType.SCREENSHOT:
        const screenshotPath = await this.takeScreenshot(execution.id, step.id);
        step.screenshot = screenshotPath;
        execution.screenshots.push(screenshotPath);
        break;

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * ページナビゲーション
   */
  private async navigateToPage(url: string): Promise<void> {
    console.log(`🔗 ナビゲート: ${url}`);
    
    // 実際のMCPコマンドの代わりにシミュレーション
    await this.simulateMCPCommand({
      command: 'navigate',
      args: [url]
    });
  }

  /**
   * 要素をクリック
   */
  private async clickElement(selector: string): Promise<void> {
    console.log(`👆 クリック: ${selector}`);
    
    await this.simulateMCPCommand({
      command: 'click',
      args: [selector]
    });
  }

  /**
   * テキスト入力
   */
  private async typeText(selector: string, text: string): Promise<void> {
    console.log(`⌨️ テキスト入力: ${selector} = "${text}"`);
    
    await this.simulateMCPCommand({
      command: 'type',
      args: [selector, text]
    });
  }

  /**
   * 要素の待機
   */
  private async waitForElement(selector: string, timeout: number): Promise<void> {
    console.log(`⏳ 要素待機: ${selector} (${timeout}ms)`);
    
    await this.simulateMCPCommand({
      command: 'wait',
      args: [selector, timeout]
    });
  }

  /**
   * アサーション
   */
  private async assertElement(selector: string, expected: string): Promise<void> {
    console.log(`✓ アサーション: ${selector} = "${expected}"`);
    
    await this.simulateMCPCommand({
      command: 'assert',
      args: [selector, expected]
    });
  }

  /**
   * スクリーンショット撮影
   */
  private async takeScreenshot(executionId: string, stepId: string): Promise<string> {
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });

    const fileName = `${executionId}_${stepId}_${Date.now()}.png`;
    const filePath = path.join(screenshotDir, fileName);

    console.log(`📷 スクリーンショット: ${filePath}`);

    await this.simulateMCPCommand({
      command: 'screenshot',
      args: [filePath]
    });

    return filePath;
  }

  /**
   * MCPコマンドのシミュレーション（実際の実装ではMCPサーバーとの通信）
   */
  private async simulateMCPCommand(command: MCPCommand): Promise<MCPResponse> {
    // 実際の実装では、ここでPlaywright MCPサーバーと通信
    // 現在はシミュレーションとして適当な待機時間を設ける
    
    const executionTime = Math.random() * 1000 + 500; // 500-1500ms
    await this.sleep(executionTime);

    // 10%の確率でエラーをシミュレート（テスト目的）
    if (Math.random() < 0.1 && command.command !== 'screenshot') {
      throw new Error(`Simulated error in ${command.command} command`);
    }

    console.log(`✓ MCP Command executed: ${command.command}`);
    
    return {
      success: true,
      data: `Command ${command.command} executed successfully`
    };
  }

  /**
   * テスト実行を停止
   */
  async stopTest(executionId: string): Promise<boolean> {
    const process = this.runningProcesses.get(executionId);
    
    if (process) {
      console.log(`🛑 テスト停止: ${executionId}`);
      process.kill('SIGTERM');
      this.runningProcesses.delete(executionId);
      return true;
    }

    return false;
  }

  /**
   * 実行中のテスト一覧を取得
   */
  getRunningTests(): string[] {
    return Array.from(this.runningProcesses.keys());
  }

  /**
   * 待機ユーティリティ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 