import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBridgeCode() {
  return readFileSync(resolve(__dirname, '../public/bridge.js'), 'utf-8');
}

function getH2cCode() {
  return readFileSync(resolve(__dirname, '../public/html2canvas.min.js'), 'utf-8');
}

function rewriteHtml(html, origin, originId) {
  const proxyBase = `/api/proto/${originId}`;

  html = html.replace(/<base[^>]*>/gi, '');

  html = html.replace(
    /((?:src|href|action)\s*=\s*["'])(\/{1}(?!\/)[^"']*)/gi,
    `$1${proxyBase}$2`,
  );

  html = html.replace(new RegExp(escapeRegExp(origin), 'g'), proxyBase);

  const baseTag = `<base href="${proxyBase}/">`;
  html = /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, '$&\n' + baseTag)
    : baseTag + '\n' + html;

  const h2cTag = `<script data-pp-h2c>${getH2cCode()}</script>`;
  const bridgeTag = `<script data-pp-bridge>\n${getBridgeCode()}\n</script>`;
  const injected = h2cTag + '\n' + bridgeTag;
  html = /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, injected + '\n$&')
    : html + '\n' + injected;

  return html;
}

function rewriteCss(css, origin, originId) {
  const proxyBase = `/api/proto/${originId}`;

  css = css.replace(
    /url\(\s*(["']?)\/([^"')]+)\1\s*\)/g,
    `url($1${proxyBase}/$2$1)`,
  );

  css = css.replace(
    /@import\s+(["'])\/([^"']+)\1/g,
    `@import $1${proxyBase}/$2$1`,
  );

  css = css.replace(new RegExp(escapeRegExp(origin), 'g'), proxyBase);

  return css;
}

export default async function handler(req, res) {
  try {
    const match = req.url.match(/^\/api\/proto\/([A-Za-z0-9_-]+)(\/.*)?$/);
    if (!match) {
      res.status(400).send('Invalid proto path');
      return;
    }

    const originId = match[1];
    const pathAndQuery = match[2] || '/';

    let origin;
    try {
      origin = Buffer.from(originId, 'base64url').toString();
    } catch {
      res.status(400).send('Invalid origin encoding');
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
      res.status(resp.status).send(await resp.text());
      return;
    }

    const contentType =
      resp.headers.get('content-type') || 'application/octet-stream';

    if (contentType.includes('text/html')) {
      let html = await resp.text();
      html = rewriteHtml(html, origin, originId);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      return;
    }

    if (contentType.includes('text/css')) {
      let css = await resp.text();
      css = rewriteCss(css, origin, originId);
      res.setHeader('Content-Type', contentType);
      res.send(css);
      return;
    }

    res.setHeader('Content-Type', contentType);
    const cc = resp.headers.get('cache-control');
    if (cc) res.setHeader('Cache-Control', cc);
    res.send(Buffer.from(await resp.arrayBuffer()));
  } catch (err) {
    console.error('[proto] Error:', err);
    res.status(502).send('Proxy error: ' + String(err));
  }
}
