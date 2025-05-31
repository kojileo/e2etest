#!/bin/bash

echo "🚀 E2Eテスト自動化システムのセットアップを開始します..."

# Node.jsバージョンチェック
node_version=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$node_version" ] || [ "$node_version" -lt 18 ]; then
    echo "❌ Node.js 18以上が必要です。現在のバージョン: $(node -v 2>/dev/null || echo 'インストールされていません')"
    exit 1
fi

echo "✅ Node.js バージョンチェック: $(node -v)"

# 依存関係インストール
echo "📦 依存関係をインストールしています..."
npm install

echo "📦 サーバー依存関係をインストールしています..."
cd server && npm install && cd ..

echo "📦 クライアント依存関係をインストールしています..."
cd client && npm install && cd ..

# Playwright MCPインストール
echo "🎭 Playwright MCPをインストールしています..."
npx @playwright/test install

# 環境変数ファイル設定
if [ ! -f "server/.env" ]; then
    echo "🔧 環境変数ファイルを作成しています..."
    cp server/env.example server/.env
    echo "⚠️  server/.env ファイルにGemini API キーを設定してください"
else
    echo "✅ 環境変数ファイルは既に存在します"
fi

# ディレクトリ作成
echo "📁 必要なディレクトリを作成しています..."
mkdir -p server/data
mkdir -p server/screenshots
mkdir -p server/logs

# TypeScriptコンパイルチェック
echo "🔍 TypeScript構文チェックを実行しています..."
cd server && npm run build || echo "⚠️  サーバーのビルドでエラーが発生しました"
cd ../client && npm run type-check || echo "⚠️  クライアントの型チェックでエラーが発生しました"
cd ..

echo ""
echo "🎉 セットアップが完了しました！"
echo ""
echo "次のステップ:"
echo "1. server/.env ファイルでGemini API キーを設定してください"
echo "   GEMINI_API_KEY=your_gemini_api_key_here"
echo ""
echo "2. 開発サーバーを起動してください:"
echo "   npm run dev"
echo ""
echo "3. ブラウザで http://localhost:3000 にアクセスしてください"
echo ""
echo "📚 詳細な情報は README.md および docs/IMPLEMENTATION.md をご覧ください" 