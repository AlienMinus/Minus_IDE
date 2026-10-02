import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  getRuntimesInfo,
  executeCode,
  executeCommand,
  streamCommand,
  resolveWorkspacePath,
  validatePath,
  readWorkspaceTree,
  pickNativeFolder
} from './server/sandboxEngine.js';
import { replManager } from './server/replEngine.js';

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

        const urlObj = new URL(req.url, 'http://localhost');
        const subPath = urlObj.pathname.replace(/^\/api\/sandbox/, '');

        if (subPath === '/status' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            status: 'online',
            message: 'Hyperion Sandbox Active',
            data: getRuntimesInfo()
          }));
        }

        if (subPath === '/repl/start' && req.method === 'POST') {
          const body = await parseBody();
          try {
            const session = await replManager.startSession(body);
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, data: session }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: err.message }));
          }
        }

        if (subPath === '/repl/eval' && req.method === 'POST') {
          const body = await parseBody();
          try {
            const result = await replManager.evalCode(body);
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, data: result }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: err.message }));
          }
        }

        if (subPath === '/repl/exit' && req.method === 'POST') {
          const body = await parseBody();
          try {
            const result = replManager.exitSession(body.sessionId);
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(result));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: err.message }));
          }
        }

        if (subPath === '/workspace/resolve' && req.method === 'POST') {
          const body = await parseBody();
          const resolvedPath = resolveWorkspacePath(body);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: !!resolvedPath, path: resolvedPath }));
        }

        if (subPath === '/workspace/validate' && req.method === 'GET') {
          const targetPath = urlObj.searchParams.get('path');
          const result = validatePath(targetPath);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(result));
        }

        if (subPath === '/workspace/tree' && req.method === 'POST') {
          const body = await parseBody();
          const tree = readWorkspaceTree(body.path, body.maxDepth || 3);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, tree }));
        }

        if (subPath === '/workspace/pick' && req.method === 'POST') {
          const selectedPath = await pickNativeFolder();
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: !!selectedPath, path: selectedPath }));
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
