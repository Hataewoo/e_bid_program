import { downloadArtifact } from '@electron/get';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

async function main() {
  const require = createRequire(import.meta.url);
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(__dirname, '..');
  const electronDir = path.join(root, 'node_modules', 'electron');
  const { version } = require(path.join(electronDir, 'package.json'));
  const checksums = require(path.join(electronDir, 'checksums.json'));
  const distPath = path.join(electronDir, 'dist');
  const exePath = path.join(distPath, 'electron.exe');
  const pathFile = path.join(electronDir, 'path.txt');

  if (fs.existsSync(pathFile) && fs.existsSync(exePath)) {
    console.log('Electron already installed:', exePath);
    return;
  }

  console.log(`Installing Electron ${version} for win32-x64...`);

  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    platform: 'win32',
    arch: 'x64',
    checksums,
    force: false,
  });

  console.log('Downloaded:', zipPath);

  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  fs.mkdirSync(distPath, { recursive: true });

  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${distPath.replace(/'/g, "''")}' -Force"`,
      { stdio: 'inherit' },
    );
  } else {
    const { default: extract } = await import('extract-zip');
    await extract(zipPath, { dir: distPath });
  }

  await fs.promises.writeFile(pathFile, 'electron.exe', 'utf8');

  if (!fs.existsSync(exePath)) {
    console.error('electron.exe not found after extract');
    process.exit(1);
  }

  console.log('Electron installed:', exePath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
