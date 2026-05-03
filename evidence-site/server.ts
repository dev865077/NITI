import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const port = Number(process.env.PORT ?? 4174);

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function resolveTarget(pathname: string): string {
  const cleanPath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  if (cleanPath.startsWith('/docs/') || cleanPath.startsWith('/testnet/') || cleanPath.startsWith('/cdlc-lean/')) {
    return join(repoRoot, cleanPath);
  }
  return join(root, cleanPath === '/' ? 'index.html' : cleanPath);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  const filePath = resolveTarget(url.pathname);
  const target = existsSync(filePath) ? filePath : join(root, 'index.html');
  response.setHeader('content-type', mime[extname(target)] ?? 'application/octet-stream');
  response.setHeader('cache-control', 'no-store');
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(target)
    .on('error', () => {
      response.statusCode = 404;
      response.end('not found');
    })
    .pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`NITI evidence site running at http://127.0.0.1:${port}`);
});
