const path = require('path');
const fs = require('fs-extra');
const fg = require('fast-glob');
const crypto = require('crypto');
const ttf2woff2 = require('ttf2woff2').default;

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src', 'fonts');
const DEST_DIR = path.join(ROOT_DIR, 'public', 'fonts');

async function loadFontFiles() {
  return fg(['**/*.{ttf,otf,woff,woff2}'], {
    cwd: SRC_DIR,
    onlyFiles: true
  });
}

function hashBuffer(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

function normalizeName(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path
    .basename(filePath, ext)
    .replace(/\s+\(\d+\)$/g, '');

  if (ext === '.ttf' || ext === '.otf') {
    return `${base}.woff2`;
  }

  return `${base}${ext}`;
}

async function convertFont(filePath) {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.ttf' || ext === '.otf') {
    const converted = ttf2woff2(buffer);
    return {
      buffer: Buffer.from(converted)
    };
  }

  return {
    buffer
  };
}

async function buildFonts() {
  await fs.ensureDir(DEST_DIR);
  await fs.emptyDir(DEST_DIR);

  const seen = new Set();
  const files = (await loadFontFiles()).sort((a, b) => {
    const priority = (file) => {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.woff2') return 0;
      if (ext === '.woff') return 1;
      if (ext === '.ttf') return 2;
      if (ext === '.otf') return 3;
      return 4;
    };

    return priority(a) - priority(b);
  });

  if (!files.length) {
    console.warn('No fonts found to process.');
    return;
  }

  for (const relative of files) {
    const absolute = path.join(SRC_DIR, relative);
    const targetName = normalizeName(relative);

    if (seen.has(targetName)) {
      continue;
    }

    const { buffer } = await convertFont(absolute);
    const digest = hashBuffer(buffer);

    if (seen.has(digest)) {
      continue;
    }

    const destination = path.join(DEST_DIR, targetName);
    await fs.writeFile(destination, buffer);
    console.log(`Saved ${targetName}`);
    seen.add(digest);
    seen.add(targetName);
  }
}

buildFonts()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
