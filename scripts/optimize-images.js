#!/usr/bin/env node

const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const fg = require('fast-glob');

const SRC_DIR = path.resolve(__dirname, '..', 'src', 'images');
const DEST_DIR = path.resolve(__dirname, '..', 'public', 'images');

async function ensureDirectory(directory) {
  await fsp.mkdir(directory, { recursive: true });
}

async function copyUnoptimizedFiles(files, destination) {
  if (files.length === 0) {
    return [];
  }

  await Promise.all(
    files.map(async (relativeFile) => {
      const sourcePath = path.join(SRC_DIR, relativeFile);
      const destPath = path.join(destination, relativeFile);
      await ensureDirectory(path.dirname(destPath));
      await fsp.copyFile(sourcePath, destPath);
    })
  );

  return files;
}

async function optimizeImages() {
  if (!fs.existsSync(SRC_DIR)) {
    console.log('No source images found. Skipping optimisation.');
    return;
  }

  await fsp.rm(DEST_DIR, { recursive: true, force: true });
  await ensureDirectory(DEST_DIR);

  const supportedExtensions = ['jpg', 'jpeg', 'png', 'svg', 'gif'];

  const allSourceFiles = await fg('**/*', {
    cwd: SRC_DIR,
    dot: false,
    onlyFiles: true,
    caseSensitiveMatch: false,
    ignore: ['**/.gitkeep'],
  });

  let optimizedRelative = [];

  const supportedFiles = allSourceFiles.filter((relativePath) => {
    const extension = path.extname(relativePath).slice(1).toLowerCase();
    return supportedExtensions.includes(extension);
  });

  if (supportedFiles.length > 0) {
    try {
      const imagemin = (await import('imagemin')).default;
      const imageminMozjpeg = (await import('imagemin-mozjpeg')).default;
      const imageminPngquant = (await import('imagemin-pngquant')).default;
      const imageminSvgo = (await import('imagemin-svgo')).default;
      const imageminGifsicle = (await import('imagemin-gifsicle')).default;

      const optimized = await imagemin(
        supportedFiles.map((file) => path.join(SRC_DIR, file)),
        {
          destination: DEST_DIR,
          plugins: [
            imageminMozjpeg({ quality: 80, progressive: true }),
            imageminPngquant({ quality: [0.6, 0.8] }),
            imageminSvgo({
              plugins: [
                {
                  name: 'preset-default',
                  params: {
                    overrides: {
                      removeViewBox: false,
                    },
                  },
                },
              ],
            }),
            imageminGifsicle({ optimizationLevel: 3 }),
          ],
        }
      );

      optimizedRelative = optimized.map((file) =>
        path.relative(DEST_DIR, file.destinationPath).replace(/\\/g, '/')
      );
    } catch (error) {
      console.error('Failed to optimise supported images. Copying originals instead.');
      console.error(error.message);
    }
  }

  const optimizedSet = new Set(optimizedRelative);
  const filesToCopy = allSourceFiles.filter(
    (file) => !optimizedSet.has(file.replace(/\\/g, '/'))
  );
  const copied = await copyUnoptimizedFiles(filesToCopy, DEST_DIR);

  if (optimizedRelative.length === 0 && copied.length === 0) {
    console.log('No images were processed.');
    return;
  }

  if (optimizedRelative.length > 0) {
    console.log(`Optimised ${optimizedRelative.length} image${optimizedRelative.length === 1 ? '' : 's'}.`);
  }

  if (copied.length > 0) {
    console.log(`Copied ${copied.length} asset${copied.length === 1 ? '' : 's'} without optimisation.`);
  }
}

optimizeImages().catch((error) => {
  console.error(error);
  process.exit(1);
});
