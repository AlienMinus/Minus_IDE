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
  pickNativeFolder,
  getActivePorts,
  lintCode
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

        if (subPath === '/preview-proxy' && req.method === 'GET') {
          const targetUrl = urlObj.searchParams.get('url') || 'http://localhost:5174';
          try {
            let cleanUrl = targetUrl.trim();
            if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
              cleanUrl = 'http://' + cleanUrl;
            }
            const parsedTarget = new URL(cleanUrl);
            const targetOrigin = parsedTarget.origin;

            const fetchRes = await fetch(cleanUrl, {
              headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': req.headers['user-agent'] || 'HyperionIDE-Preview'
              }
            });

            if (!fetchRes.ok) {
              res.statusCode = fetchRes.status;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              return res.end(`<h3>Preview Proxy Error: Dev server returned status ${fetchRes.status}</h3>`);
            }

            let html = await fetchRes.text();

            // 1. Inject <base href="..."> and synchronous route normalizer in memory
            const targetRoute = (parsedTarget.pathname || '/') + (parsedTarget.search || '') + (parsedTarget.hash || '');
            const headInjections = `
  <base href="${targetOrigin}/">
  <!-- Hyperion IDE Client-Side Route Normalizer (Prevents 404 in BrowserRouter on load/refresh) -->
  <script>
    (function() {
      try {
        var expectedPath = ${JSON.stringify(targetRoute || '/')};
        if (window.location.pathname.startsWith('/api/sandbox/preview-proxy')) {
          window.history.replaceState(null, '', expectedPath);
        }
      } catch (err) {}
    })();
  </script>`;

            if (html.includes('<head>')) {
              html = html.replace('<head>', `<head>\n${headInjections}`);
            } else if (html.includes('<html>')) {
              html = html.replace('<html>', `<html>\n<head>${headInjections}</head>`);
            } else {
              html = `${headInjections}\n${html}`;
            }

            // 2. Inject Hyperion Selenium In-Memory Automation Bridge right before </body>
            const bridgeScript = `
    <!-- Hyperion IDE In-Memory Automation Bridge (Zero files modified on disk) -->
    <script>
      (function() {
        if (window.__hyperion_bridge_active__) return;
        window.__hyperion_bridge_active__ = true;

        function notifyLocation() {
          try {
            var currentPath = window.location.pathname + window.location.search + window.location.hash;
            var fullDevUrl = ${JSON.stringify(targetOrigin)} + (currentPath.startsWith('/') ? currentPath : '/' + currentPath);
            window.parent.postMessage({
              source: 'hyperion-preview',
              type: 'LOCATION_CHANGE',
              url: fullDevUrl,
              pathname: currentPath,
              title: document.title
            }, '*');
          } catch(e) {}
        }

        var origPush = history.pushState;
        history.pushState = function() {
          var res = origPush.apply(this, arguments);
          notifyLocation();
          return res;
        };
        var origReplace = history.replaceState;
        history.replaceState = function() {
          var res = origReplace.apply(this, arguments);
          notifyLocation();
          return res;
        };
        window.addEventListener('popstate', notifyLocation);

        function resolveEl(sel) {
          if (!sel || typeof sel !== 'string') return null;
          try {
            if (sel.startsWith('text:') || sel.startsWith('text=')) {
              const textVal = sel.replace(/^text[:=]\\s*/, '').toLowerCase();
              const all = Array.from(document.querySelectorAll('a, button, span, h1, h2, h3, p, label, li, [role="button"]'));
              for (const el of all) {
                if ((el.innerText || el.textContent || '').trim().toLowerCase() === textVal) return el;
              }
              for (const el of all) {
                if ((el.innerText || el.textContent || '').toLowerCase().includes(textVal)) return el;
              }
              return null;
            }
            if (sel.startsWith('//') || sel.startsWith('(//')) {
              return document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            }
            return document.querySelector(sel);
          } catch (e) { return null; }
        }

        window.addEventListener('message', function(e) {
          if (!e.data || e.data.source !== 'hyperion-selenium') return;
          const { action, selector, value, reqId } = e.data;

          try {
            if (action === 'PING') {
              window.parent.postMessage({ source: 'hyperion-preview', type: 'PONG', url: window.location.href, title: document.title, ready: true }, '*');
              return;
            }

            if (action === 'DUMP_DOM') {
              const items = Array.from(document.querySelectorAll('a, button, input, textarea, select, h1, h2, h3, img, [role="button"]')).map(el => {
                const r = el.getBoundingClientRect();
                return {
                  tagName: el.tagName.toLowerCase(),
                  id: el.id || '',
                  className: el.className || '',
                  text: (el.innerText || el.textContent || '').trim().slice(0, 60),
                  rect: { left: r.left, top: r.top, width: r.width, height: r.height }
                };
              });
              window.parent.postMessage({ source: 'hyperion-preview', reqId, success: true, elements: items }, '*');
              return;
            }

            if (action === 'GET_RECT') {
              const el = resolveEl(selector);
              if (!el) {
                window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: 'Element not found' }, '*');
                return;
              }
              const r = el.getBoundingClientRect();
              window.parent.postMessage({
                source: 'hyperion-preview',
                reqId,
                success: true,
                tagName: el.tagName.toLowerCase(),
                innerText: (el.innerText || el.textContent || '').trim().slice(0, 50),
                rect: { left: r.left, top: r.top, width: r.width, height: r.height }
              }, '*');
              return;
            }

            if (action === 'CLICK') {
              const el = resolveEl(selector);
              if (!el) {
                window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: 'Element not found' }, '*');
                return;
              }
              try { el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' }); } catch {}
              const r = el.getBoundingClientRect();
              el.focus?.();
              el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
              el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
              el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, buttons: 1 }));
              el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              el.click?.();
              window.parent.postMessage({
                source: 'hyperion-preview',
                reqId,
                success: true,
                tagName: el.tagName.toLowerCase(),
                rect: { left: r.left, top: r.top, width: r.width, height: r.height }
              }, '*');
              return;
            }

            if (action === 'TYPE') {
              const el = resolveEl(selector);
              if (!el) {
                window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: 'Element not found' }, '*');
                return;
              }
              try { el.scrollIntoView({ behavior: 'auto', block: 'nearest' }); } catch {}
              const r = el.getBoundingClientRect();
              el.focus?.();
              el.value = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              window.parent.postMessage({
                source: 'hyperion-preview',
                reqId,
                success: true,
                rect: { left: r.left, top: r.top, width: r.width, height: r.height }
              }, '*');
              return;
            }
          } catch (err) {
            window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: err.message }, '*');
          }
        });

        window.parent.postMessage({ source: 'hyperion-preview', type: 'BRIDGE_READY', url: window.location.href, title: document.title }, '*');
      })();
    </script>
`;

            if (html.includes('</body>')) {
              html = html.replace('</body>', `${bridgeScript}\n</body>`);
            } else {
              html += bridgeScript;
            }

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.end(html);
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.end(`<h3>Proxy Error: ${err.message}</h3>`);
          }
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

        if (subPath === '/ports' && req.method === 'GET') {
          const ports = getActivePorts();
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, ports }));
        }

        if (subPath === '/lint' && req.method === 'POST') {
          const body = await parseBody();
          const result = lintCode(body);
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
