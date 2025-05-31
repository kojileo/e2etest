import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateTestRequest, GeneratedTestCase, TestStep, StepType, TestStatus } from '../../../shared/types';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * AIを使用してテストケースを生成
   */
  async generateTestCase(request: GenerateTestRequest): Promise<GeneratedTestCase> {
    try {
      const prompt = this.buildTestGenerationPrompt(request);
      console.log('Sending prompt to Gemini:', prompt);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('Gemini response:', text);

      // レスポンスをパース
      const parsedResult = this.parseTestCaseResponse(text, request.targetUrl);

      return {
        scenario: parsedResult.scenario,
        confidence: parsedResult.confidence,
        reasoning: parsedResult.reasoning
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`テストケース生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * テスト実行結果を分析
   */
  async analyzeTestResults(testResults: any): Promise<string> {
    try {
      const prompt = this.buildAnalysisPrompt(testResults);
      console.log('Sending analysis prompt to Gemini:', prompt);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = response.text();

      console.log('Gemini analysis response:', analysis);
      return analysis;
    } catch (error) {
      console.error('Gemini analysis error:', error);
      throw new Error(`テスト結果分析に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * テストケース生成用のプロンプトを構築
   */
  private buildTestGenerationPrompt(request: GenerateTestRequest): string {
    const { targetUrl, description, requirements, existingScenarios } = request;

    let prompt = `
E2E テストケースを生成してください。以下の情報に基づいて、JSON形式でテストステップを作成してください。

**対象URL**: ${targetUrl}
**テスト説明**: ${description}

**利用可能なステップタイプ**:
- navigate: ページに移動
- click: 要素をクリック 
- type: テキストを入力
- wait: 待機
- assert: アサーション（要素の存在、テキスト確認等）
- screenshot: スクリーンショット撮影

**要件**:
${requirements ? requirements.map(req => `- ${req}`).join('\n') : '- 基本的な機能テストを実行'}

**レスポンス形式** (JSON):
{
  "scenario": {
    "name": "テスト名",
    "description": "テストの説明",
    "targetUrl": "${targetUrl}",
    "steps": [
      {
        "id": "step-1",
        "type": "navigate",
        "description": "ページに移動",
        "selector": "",
        "value": "${targetUrl}",
        "timeout": 5000,
        "status": "pending"
      },
      {
        "id": "step-2", 
        "type": "click",
        "description": "ボタンをクリック",
        "selector": "button[type='submit']",
        "timeout": 3000,
        "status": "pending"
      }
    ]
  },
  "confidence": 85,
  "reasoning": "なぜこのテストケースを提案したかの理由"
}

**重要な注意点**:
1. selectorは可能な限り具体的で安定したものを使用（id、data-testid、role等）
2. 各ステップには適切なtimeoutを設定
3. テストの流れは論理的で実用的である必要があります
4. アクセシビリティを考慮したセレクタを優先してください

既存のシナリオ（重複を避けるため）:
${existingScenarios ? existingScenarios.join(', ') : 'なし'}

JSON形式でのみ回答してください。`;

    return prompt;
  }

  /**
   * テスト結果分析用のプロンプトを構築
   */
  private buildAnalysisPrompt(testResults: any): string {
    return `
以下のE2Eテスト実行結果を分析し、問題点と改善提案を日本語で提供してください:

**テスト結果データ**:
${JSON.stringify(testResults, null, 2)}

**分析してほしい内容**:
1. テストの成功/失敗の原因
2. パフォーマンスに関する問題
3. テストの安定性に関する問題
4. セレクタやタイミングの改善提案
5. 今後のテスト改善のための推奨事項

**回答形式**:
分析結果を構造化された日本語で回答してください。技術的な詳細と実用的な改善提案を含めてください。
`;
  }

  /**
   * Geminiのレスポンスをパース
   */
  private parseTestCaseResponse(response: string, targetUrl: string): {
    scenario: any;
    confidence: number;
    reasoning: string;
  } {
    try {
      // JSONブロックを抽出
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
      let jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;

      // JSONをパース
      const parsed = JSON.parse(jsonStr);

      // 基本的な検証
      if (!parsed.scenario || !parsed.scenario.steps) {
        throw new Error('Invalid response format');
      }

      // ステップの正規化
      const normalizedSteps: TestStep[] = parsed.scenario.steps.map((step: any, index: number) => ({
        id: step.id || `step-${index + 1}`,
        type: this.normalizeStepType(step.type),
        description: step.description || `Step ${index + 1}`,
        selector: step.selector || '',
        value: step.value || '',
        timeout: step.timeout || 5000,
        expected: step.expected || '',
        status: TestStatus.PENDING,
        screenshot: step.screenshot || ''
      }));

      return {
        scenario: {
          name: parsed.scenario.name || 'Generated Test Case',
          description: parsed.scenario.description || 'AI-generated test case',
          targetUrl: targetUrl,
          steps: normalizedSteps
        },
        confidence: Math.min(100, Math.max(0, parsed.confidence || 75)),
        reasoning: parsed.reasoning || 'AI-generated test case based on provided requirements'
      };
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      console.error('Raw response:', response);

      // フォールバック: 基本的なテストケースを生成
      return this.createFallbackTestCase(targetUrl);
    }
  }

  /**
   * ステップタイプの正規化
   */
  private normalizeStepType(type: string): StepType {
    const normalizedType = type.toLowerCase();
    switch (normalizedType) {
      case 'navigate':
        return StepType.NAVIGATE;
      case 'click':
        return StepType.CLICK;
      case 'type':
        return StepType.TYPE;
      case 'wait':
        return StepType.WAIT;
      case 'assert':
        return StepType.ASSERT;
      case 'screenshot':
        return StepType.SCREENSHOT;
      default:
        return StepType.NAVIGATE;
    }
  }

  /**
   * フォールバックテストケースを作成
   */
  private createFallbackTestCase(targetUrl: string): {
    scenario: any;
    confidence: number;
    reasoning: string;
  } {
    return {
      scenario: {
        name: 'Basic Page Test',
        description: 'Basic test case to verify page accessibility',
        targetUrl,
        steps: [
          {
            id: 'step-1',
            type: StepType.NAVIGATE,
            description: 'Navigate to the target page',
            selector: '',
            value: targetUrl,
            timeout: 10000,
            expected: '',
            status: TestStatus.PENDING,
            screenshot: ''
          },
          {
            id: 'step-2',
            type: StepType.WAIT,
            description: 'Wait for page to load',
            selector: 'body',
            value: '',
            timeout: 5000,
            expected: '',
            status: TestStatus.PENDING,
            screenshot: ''
          },
          {
            id: 'step-3',
            type: StepType.SCREENSHOT,
            description: 'Take a screenshot',
            selector: '',
            value: '',
            timeout: 3000,
            expected: '',
            status: TestStatus.PENDING,
            screenshot: ''
          }
        ]
      },
      confidence: 50,
      reasoning: 'Fallback test case created due to parsing error. This provides basic page verification.'
    };
  }
} 