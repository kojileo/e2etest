import { Router } from 'express';
import { getDatabase } from '../database/setup';
import { PlaywrightMCPRunner } from '../services/playwright-runner';
import { TestExecution, TestScenario, ApiResponse, RunTestRequest } from '../../../shared/types';

export const testRoutes = Router();

// グローバルなPlaywright MCPランナーインスタンス
const mcpRunner = new PlaywrightMCPRunner();

/**
 * テスト実行
 */
testRoutes.post('/run', async (req, res) => {
  try {
    const { scenarioId, options }: RunTestRequest = req.body;

    if (!scenarioId) {
      res.status(400).json({
        success: false,
        error: 'シナリオIDが必要です'
      } as ApiResponse);
      return;
    }

    // シナリオを取得
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM test_scenarios WHERE id = ?');
    
    stmt.get(scenarioId, async (err: Error | null, row: any) => {
      if (err) {
        console.error('シナリオ取得エラー:', err);
        res.status(500).json({
          success: false,
          error: 'データベースエラー'
        } as ApiResponse);
        return;
      }

      if (!row) {
        res.status(404).json({
          success: false,
          error: 'シナリオが見つかりません'
        } as ApiResponse);
        return;
      }

      const scenario: TestScenario = {
        id: row.id,
        name: row.name,
        description: row.description,
        targetUrl: row.target_url,
        steps: JSON.parse(row.steps),
        aiPrompt: row.ai_prompt,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };

      try {
        // テスト実行
        const execution = await mcpRunner.runTest(scenario, options || {});
        
        // 実行結果をデータベースに保存
        await saveTestExecution(execution);

        res.json({
          success: true,
          data: execution,
          message: 'テストが実行されました'
        } as ApiResponse<TestExecution>);
      } catch (error) {
        console.error('テスト実行エラー:', error);
        res.status(500).json({
          success: false,
          error: 'テスト実行に失敗しました',
          message: error instanceof Error ? error.message : 'Unknown error'
        } as ApiResponse);
      }
    });
  } catch (error) {
    console.error('テスト実行API エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラー'
    } as ApiResponse);
  }
});

/**
 * テスト実行履歴取得
 */
testRoutes.get('/executions', async (_req, res) => {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT te.*, ts.name as scenario_name 
      FROM test_executions te
      LEFT JOIN test_scenarios ts ON te.scenario_id = ts.id
      ORDER BY te.started_at DESC
      LIMIT 50
    `);
    
    stmt.all((err: Error | null, rows: any[]) => {
      if (err) {
        console.error('実行履歴取得エラー:', err);
        res.status(500).json({
          success: false,
          error: 'データベースエラー'
        } as ApiResponse);
        return;
      }

      const executions: TestExecution[] = rows.map(row => ({
        id: row.id,
        scenarioId: row.scenario_id,
        status: row.status,
        startedAt: new Date(row.started_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        duration: row.duration,
        steps: JSON.parse(row.steps),
        screenshots: row.screenshots ? JSON.parse(row.screenshots) : [],
        error: row.error,
        metadata: JSON.parse(row.metadata)
      } as TestExecution));

      res.json({
        success: true,
        data: executions
      } as ApiResponse<TestExecution[]>);
    });
  } catch (error) {
    console.error('実行履歴取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラー'
    } as ApiResponse);
  }
});

/**
 * テスト実行詳細取得
 */
testRoutes.get('/executions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT te.*, ts.name as scenario_name 
      FROM test_executions te
      LEFT JOIN test_scenarios ts ON te.scenario_id = ts.id
      WHERE te.id = ?
    `);
    
    stmt.get(id, (err: Error | null, row: any) => {
      if (err) {
        console.error('実行詳細取得エラー:', err);
        res.status(500).json({
          success: false,
          error: 'データベースエラー'
        } as ApiResponse);
        return;
      }

      if (!row) {
        res.status(404).json({
          success: false,
          error: '実行履歴が見つかりません'
        } as ApiResponse);
        return;
      }

      const execution: TestExecution = {
        id: row.id,
        scenarioId: row.scenario_id,
        status: row.status,
        startedAt: new Date(row.started_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        duration: row.duration,
        steps: JSON.parse(row.steps),
        screenshots: row.screenshots ? JSON.parse(row.screenshots) : [],
        error: row.error,
        metadata: JSON.parse(row.metadata)
      } as TestExecution;

      res.json({
        success: true,
        data: execution
      } as ApiResponse<TestExecution>);
    });
  } catch (error) {
    console.error('実行詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラー'
    } as ApiResponse);
  }
});

/**
 * テスト実行停止
 */
testRoutes.post('/stop/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await mcpRunner.stopTest(id);
    
    if (success) {
      res.json({
        success: true,
        message: 'テストが停止されました'
      } as ApiResponse);
    } else {
      res.status(404).json({
        success: false,
        error: '実行中のテストが見つかりません'
      } as ApiResponse);
    }
  } catch (error) {
    console.error('テスト停止エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラー'
    } as ApiResponse);
  }
});

/**
 * 実行中のテスト一覧取得
 */
testRoutes.get('/running', async (_req, res) => {
  try {
    const runningTests = mcpRunner.getRunningTests();
    
    res.json({
      success: true,
      data: runningTests
    } as ApiResponse<string[]>);
  } catch (error) {
    console.error('実行中テスト取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラー'
    } as ApiResponse);
  }
});

/**
 * テスト実行結果をデータベースに保存
 */
async function saveTestExecution(execution: TestExecution): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO test_executions 
      (id, scenario_id, status, started_at, completed_at, duration, steps, screenshots, error, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      execution.id,
      execution.scenarioId,
      execution.status,
      execution.startedAt.toISOString(),
      execution.completedAt?.toISOString(),
      execution.duration,
      JSON.stringify(execution.steps),
      JSON.stringify(execution.screenshots),
      execution.error,
      JSON.stringify(execution.metadata),
      (err: Error | null) => {
        if (err) {
          console.error('実行結果保存エラー:', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
} 