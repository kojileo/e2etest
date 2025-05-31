import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalScenarios: number;
  totalExecutions: number;
  successRate: number;
  runningTests: number;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalScenarios: 0,
    totalExecutions: 0,
    successRate: 0,
    runningTests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // シナリオ数を取得
      const scenariosResponse = await fetch('/api/scenarios');
      const scenarios = await scenariosResponse.json();
      
      // 実行履歴を取得
      const executionsResponse = await fetch('/api/tests/executions');
      const executions = await executionsResponse.json();
      
      // 実行中のテストを取得
      const runningResponse = await fetch('/api/tests/running');
      const running = await runningResponse.json();

      const completedExecutions = executions.data?.filter(
        (exec: any) => exec.status === 'completed'
      ) || [];
      
      const successRate = executions.data?.length > 0 
        ? Math.round((completedExecutions.length / executions.data.length) * 100)
        : 0;

      setStats({
        totalScenarios: scenarios.data?.length || 0,
        totalExecutions: executions.data?.length || 0,
        successRate,
        runningTests: running.data?.length || 0,
      });
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="text-gray-600">E2Eテスト自動化システムの概要</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                📝
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">総シナリオ数</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalScenarios}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                ▶️
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">総実行回数</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalExecutions}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                📊
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">成功率</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.successRate}%</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                🏃
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">実行中</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.runningTests}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">クイックアクション</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/create-scenario"
            className="btn btn-primary text-center"
          >
            📝 新規シナリオ作成
          </Link>
          <Link
            to="/ai-generate"
            className="btn btn-secondary text-center"
          >
            🤖 AIでテスト生成
          </Link>
          <Link
            to="/executions"
            className="btn btn-secondary text-center"
          >
            📊 実行履歴を確認
          </Link>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">システム状態</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">APIサーバー</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              🟢 稼働中
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">データベース</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              🟢 接続済み
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">WebSocket</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              🟢 接続中
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Gemini AI</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              ⚠️ 設定確認
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}; 