import React, { useState, useEffect } from 'react';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  targetUrl: string;
  steps: any[];
  createdAt: string;
  updatedAt: string;
}

export const TestScenarios: React.FC = () => {
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/scenarios');
      const data = await response.json();
      setScenarios(data.data || []);
    } catch (error) {
      console.error('Failed to fetch scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">シナリオを読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">テストシナリオ</h2>
          <p className="text-gray-600">E2Eテストシナリオの管理</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          📝 新規作成
        </button>
      </div>

      {/* Scenarios List */}
      {scenarios.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            テストシナリオがありません
          </h3>
          <p className="text-gray-600 mb-4">
            最初のテストシナリオを作成して始めましょう
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            シナリオを作成
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {scenario.name}
                  </h3>
                  <p className="text-gray-600 mb-3">{scenario.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>🌐 {scenario.targetUrl}</span>
                    <span>📋 {scenario.steps.length} ステップ</span>
                    <span>📅 {formatDate(scenario.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => window.open(`/scenarios/${scenario.id}`, '_blank')}
                    className="btn btn-secondary text-sm"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => runTest(scenario.id)}
                    className="btn btn-primary text-sm"
                  >
                    実行
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal (Placeholder) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              新規シナリオ作成
            </h3>
            <p className="text-gray-600 mb-4">
              現在開発中です。しばらくお待ちください。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  async function runTest(scenarioId: string) {
    try {
      const response = await fetch('/api/tests/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId,
          options: {
            headless: true,
            timeout: 30000,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('テスト実行を開始しました！');
      } else {
        alert(`テスト実行に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Test execution error:', error);
      alert('テスト実行でエラーが発生しました');
    }
  }
}; 