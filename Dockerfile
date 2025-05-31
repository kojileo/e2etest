# マルチステージビルド
FROM node:18-alpine AS base

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係をコピーしてインストール
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# 依存関係をインストール
RUN npm ci && \
    cd server && npm ci && \
    cd ../client && npm ci

# Playwright MCPをインストール
RUN npx @playwright/test install

# ソースコードをコピー
COPY . .

# フロントエンドビルド
FROM base AS client-builder
WORKDIR /app/client
RUN npm run build

# バックエンドビルド
FROM base AS server-builder
WORKDIR /app/server
RUN npm run build

# 本番環境用の最終イメージ
FROM node:18-alpine AS production

# セキュリティのためのユーザー作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 作業ディレクトリを設定
WORKDIR /app

# 本番依存関係をインストール
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production && npm cache clean --force

# Playwright MCPをインストール
RUN npx @playwright/test install

# ビルド済みファイルをコピー
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=client-builder /app/client/dist ./client/dist
COPY --from=base /app/shared ./shared

# データディレクトリを作成
RUN mkdir -p /app/data /app/screenshots && \
    chown -R nextjs:nodejs /app

# ユーザーを切り替え
USER nextjs

# ポートを公開
EXPOSE 5000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# アプリケーションを開始
CMD ["node", "server/dist/index.js"] 