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

export default async function handler(req, res) {
  try {
    const parsed = new URL(req.url, `https://${req.headers.host}`);
    const targetUrl = parsed.searchParams.get('url');

    if (!targetUrl) {
      res.status(400).send('Missing url parameter');
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
      res.send(Buffer.from(await resp.arrayBuffer()));
      return;
    }

    let html = await resp.text();
    const origin = new URL(targetUrl).origin;
    const originId = Buffer.from(origin).toString('base64url');
    html = rewriteHtml(html, origin, originId);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[proxy] Error:', err);
    res.status(502).send('Proxy error: ' + String(err));
  }
}
