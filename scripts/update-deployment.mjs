import { promises as fs } from 'fs';
import path from 'path';

const root = process.cwd();
const buildDir = path.join(root, 'build');
const buildAssetsDir = path.join(buildDir, 'assets');
const finalDeploymentDir = path.join(root, 'final-deployment');
const finalAssetsDir = path.join(finalDeploymentDir, 'assets');

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
}

async function emptyDir(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await emptyDir(fullPath);
        await fs.rmdir(fullPath);
      } else {
        await fs.unlink(fullPath);
      }
    }));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

async function copyDir(src, dest) {
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }));
}

async function main() {
  // Verify build exists
  try {
    await fs.access(buildDir);
    await fs.access(buildAssetsDir);
  } catch (err) {
    console.error('Build folder not found. Run `npm run build` first.');
    process.exit(1);
  }

  // Ensure final-deployment exists and preserve API folder
  await ensureDir(finalDeploymentDir);
  await ensureDir(finalAssetsDir);

  // Copy index.html
  const srcIndex = path.join(buildDir, 'index.html');
  const destIndex = path.join(finalDeploymentDir, 'index.html');
  await fs.copyFile(srcIndex, destIndex);
  console.log('Updated final-deployment/index.html');

  // Replace assets folder with fresh build assets
  await emptyDir(finalAssetsDir);
  await copyDir(buildAssetsDir, finalAssetsDir);
  console.log('Synced final-deployment/assets with build/assets');

  console.log('Deployment files updated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});