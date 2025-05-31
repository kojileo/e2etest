import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

let db: sqlite3.Database | null = null;

/**
 * データベース接続を取得
 */
export function getDatabase(): sqlite3.Database {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase() first.');
  }
  return db;
}

/**
 * データベースのセットアップ
 */
export async function setupDatabase(): Promise<void> {
  try {
    // データディレクトリを作成
    const dataDir = path.dirname(process.env.DATABASE_URL || './data/e2e_tests.db');
    await fs.mkdir(dataDir, { recursive: true });

    // データベース接続
    const dbPath = process.env.DATABASE_URL || './data/e2e_tests.db';
    db = new sqlite3.Database(dbPath);

    // プロミス化されたメソッドを作成
    const dbRun = promisify(db.run.bind(db)) as (sql: string, ...params: any[]) => Promise<void>;
    const dbExec = promisify(db.exec.bind(db)) as (sql: string) => Promise<void>;

    // WALモードを有効化（パフォーマンス向上）
    await dbExec('PRAGMA journal_mode=WAL;');
    await dbExec('PRAGMA synchronous=NORMAL;');
    await dbExec('PRAGMA cache_size=1000;');
    await dbExec('PRAGMA foreign_keys=ON;');

    // テーブル作成
    await createTables(dbRun);

    console.log('✅ データベースの初期化が完了しました');
  } catch (error) {
    console.error('❌ データベースの初期化に失敗しました:', error);
    throw error;
  }
}

/**
 * テーブルを作成
 */
async function createTables(dbRun: (sql: string, ...params: any[]) => Promise<void>): Promise<void> {
  // テストシナリオテーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS test_scenarios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      target_url TEXT NOT NULL,
      steps TEXT NOT NULL,
      ai_prompt TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // テスト実行結果テーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS test_executions (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at DATETIME NOT NULL,
      completed_at DATETIME,
      duration INTEGER,
      steps TEXT NOT NULL,
      screenshots TEXT,
      error TEXT,
      metadata TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scenario_id) REFERENCES test_scenarios(id) ON DELETE CASCADE
    )
  `);

  // インデックス作成
  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_test_executions_scenario_id 
    ON test_executions(scenario_id)
  `);

  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_test_executions_status 
    ON test_executions(status)
  `);

  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_test_executions_started_at 
    ON test_executions(started_at)
  `);

  console.log('✅ データベーステーブルが作成されました');
}

/**
 * データベース接続を閉じる
 */
export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('データベース接続の終了でエラーが発生しました:', err);
          reject(err);
        } else {
          console.log('✅ データベース接続が終了しました');
          db = null;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
} 