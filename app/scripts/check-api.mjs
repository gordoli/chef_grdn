import ts from 'typescript';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// Run emitted functions in native Node ESM, matching Vercel rather than Vite's resolver.
const project = fileURLToPath(new URL('../', import.meta.url));
const output = await mkdtemp(path.join(project, 'node_modules/.cache-chef-api-'));
let server;
try {
  const program = ts.createProgram(['api/import.ts', 'api/import-image.ts'], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    outDir: output,
    rootDir: project,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => project,
        getNewLine: () => '\n',
      }),
    );
  program.emit();
  await writeFile(path.join(output, 'package.json'), '{"type":"module"}');
  const handlers = new Map();
  for (const route of ['import', 'import-image']) {
    const module = await import(pathToFileURL(path.join(output, 'api', `${route}.js`)).href);
    handlers.set(`/api/${route}`, module.default);
  }
  server = createServer((request, response) => {
    const handler = handlers.get(request.url);
    if (!handler) {
      response.statusCode = 404;
      response.end();
      return;
    }
    handler(request, response).catch((error) => {
      response.statusCode = 500;
      response.end(error.message);
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('API test server did not bind.');
  for (const route of handlers.keys()) {
    const response = await fetch(`http://127.0.0.1:${address.port}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const body = await response.json();
    if (response.status !== 401 || !body.error)
      throw new Error(`${route}: expected JSON 401, received ${response.status}`);
    console.log(`${route}: native Node ESM loads and denies unauthenticated requests (401)`);
  }
} finally {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await rm(output, { recursive: true, force: true });
}
