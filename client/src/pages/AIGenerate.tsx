import React, { useState } from 'react';

interface GeneratedTestCase {
  scenario: {
    name: string;
    description: string;
    targetUrl: string;
    steps: any[];
  };
  confidence: number;
  reasoning: string;
}

export const AIGenerate: React.FC = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<GeneratedTestCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addRequirement = () => {
    setRequirements([...requirements, '']);
  };

  const updateRequirement = (index: number, value: string) => {
    const newRequirements = [...requirements];
    newRequirements[index] = value;
    setRequirements(newRequirements);
  };

  const removeRequirement = (index: number) => {
    if (requirements.length > 1) {
      setRequirements(requirements.filter((_, i) => i !== index));
    }
  };

  const generateTest = async () => {
    if (!targetUrl || !description) {
      setError('URLと説明は必須です');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUrl,
          description,
          requirements: requirements.filter(req => req.trim() !== ''),
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setGeneratedTest(result.data);
      } else {
        setError(result.error || 'テスト生成に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
      console.error('AI generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveScenario = async () => {
    if (!generatedTest) return;

    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: generatedTest.scenario.name,
          description: generatedTest.scenario.description,
          targetUrl: generatedTest.scenario.targetUrl,
          steps: generatedTest.scenario.steps,
          aiPrompt: description,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('シナリオが保存されました！');
        // リセット
        setGeneratedTest(null);
        setTargetUrl('');
        setDescription('');
        setRequirements(['']);
      } else {
        alert(`保存に失敗しました: ${result.error}`);
      }
    } catch (err) {
      alert('保存中にエラーが発生しました');
      console.error('Save error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🤖 AIテストケース生成</h2>
        <p className="text-gray-600">Gemini AIを使用してテストケースを自動生成します</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">テストケース生成</h3>
          
          <div className="space-y-4">
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

            <div className="form-group">
              <label className="form-label">テスト説明 *</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="どのような機能をテストしたいか説明してください..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">要件（オプション）</label>
              {requirements.map((req, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    className="form-input flex-1"
                    placeholder="テスト要件を入力..."
                    value={req}
                    onChange={(e) => updateRequirement(index, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeRequirement(index)}
                    className="btn btn-secondary text-sm"
                    disabled={requirements.length === 1}
                  >
                    削除
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRequirement}
                className="btn btn-secondary text-sm"
              >
                + 要件を追加
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            )}

            <button
              onClick={generateTest}
              disabled={loading || !targetUrl || !description}
              className="btn btn-primary w-full"
            >
              {loading ? '生成中...' : '🤖 テストケースを生成'}
            </button>
          </div>
        </div>

        {/* Generated Test Display */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">生成結果</h3>
          
          {!generatedTest ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🤖</div>
              <p>左側のフォームに入力してテストケースを生成してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{generatedTest.scenario.name}</h4>
                <p className="text-gray-600 text-sm">{generatedTest.scenario.description}</p>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-2">テストステップ</h5>
                <div className="space-y-2">
                  {generatedTest.scenario.steps.map((step, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center space-x-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {step.type}
                        </span>
                        <span className="text-sm text-gray-700">{step.description}</span>
                      </div>
                      {step.selector && (
                        <div className="text-xs text-gray-500 mt-1">
                          セレクタ: {step.selector}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-2">AI信頼度</h5>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${generatedTest.confidence}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">{generatedTest.confidence}%</span>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-2">生成理由</h5>
                <p className="text-sm text-gray-600">{generatedTest.reasoning}</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={saveScenario}
                  className="btn btn-primary flex-1"
                >
                  💾 シナリオとして保存
                </button>
                <button
                  onClick={() => setGeneratedTest(null)}
                  className="btn btn-secondary"
                >
                  クリア
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 