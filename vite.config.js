import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Google Maps 短縮URL（maps.app.goo.gl 等）をサーバー側で展開するミドルウェアプラグイン
 */
function mapsResolverPlugin() {
  return {
    name: 'maps-resolver-plugin',
    configureServer(server) {
      server.middlewares.use('/api/resolve-maps-url', async (req, res) => {
        try {
          const urlObj = new URL(req.url, 'http://localhost');
          const targetUrl = urlObj.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
          }

          // リダイレクトを追跡して最終URLを取得
          const response = await fetch(targetUrl, {
            redirect: 'follow',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'ja-JP,ja;q=0.9',
            },
          });

          const finalUrl = response.url;
          const htmlText = await response.text();

          // HTMLタイトルからスポット名を抽出
          let title = '';
          const titleMatch = htmlText.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) {
            title = titleMatch[1]
              .replace(/\s*-\s*Google\s*マップ.*/i, '')
              .replace(/\s*-\s*Google\s*Maps.*/i, '')
              .trim();
          }

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ finalUrl, title }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mapsResolverPlugin()],
  server: {
    port: 5173,
    host: true, // localhost, 127.0.0.1 の両方でアクセス可能にする
    open: false,
    proxy: {
      '/api/rakuten': {
        target: 'https://openapi.rakuten.co.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rakuten/, ''),
        headers: {
          Referer: 'http://localhost:5173/',
          Origin: 'http://localhost:5173',
        },
      },
      '/api/osm': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/osm/, ''),
        headers: {
          'User-Agent': 'TabitomoTravelApp/1.0 (contact: support@tabitomo.local)',
        },
      },
      '/api/hotpepper': {
        target: 'https://webservice.recruit.co.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hotpepper/, ''),
      },
    },
  },
  // dist は npm の prebuild で削除する（日本語パス環境で emptyOutDir がクラッシュするため）
  build: { emptyOutDir: false },
});
