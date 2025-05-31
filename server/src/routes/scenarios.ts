import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/setup';
import { TestScenario, ApiResponse } from '../../../shared/types';

export const scenarioRoutes = Router();

/**
 * シナリオ一覧取得
 */
scenarioRoutes.get('/', async (_req, res) => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM test_scenarios ORDER BY created_at DESC');
    
    stmt.all((err: Error | null, rows: any[]) => {
      if (err) {
        console.error('シナリオ取得エラー:', err);
        res.status(500).json({
          success: false,
          error: 'データベースエラー'
        } as ApiResponse);
        return;
      }

      const scenarios: TestScenario[] = rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        targetUrl: row.target_url,
        steps: JSON.parse(row.steps),
        aiPrompt: row.ai_prompt,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));

      res.json({
        success: true,
        data: scenarios
      } as ApiResponse<TestScenario[]>);
    });
  } catch (error) {
    console.error('シナリオ一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラー'
    } as ApiResponse);
  }
});

/**
 * シナリオ詳細取得
 */
scenarioRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM test_scenarios WHERE id = ?');
    
    stmt.get(id, (err: Error | null, row: any) => {
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

      res.json({
        success: true,
        data: scenario
      } as ApiResponse<TestScenario>);
    });
  } catch (error) {
    console.error('シナリオ詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラー'
    } as ApiResponse);
  }
});

/**
 * 新規シナリオ作成
 */
scenarioRoutes.post('/', async (req, res) => {
  try {
    const { name, description, targetUrl, steps, aiPrompt } = req.body;

    if (!name || !targetUrl || !steps) {
      res.status(400).json({
        success: false,
        error: '必須フィールドが不足しています'
      } as ApiResponse);
      return;
    }

    const scenario: TestScenario = {
      id: uuidv4(),
      name,
      description: description || '',
      targetUrl,
      steps,
      aiPrompt,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO test_scenarios 
      (id, name, description, target_url, steps, ai_prompt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      scenario.id,
      scenario.name,
      scenario.description,
      scenario.targetUrl,
      JSON.stringify(scenario.steps),
      scenario.aiPrompt,
      scenario.createdAt.toISOString(),
      scenario.updatedAt.toISOString(),
      (err: Error | null) => {
        if (err) {
          console.error('シナリオ作成エラー:', err);
          res.status(500).json({
            success: false,
            error: 'データベースエラー'
          } as ApiResponse);
          return;
        }

        res.status(201).json({
          success: true,
          data: scenario,
          message: 'シナリオが作成されました'
        } as ApiResponse<TestScenario>);
      }
    );
  } catch (error) {
    console.error('シナリオ作成エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラー'
    } as ApiResponse);
  }
});

/**
 * シナリオ更新
 */
scenarioRoutes.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, targetUrl, steps, aiPrompt } = req.body;

    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE test_scenarios 
      SET name = ?, description = ?, target_url = ?, steps = ?, ai_prompt = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      name,
      description,
      targetUrl,
      JSON.stringify(steps),
      aiPrompt,
      new Date().toISOString(),
      id,
      function(this: any, err: Error | null) {
        if (err) {
          console.error('シナリオ更新エラー:', err);
          res.status(500).json({
            success: false,
            error: 'データベースエラー'
          } as ApiResponse);
          return;
        }

        if (this.changes === 0) {
          res.status(404).json({
            success: false,
            error: 'シナリオが見つかりません'
          } as ApiResponse);
          return;
        }

        res.json({
          success: true,
          message: 'シナリオが更新されました'
        } as ApiResponse);
      }
    );
  } catch (error) {
    console.error('シナリオ更新エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラー'
    } as ApiResponse);
  }
});

/**
 * シナリオ削除
 */
scenarioRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM test_scenarios WHERE id = ?');

    stmt.run(id, function(this: any, err: Error | null) {
      if (err) {
        console.error('シナリオ削除エラー:', err);
        res.status(500).json({
          success: false,
          error: 'データベースエラー'
        } as ApiResponse);
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({
          success: false,
          error: 'シナリオが見つかりません'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        message: 'シナリオが削除されました'
      } as ApiResponse);
    });
  } catch (error) {
    console.error('シナリオ削除エラー:', error);
    res.status(500).json({
      success: false,
      error: 'サーバーエラー'
    } as ApiResponse);
  }
}); 