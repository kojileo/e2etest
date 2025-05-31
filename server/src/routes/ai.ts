import { Router } from 'express';
import { GeminiService } from '../services/gemini';
import { GenerateTestRequest, ApiResponse, GeneratedTestCase } from '../../../shared/types';

export const aiRoutes = Router();

// Geminiサービスのインスタンス
let geminiService: GeminiService | null = null;

// Geminiサービスを初期化
function getGeminiService(): GeminiService {
  if (!geminiService) {
    try {
      geminiService = new GeminiService();
    } catch (error) {
      console.error('Gemini Service initialization failed:', error);
      throw new Error('Gemini API is not configured properly');
    }
  }
  return geminiService;
}

/**
 * AIによるテストケース生成
 */
aiRoutes.post('/generate', async (req, res) => {
  try {
    const generateRequest: GenerateTestRequest = req.body;

    // 入力検証
    if (!generateRequest.targetUrl || !generateRequest.description) {
      res.status(400).json({
        success: false,
        error: 'targetUrl and description are required'
      } as ApiResponse);
      return;
    }

    // URL形式の簡易検証
    try {
      new URL(generateRequest.targetUrl);
    } catch {
      res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      } as ApiResponse);
      return;
    }

    const gemini = getGeminiService();
    const testCase = await gemini.generateTestCase(generateRequest);

    res.json({
      success: true,
      data: testCase,
      message: 'Test case generated successfully'
    } as ApiResponse<GeneratedTestCase>);

  } catch (error) {
    console.error('AI generation error:', error);
    
    if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
      res.status(500).json({
        success: false,
        error: 'Gemini API configuration error',
        message: 'Please check your GEMINI_API_KEY environment variable'
      } as ApiResponse);
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate test case',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse);
  }
});

/**
 * テスト実行結果の分析
 */
aiRoutes.post('/analyze', async (req, res) => {
  try {
    const { testResults } = req.body;

    if (!testResults) {
      res.status(400).json({
        success: false,
        error: 'testResults is required'
      } as ApiResponse);
      return;
    }

    const gemini = getGeminiService();
    const analysis = await gemini.analyzeTestResults(testResults);

    res.json({
      success: true,
      data: { analysis },
      message: 'Test results analyzed successfully'
    } as ApiResponse<{ analysis: string }>);

  } catch (error) {
    console.error('AI analysis error:', error);
    
    if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
      res.status(500).json({
        success: false,
        error: 'Gemini API configuration error',
        message: 'Please check your GEMINI_API_KEY environment variable'
      } as ApiResponse);
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to analyze test results',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse);
  }
});

/**
 * Gemini API設定状態の確認
 */
aiRoutes.get('/status', async (_req, res) => {
  try {
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    
    if (!hasApiKey) {
      res.json({
        success: true,
        data: {
          configured: false,
          message: 'Gemini API key is not configured'
        }
      } as ApiResponse);
      return;
    }

    // API接続テスト（簡易）
    try {
      getGeminiService();
      res.json({
        success: true,
        data: {
          configured: true,
          message: 'Gemini API is ready'
        }
      } as ApiResponse);
    } catch (error) {
      res.json({
        success: true,
        data: {
          configured: false,
          message: 'Gemini API configuration error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      } as ApiResponse);
    }

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status'
    } as ApiResponse);
  }
});

/**
 * プロンプトテンプレートの取得
 */
aiRoutes.get('/templates', async (_req, res) => {
  try {
    const templates = [
      {
        id: 'login-test',
        name: 'ログインテスト',
        description: 'ユーザーログイン機能の基本テスト',
        template: '{targetUrl}のログイン機能をテストしてください。正常なログインとエラーケースの両方を含めてください。'
      },
      {
        id: 'form-test',
        name: 'フォームテスト',
        description: 'フォーム入力とバリデーションのテスト',
        template: '{targetUrl}のフォーム機能をテストしてください。入力検証とサブミット処理を確認してください。'
      },
      {
        id: 'navigation-test',
        name: 'ナビゲーションテスト',
        description: 'サイト内ナビゲーションの確認',
        template: '{targetUrl}のナビゲーション機能をテストしてください。主要なページ間の遷移を確認してください。'
      },
      {
        id: 'search-test',
        name: '検索機能テスト',
        description: '検索機能とフィルタリングのテスト',
        template: '{targetUrl}の検索機能をテストしてください。検索結果の表示とフィルタリングを確認してください。'
      },
      {
        id: 'responsive-test',
        name: 'レスポンシブテスト',
        description: '異なる画面サイズでの表示確認',
        template: '{targetUrl}のレスポンシブデザインをテストしてください。モバイルとデスクトップでの表示を確認してください。'
      }
    ];

    res.json({
      success: true,
      data: templates
    } as ApiResponse);

  } catch (error) {
    console.error('Templates fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    } as ApiResponse);
  }
}); 