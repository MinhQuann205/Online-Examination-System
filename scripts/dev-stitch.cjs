const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
async function checkPort(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () =>
      reject(
        new Error(
          'Port ' +
            port +
            ' is occupied. Stop the previous ExamSpace terminal before starting Stitch UI.',
        ),
      ),
    );
    server.listen(port, () => server.close(resolve));
  });
}
async function main() {
  for (const file of [
    'apps/web/src/components/teacher/teacher-dashboard.tsx',
    'apps/web/src/components/student/student-dashboard.tsx',
    '.env',
  ]) {
    if (!fs.existsSync(path.join(root, file)))
      throw new Error('Missing ' + file + ' in Stitch worktree: ' + root);
  }
  await checkPort(3000);
  const webOnly = process.argv.includes('--web-only');
  if (!webOnly) {
    const { createRequire } = require('node:module');
    const requireApi = createRequire(path.join(root, 'apps/api/package.json'));
    const config = requireApi('dotenv').parse(
      fs.readFileSync(path.join(root, '.env')),
    );
    try {
      await checkPort(Number(config.API_PORT || 4000));
    } catch {
      throw new Error(
        'API port is occupied. If the existing API is correct, use corepack pnpm dev:stitch:web; otherwise stop the previous API terminal.',
      );
    }
  }
  console.log('ExamSpace STITCH UI | ' + root + ' | http://localhost:3000');
  // Use this worktree's env; the existing dev script generates the client and shared build only.
  const command = webOnly
    ? 'corepack pnpm dev:prepare && corepack pnpm --filter @exam/web dev --port 3000'
    : 'corepack pnpm dev';
  const child = spawn(command, {
    cwd: root,
    shell: true,
    stdio: 'inherit',
    windowsHide: true,
  });
  child.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
  child.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
