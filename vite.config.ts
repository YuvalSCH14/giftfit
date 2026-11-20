import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Serves /api from server/index.ts during development, with an in-memory database. */
const devApi = (): Plugin => ({
  name: 'giftfit-dev-api',
  configureServer(server) {
    server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse) => {
      try {
        req.url = `/api${req.url ?? ''}`;
        const mod = await server.ssrLoadModule('/server/index.ts');
        await mod.default(req, res);
      } catch (error) {
        server.ssrFixStacktrace(error as Error);
        console.error(error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: { code: 'server_error', message: String(error) } }));
      }
    });
  },
});

export default defineConfig({
  base: './',
  plugins: [react(), devApi()],
  test: { include: ['test/**/*.test.ts'] },
});
