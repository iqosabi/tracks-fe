import { defineConfig, loadEnv, type Plugin } from 'vite';
import { normalizeApiBase, cartoKeySchema } from './src/core/config/runtime.ts';

function runtimeConfig(config: { apiBaseUrl: string; cartoApiKey: string }): Plugin {
  const source = `window.TRACKS_PUBLIC_CONFIG = ${JSON.stringify(config)};\n`;
  return {
    name: 'public-runtime-config',
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [{ tag: 'script', attrs: { src: '/runtime-config.js' }, injectTo: 'head-prepend' }];
      },
    },
    configureServer(server) {
      server.middlewares.use('/runtime-config.js', (_request, response) => {
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.end(source);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'runtime-config.js', source });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = normalizeApiBase(
    env.API_BASE_URL || 'https://tracksmon-dev-api.aestaworks.com/api/v1',
  );
  if (env.CARTO_API_KEY && !cartoKeySchema.safeParse(env.CARTO_API_KEY).success)
    throw new Error('CARTO_API_KEY tidak valid.');
  return {
    plugins: [
      runtimeConfig({
        apiBaseUrl: apiBase,
        cartoApiKey: env.CARTO_API_KEY || '',
      }),
    ],
    server: { host: '0.0.0.0', port: 5173, strictPort: true },
    preview: { host: '0.0.0.0', port: 4173, strictPort: true },
    build: { target: 'es2022', sourcemap: false, assetsInlineLimit: 0 },
  };
});
