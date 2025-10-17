const path = require('path');
const fs = require('fs-extra');
const ejs = require('ejs');
const fg = require('fast-glob');
const { minify } = require('html-minifier-terser');

const ROOT_DIR = path.join(__dirname, '..');
const VIEWS_DIR = path.join(ROOT_DIR, 'views');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const CRITICAL_CSS_PATH = path.join(PUBLIC_DIR, 'css', 'critical.css');

const BASE_DATA = { title: 'The White Hart' };

const PAGE_DATA = {
  'index.ejs': {},
  '404.ejs': { title: 'Not Found' }
};

const MINIFY_OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeEmptyAttributes: true,
  keepClosingSlash: true,
  minifyCSS: true,
  minifyJS: true
};

async function loadCriticalCss() {
  try {
    return await fs.readFile(CRITICAL_CSS_PATH, 'utf8');
  } catch (error) {
    return '';
  }
}

async function getTemplates() {
  return fg('**/*.ejs', {
    cwd: VIEWS_DIR,
    ignore: ['partials/**'],
    onlyFiles: true
  });
}

async function compileTemplate(file, criticalCss) {
  const templatePath = path.join(VIEWS_DIR, file);
  const html = await ejs.renderFile(
    templatePath,
    {
      criticalCss,
      ...BASE_DATA,
      ...(PAGE_DATA[file] || {})
    },
    { filename: templatePath }
  );

  const minified = await minify(html, MINIFY_OPTIONS);
  const outputPath = path.join(PUBLIC_DIR, file.replace(/\.ejs$/, '.html'));
  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, minified);
  return outputPath;
}

(async () => {
  const criticalCss = await loadCriticalCss();
  const templates = await getTemplates();

  if (!templates.length) {
    console.warn('No templates found to compile.');
    return;
  }

  const results = await Promise.all(
    templates.map(async (file) => ({ file, output: await compileTemplate(file, criticalCss) }))
  );

  results.forEach(({ file, output }) => {
    console.log(`Compiled ${file} -> ${path.relative(ROOT_DIR, output)}`);
  });
})();
