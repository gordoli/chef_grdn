import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
function importApi(): Plugin {
  return {
    name: 'local-recipe-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/import' && path !== '/api/import-image') {
          next();
          return;
        }
        try {
          const chunks: Buffer[] = [];
          let length = 0;
          for await (const chunk of req) {
            length += Buffer.byteLength(chunk);
            if (length > 8192) {
              res.statusCode = 413;
              res.end('Request too large');
              return;
            }
            chunks.push(Buffer.from(chunk));
          }
          const { handleImport } = await import('./server/import.ts');
          const { handleImportImage } = await import('./server/image.ts');
          const { authenticateOwner } = await import('./server/auth.ts');
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
          }
          const request = new Request(`http://localhost${path}`, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method ?? 'GET')
              ? undefined
              : Buffer.concat(chunks).toString(),
          });
          const auth = await authenticateOwner(request);
          const response =
            auth.error ??
            (await (path === '/api/import-image' ? handleImportImage : handleImport)(
              request,
              fetch,
              auth.userId,
            ));
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Import failed' }),
          );
        }
      });
    },
  };
}
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [
      {
        name: 'social-metadata',
        transformIndexHtml(html) {
          const configured =
            process.env.VITE_SITE_URL ||
            (process.env.VERCEL_PROJECT_PRODUCTION_URL
              ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
              : 'http://localhost:5173');
          const origin = new URL(configured).origin;
          return html.replaceAll('__PUBLIC_ORIGIN__', origin);
        },
      },
      react(),
      tailwindcss(),
      importApi(),
      VitePWA({
        registerType: 'prompt',
        manifest: {
          name: 'Chef GRDN',
          short_name: 'GRDN',
          description: 'Your personal recipe book',
          theme_color: '#e9eddb',
          background_color: '#fafaf7',
          display: 'standalone',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,woff2}'],
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [],
        },
      }),
    ],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
              { name: 'validation', test: /node_modules[\\/]zod[\\/]/ },
            ],
          },
        },
      },
    },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, strictPort: true },
  };
});
