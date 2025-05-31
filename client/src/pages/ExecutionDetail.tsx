import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface ExecutionDetail {
  id: string;
  scenarioId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  steps: Array<{
    id: string;
    description: string;
    status: string;
    duration?: number;
    error?: string;
    screenshot?: string;
  }>;
}

export const ExecutionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchExecutionDetail(id);
    }
  }, [id]);

  const fetchExecutionDetail = async (executionId: string) => {
    try {
      const response = await fetch(`/api/tests/executions/${executionId}`);
      const data = await response.json();
      
      if (data.success) {
        setExecution(data.data);
      } else {
        console.error('Failed to fetch execution detail:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch execution detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', icon: '✅' },
      running: { color: 'bg-blue-100 text-blue-800', icon: '⏳' },
      failed: { color: 'bg-red-100 text-red-800', icon: '❌' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: '⏸️' },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: '🚫' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon} {status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    return `${(duration / 1000).toFixed(2)}秒`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">実行詳細を読み込み中...</div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">😵</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          実行詳細が見つかりません
        </h3>
        <p className="text-gray-600 mb-4">
          指定された実行IDは存在しないか、削除されている可能性があります
        </p>
        <button
          onClick={() => navigate('/executions')}
          className="btn btn-primary"
        >
          実行一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">実行詳細</h2>
          <p className="text-gray-600">実行ID: {execution.id}</p>
        </div>
        <button
          onClick={() => navigate('/executions')}
          className="btn btn-secondary"
        >
          ← 実行一覧に戻る
        </button>
      </div>

      {/* Execution Summary */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">実行サマリー</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">ステータス</dt>
            <dd className="mt-1">{getStatusBadge(execution.status)}</dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">開始時刻</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(execution.startedAt)}</dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">完了時刻</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {execution.completedAt ? formatDate(execution.completedAt) : '-'}
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">実行時間</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDuration(execution.duration)}</dd>
          </div>
        </div>

        {execution.error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-red-800 mb-2">エラー詳細</h4>
            <p className="text-sm text-red-700">{execution.error}</p>
          </div>
        )}
      </div>

      {/* Step Details */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">ステップ詳細</h3>
        
        {execution.steps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            ステップの詳細情報がありません
          </div>
        ) : (
          <div className="space-y-4">
            {execution.steps.map((step, index) => (
              <div
                key={step.id}
                className="border border-gray-200 rounded-md p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {step.description}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        実行時間: {formatDuration(step.duration)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(step.status)}
                </div>

                {step.error && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3">
                    <h5 className="text-xs font-medium text-red-800 mb-1">ステップエラー</h5>
                    <p className="text-xs text-red-700">{step.error}</p>
                  </div>
                )}

                {step.screenshot && (
                  <div className="mt-3">
                    <h5 className="text-xs font-medium text-gray-700 mb-2">スクリーンショット</h5>
                    <img
                      src={step.screenshot}
                      alt={`Step ${index + 1} screenshot`}
                      className="max-w-full h-auto border border-gray-200 rounded-md"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => window.print()}
          className="btn btn-secondary"
        >
          🖨️ 印刷
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="btn btn-secondary"
        >
          🔗 URLをコピー
        </button>
        {execution.status === 'running' && (
          <button
            onClick={() => {
              // TODO: Stop execution functionality
              alert('実行停止機能は実装中です');
            }}
            className="btn btn-danger"
          >
            ⏹️ 実行停止
          </button>
        )}
      </div>
    </div>
  );
}; 