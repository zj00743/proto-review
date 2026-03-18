import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function prototypeProxy(): Plugin {
  function getBridgeCode(): string {
    return readFileSync(resolve(__dirname, 'public/bridge.js'), 'utf-8');
  }

  function rewriteHtml(html: string, origin: string, originId: string): string {
    const proxyBase = `/api/proto/${originId}`;

    // 1. Remove existing <base> tags
    html = html.replace(/<base[^>]*>/gi, '');

    // 2. Rewrite absolute-path URLs in src, href, action attributes: /path → /api/proto/ID/path
    html = html.replace(
      /((?:src|href|action)\s*=\s*["'])(\/{1}(?!\/)[^"']*)/gi,
      `$1${proxyBase}$2`,
    );

    // 3. Rewrite full URLs that reference the prototype's own origin
    html = html.replace(new RegExp(escapeRegExp(origin), 'g'), proxyBase);

    // 4. Add our proxy-aware <base> tag (AFTER rewriting so it doesn't get doubled)
    const baseTag = `<base href="${proxyBase}/">`;
    html = /<head[^>]*>/i.test(html)
      ? html.replace(/<head[^>]*>/i, '$&\n' + baseTag)
      : baseTag + '\n' + html;

    // 5. Inline html2canvas + bridge script
    const h2cCode = readFileSync(resolve(__dirname, 'public/html2canvas.min.js'), 'utf-8');
    const h2cTag = `<script data-pp-h2c>${h2cCode}</${'script'}>`;
    const bridgeTag = `<script data-pp-bridge>\n${getBridgeCode()}\n</${'script'}>`;
    const injected = h2cTag + '\n' + bridgeTag;
    html = /<\/body>/i.test(html)
      ? html.replace(/<\/body>/i, injected + '\n$&')
      : html + '\n' + injected;

    return html;
  }

  function rewriteCss(css: string, origin: string, originId: string): string {
    const proxyBase = `/api/proto/${originId}`;

    // url(/path) → url(/api/proto/ID/path)
    css = css.replace(
      /url\(\s*(["']?)\/([^"')]+)\1\s*\)/g,
      `url($1${proxyBase}/$2$1)`,
    );

    // @import "/path" → @import "/api/proto/ID/path"
    css = css.replace(
      /@import\s+(["'])\/([^"']+)\1/g,
      `@import $1${proxyBase}/$2$1`,
    );

    // Full origin URLs
    css = css.replace(new RegExp(escapeRegExp(origin), 'g'), proxyBase);

    return css;
  }

  return {
    name: 'prototype-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          // ─── Entry point: /api/proxy?url=FULL_URL ───
          if (req.url?.startsWith('/api/proxy')) {
            const parsed = new URL(req.url, 'http://localhost');
            const targetUrl = parsed.searchParams.get('url');
            if (!targetUrl) {
              res.statusCode = 400;
              res.end('Missing url parameter');
              return;
            }

            const resp = await fetch(targetUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                Accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
            });

            const contentType = resp.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
              res.setHeader('Content-Type', contentType);
              res.end(Buffer.from(await resp.arrayBuffer()));
              return;
            }

            let html = await resp.text();
            const origin = new URL(targetUrl).origin;
            const originId = Buffer.from(origin).toString('base64url');
            html = rewriteHtml(html, origin, originId);

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
            return;
          }

          // ─── Asset/sub-resource proxy: /api/proto/:originId/path ───
          const protoMatch = req.url?.match(
            /^\/api\/proto\/([A-Za-z0-9_-]+)(\/.*)?$/,
          );
          if (protoMatch) {
            const originId = protoMatch[1];
            const pathAndQuery = protoMatch[2] || '/';

            let origin: string;
            try {
              origin = Buffer.from(originId, 'base64url').toString();
            } catch {
              res.statusCode = 400;
              res.end('Invalid origin encoding');
              return;
            }

            const targetUrl = origin + pathAndQuery;
            const resp = await fetch(targetUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                Accept: req.headers.accept || '*/*',
                'Accept-Encoding': 'identity',
              },
              redirect: 'follow',
            });

            if (!resp.ok) {
              res.statusCode = resp.status;
              res.end(await resp.text());
              return;
            }

            const contentType =
              resp.headers.get('content-type') || 'application/octet-stream';

            // HTML (iframe internal navigation) → full rewrite + bridge
            if (contentType.includes('text/html')) {
              let html = await resp.text();
              html = rewriteHtml(html, origin, originId);
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(html);
              return;
            }

            // CSS → rewrite url() / @import paths
            if (contentType.includes('text/css')) {
              let css = await resp.text();
              css = rewriteCss(css, origin, originId);
              res.setHeader('Content-Type', contentType);
              res.end(css);
              return;
            }

            // Everything else (JS, images, fonts, JSON, etc.) → pass through
            res.setHeader('Content-Type', contentType);
            const cc = resp.headers.get('cache-control');
            if (cc) res.setHeader('Cache-Control', cc);
            res.end(Buffer.from(await resp.arrayBuffer()));
            return;
          }

          next();
        } catch (err) {
          console.error('[prototype-proxy] Error:', err);
          if (!res.headersSent) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Proxy error: ' + String(err));
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), prototypeProxy()],
});
