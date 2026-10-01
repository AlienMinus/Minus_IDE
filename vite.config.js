import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { getRuntimesInfo, executeCode, executeCommand, streamCommand } from './server/sandboxEngine.js';

function hyperionSandboxPlugin() {
  return {
    name: 'hyperion-sandbox-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/sandbox')) {
          return next();
        }

        const parseBody = () => new Promise((resolve) => {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); }
            catch { resolve({}); }
          });
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          return res.end();
        }

        const subPath = req.url.replace(/^\/api\/sandbox/, '').split('?')[0];

        if (subPath === '/status' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            status: 'online',
            message: 'Hyperion Sandbox Active',
            data: getRuntimesInfo()
          }));
        }

        if (subPath === '/run' && req.method === 'POST') {
          const body = await parseBody();
          const result = await executeCode(body);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(result));
        }

        if (subPath === '/command' && req.method === 'POST') {
          const body = await parseBody();
          const result = await executeCommand(body);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(result));
        }

        if (subPath === '/stream' && req.method === 'POST') {
          const body = await parseBody();
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          const runner = streamCommand({
            ...body,
            onChunk: (chunk) => {
              res.write(`data: ${JSON.stringify({ type: 'output', data: chunk })}\n\n`);
            },
            onExit: (code) => {
              res.write(`data: ${JSON.stringify({ type: 'exit', code })}\n\n`);
              res.end();
            }
          });

          req.on('close', () => {
            runner.kill();
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    hyperionSandboxPlugin()
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass(req) {
          // Keep /api/sandbox handled directly by sandbox middleware
          if (req.url.startsWith('/api/sandbox')) {
            return req.url;
          }
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react-resizable-panels']
  }
});
