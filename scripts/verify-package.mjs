import { spawn, spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = join(repositoryRoot, 'packages', 'turnlet');
const fixtureRoot = join(repositoryRoot, 'tests', 'consumer');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'turnlet-package-'));
const consumerRoot = join(temporaryRoot, 'consumer');
const previewUrl = 'http://127.0.0.1:4174';

function run(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${arguments_.join(' ')}`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  return result.stdout.trim();
}

async function waitForServer(process_) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (process_.exitCode !== null) {
      throw new Error(
        'The consumer preview server exited before becoming ready.',
      );
    }

    try {
      const response = await fetch(previewUrl);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }

  throw new Error('Timed out waiting for the consumer preview server.');
}

let previewProcess;
let browser;

try {
  const packageJson = JSON.parse(
    await readFile(join(packageRoot, 'package.json'), 'utf8'),
  );

  if (packageJson.dependencies !== undefined) {
    throw new Error('Turnlet must not declare runtime dependencies.');
  }

  if (
    packageJson.private ||
    !/^\d+\.\d+\.\d+$/.test(packageJson.version) ||
    packageJson.name !== 'turnlet' ||
    packageJson.license !== 'MIT' ||
    packageJson.publishConfig?.access !== 'public' ||
    packageJson.publishConfig?.registry !== 'https://registry.npmjs.org/'
  ) {
    throw new Error('Unexpected release package metadata.');
  }
  const rootLicense = await readFile(join(repositoryRoot, 'LICENSE'), 'utf8');
  if ((await readFile(join(packageRoot, 'LICENSE'), 'utf8')) !== rootLicense) {
    throw new Error('Package and repository licenses differ.');
  }

  const packOutput = run('npm', [
    'pack',
    '--workspace',
    'turnlet',
    '--pack-destination',
    temporaryRoot,
    '--json',
  ]);
  const [packed] = JSON.parse(packOutput);
  if (packed.version !== packageJson.version) {
    throw new Error('Packed version differs from the package manifest.');
  }
  const packedFiles = new Set(packed.files.map((file) => file.path));
  const requiredFiles = [
    'LICENSE',
    'README.md',
    'dist/index.d.ts',
    'dist/index.js',
    'package.json',
  ];

  for (const requiredFile of requiredFiles) {
    if (!packedFiles.has(requiredFile)) {
      throw new Error(`Packed artifact is missing ${requiredFile}.`);
    }
  }

  for (const file of packedFiles) {
    if (
      !file.startsWith('dist/') &&
      !['LICENSE', 'README.md', 'package.json'].includes(file)
    ) {
      throw new Error(`Packed artifact includes internal file ${file}.`);
    }
  }

  await cp(fixtureRoot, consumerRoot, { recursive: true });
  const tarballPath = join(temporaryRoot, packed.filename);
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath],
    { cwd: consumerRoot },
  );

  const installedReadme = await readFile(
    join(consumerRoot, 'node_modules', 'turnlet', 'README.md'),
    'utf8',
  );
  if (
    installedReadme !== (await readFile(join(packageRoot, 'README.md'), 'utf8'))
  ) {
    throw new Error('Packed README differs from the package README.');
  }

  const typescriptBin = join(
    repositoryRoot,
    'node_modules',
    'typescript',
    'bin',
    'tsc',
  );
  run(process.execPath, [typescriptBin, '-p', 'tsconfig.json'], {
    cwd: consumerRoot,
  });
  run(process.execPath, ['runtime.mjs'], { cwd: consumerRoot });

  const viteBin = join(
    repositoryRoot,
    'node_modules',
    'vite',
    'bin',
    'vite.js',
  );
  run(process.execPath, [viteBin, 'build'], { cwd: consumerRoot });

  previewProcess = spawn(
    process.execPath,
    [
      viteBin,
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      '4174',
      '--strictPort',
    ],
    { cwd: consumerRoot, stdio: 'ignore' },
  );
  await waitForServer(previewProcess);

  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(previewUrl);
  await page.waitForFunction(
    () =>
      globalThis.document.querySelector('#result')?.textContent !== 'waiting',
  );
  const browserResult = await page.locator('#result').textContent();

  if (browserResult !== '[2,4,6]') {
    throw new Error(`Unexpected browser consumer result: ${browserResult}`);
  }

  const compressedKiB = (packed.size / 1024).toFixed(2);
  const unpackedKiB = (packed.unpackedSize / 1024).toFixed(2);
  console.log(
    `Verified ${packed.filename}: ${compressedKiB} KiB packed, ${unpackedKiB} KiB unpacked.`,
  );
} finally {
  await browser?.close();
  previewProcess?.kill('SIGTERM');
  await rm(temporaryRoot, { recursive: true, force: true });
}
