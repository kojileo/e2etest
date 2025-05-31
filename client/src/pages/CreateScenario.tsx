import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TestStep {
  type: string;
  description: string;
  selector?: string;
  value?: string;
  waitTime?: number;
}

export const CreateScenario: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [steps, setSteps] = useState<TestStep[]>([
    { type: 'navigate', description: 'ページにアクセス' }
  ]);
  const [loading, setLoading] = useState(false);

  const addStep = () => {
    setSteps([...steps, { type: 'click', description: '' }]);
  };

  const updateStep = (index: number, field: keyof TestStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const saveScenario = async () => {
    if (!name || !description || !targetUrl) {
      alert('名前、説明、URLは必須です');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          targetUrl,
          steps: steps.filter(step => step.description.trim() !== ''),
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('シナリオが保存されました！');
        navigate('/scenarios');
      } else {
        alert(`保存に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('保存中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const stepTypes = [
    { value: 'navigate', label: 'ページ移動' },
    { value: 'click', label: 'クリック' },
    { value: 'type', label: 'テキスト入力' },
    { value: 'wait', label: '待機' },
    { value: 'screenshot', label: 'スクリーンショット' },
    { value: 'assert', label: 'アサーション' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">新規シナリオ作成</h2>
          <p className="text-gray-600">E2Eテストシナリオを手動で作成します</p>
        </div>
        <button
          onClick={() => navigate('/scenarios')}
          className="btn btn-secondary"
        >
          ← 戻る
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
          
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">シナリオ名 *</label>
              <input
                type="text"
                className="form-input"
                placeholder="例: ログイン機能テスト"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">説明 *</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="このシナリオの目的と内容を説明してください..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">対象URL *</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Test Steps */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">テストステップ</h3>
            <button
              onClick={addStep}
              className="btn btn-primary text-sm"
            >
              + ステップ追加
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {steps.map((step, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    ステップ {index + 1}
                  </span>
                  <button
                    onClick={() => removeStep(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    disabled={steps.length === 1}
                  >
                    削除
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="form-label text-sm">アクション</label>
                    <select
                      className="form-input"
                      value={step.type}
                      onChange={(e) => updateStep(index, 'type', e.target.value)}
                    >
                      {stepTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-sm">説明</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="このステップの説明..."
                      value={step.description}
                      onChange={(e) => updateStep(index, 'description', e.target.value)}
                    />
                  </div>

                  {(step.type === 'click' || step.type === 'type' || step.type === 'assert') && (
                    <div>
                      <label className="form-label text-sm">セレクタ</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="#id, .class, [data-testid='...']"
                        value={step.selector || ''}
                        onChange={(e) => updateStep(index, 'selector', e.target.value)}
                      />
                    </div>
                  )}

                  {step.type === 'type' && (
                    <div>
                      <label className="form-label text-sm">入力値</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="入力するテキスト"
                        value={step.value || ''}
                        onChange={(e) => updateStep(index, 'value', e.target.value)}
                      />
                    </div>
                  )}

                  {step.type === 'wait' && (
                    <div>
                      <label className="form-label text-sm">待機時間（ミリ秒）</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="1000"
                        value={step.waitTime || ''}
                        onChange={(e) => updateStep(index, 'waitTime', parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => navigate('/scenarios')}
          className="btn btn-secondary"
        >
          キャンセル
        </button>
        <button
          onClick={saveScenario}
          disabled={loading || !name || !description || !targetUrl}
          className="btn btn-primary"
        >
          {loading ? '保存中...' : '💾 シナリオを保存'}
        </button>
      </div>
    </div>
  );
}; 