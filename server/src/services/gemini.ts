import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerateTestRequest, GeneratedTestCase, TestStep, StepType } from '../../../shared/types';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  /**
   * 自然言語でのテストシナリオからE2Eテストケースを生成
   */
  async generateTestCase(request: GenerateTestRequest): Promise<GeneratedTestCase> {
    const prompt = this.buildPrompt(request);
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // JSONレスポンスをパース
      const parsedResponse = this.parseAIResponse(text);
      
      return {
        scenario: {
          name: parsedResponse.name,
          description: parsedResponse.description,
          targetUrl: request.targetUrl,
          steps: parsedResponse.steps,
          aiPrompt: request.description
        },
        confidence: parsedResponse.confidence || 0.8,
        reasoning: parsedResponse.reasoning || 'AIが生成したテストケース'
      };
      
    } catch (error) {
      console.error('Gemini API エラー:', error);
      throw new Error('テストケースの生成に失敗しました');
    }
  }

  /**
   * テスト実行結果を分析して改善提案を生成
   */
  async analyzeTestResults(testResults: any): Promise<string> {
    const prompt = `
E2Eテストの実行結果を分析して、改善提案をお願いします。

テスト結果:
${JSON.stringify(testResults, null, 2)}

以下の観点で分析してください：
1. 失敗した理由
2. テストの安定性
3. パフォーマンスの問題
4. 改善提案

回答は日本語でお願いします。
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('テスト結果分析エラー:', error);
      return 'テスト結果の分析に失敗しました。';
    }
  }

  /**
   * プロンプトを構築
   */
  private buildPrompt(request: GenerateTestRequest): string {
    return `
あなたはE2Eテスト自動化の専門家です。以下の情報に基づいて、Playwright MCPで実行可能なテストケースを生成してください。

テスト対象URL: ${request.targetUrl}
テストの説明: ${request.description}
${request.requirements ? `要件: ${request.requirements.join(', ')}` : ''}

以下のJSON形式で回答してください:

{
  "name": "テスト名",
  "description": "テストの詳細説明",
  "steps": [
    {
      "id": "step1",
      "type": "navigate|click|type|wait|assert|screenshot",
      "description": "ステップの説明",
      "selector": "要素のセレクタ（必要な場合）",
      "value": "入力値（必要な場合）",
      "expected": "期待される結果（必要な場合）",
      "timeout": 5000
    }
  ],
  "confidence": 0.0-1.0,
  "reasoning": "このテストケースを生成した理由"
}

重要な注意点:
1. Playwright MCPのアクセシビリティツリーを活用してください
2. 安定性の高いセレクタを使用してください
3. 適切な待機時間を設定してください
4. テストステップは論理的な順序で配置してください
5. 必ず有効なJSONフォーマットで回答してください

実際のWebページの構造を推測して、現実的なテストステップを生成してください。
    `;
  }

  /**
   * AIレスポンスをパース
   */
  private parseAIResponse(text: string): any {
    try {
      // JSONの開始と終了を見つける
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('Valid JSON not found in response');
      }
      
      const jsonString = text.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonString);
      
      // 基本的なバリデーション
      if (!parsed.name || !parsed.description || !Array.isArray(parsed.steps)) {
        throw new Error('Invalid response format');
      }
      
      // stepsにIDとstatus追加
      parsed.steps = parsed.steps.map((step: any, index: number) => ({
        ...step,
        id: step.id || `step_${index + 1}`,
        status: 'pending'
      }));
      
      return parsed;
      
    } catch (error) {
      console.error('AIレスポンスのパースに失敗:', error);
      
      // フォールバック: デフォルトのテストケースを返す
      return {
        name: `${new URL(this.extractUrl(text) || 'unknown').hostname} のテスト`,
        description: '基本的なナビゲーションテスト',
        steps: [
          {
            id: 'step_1',
            type: 'navigate',
            description: 'ページに移動',
            status: 'pending',
            timeout: 5000
          },
          {
            id: 'step_2',
            type: 'screenshot',
            description: 'スクリーンショットを撮影',
            status: 'pending'
          }
        ],
        confidence: 0.5,
        reasoning: 'AIレスポンスのパースに失敗したため、デフォルトテストを生成'
      };
    }
  }

  /**
   * テキストからURLを抽出
   */
  private extractUrl(text: string): string | null {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  }
} 