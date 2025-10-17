#!/usr/bin/env node

const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const imagemin = require('imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminSvgo = require('imagemin-svgo');
const imageminGifsicle = require('imagemin-gifsicle');
const fg = require('fast-glob');

function plugin(module) {
  return module.default ?? module;
}

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
  const runImagemin = imagemin.default ?? imagemin;

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
      const optimized = await runImagemin(
        supportedFiles.map((file) => path.join(SRC_DIR, file)),
        {
          destination: DEST_DIR,
          plugins: [
            plugin(imageminMozjpeg)({ quality: 80, progressive: true }),
            plugin(imageminPngquant)({ quality: [0.6, 0.8] }),
            plugin(imageminSvgo)({
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
            plugin(imageminGifsicle)({ optimizationLevel: 3 }),
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
  const finalCopied = copied;

  if (optimizedRelative.length === 0 && finalCopied.length === 0) {
    console.log('No images were processed.');
    return;
  }

  if (optimizedRelative.length > 0) {
    console.log(`Optimised ${optimizedRelative.length} image${optimizedRelative.length === 1 ? '' : 's'}.`);
  }

  if (finalCopied.length > 0) {
    console.log(`Copied ${finalCopied.length} asset${finalCopied.length === 1 ? '' : 's'} without optimisation.`);
  }
}

optimizeImages().catch((error) => {
  console.error(error);
  process.exit(1);
});
