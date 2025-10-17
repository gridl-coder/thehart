const path = require('path');
const fs = require('fs-extra');
const sass = require('sass');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const Critters = require('critters');
const ejs = require('ejs');

const ROOT_DIR = path.join(__dirname, '..');
const SCSS_ENTRY = path.join(ROOT_DIR, 'src', 'scss', 'main.scss');
const CSS_OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'css');
const CSS_OUTPUT_FILE = path.join(CSS_OUTPUT_DIR, 'main.css');

async function compileSass() {
  const result = sass.compile(SCSS_ENTRY, {
    loadPaths: [path.join(ROOT_DIR, 'node_modules')],
    style: 'expanded'
  });
  return result.css;
}

async function optimizeCss(css) {
  const result = await postcss([autoprefixer, cssnano]).process(css, {
    from: undefined
  });
  return result.css;
}

async function ensureOutputDirectory() {
  await fs.ensureDir(CSS_OUTPUT_DIR);
}

async function renderIndexHtml() {
  const templatePath = path.join(ROOT_DIR, 'views', 'index.ejs');
  return ejs.renderFile(templatePath, { title: 'The White Hart', criticalCss: '' });
}

async function buildCriticalCss(html) {
  const critters = new Critters({
    path: path.join(ROOT_DIR, 'public'),
    publicPath: '/',
    preload: 'swap',
    pruneSource: false,
    inlineFonts: true,
    reduceInlineStyles: false
  });

  const processedHtml = await critters.process(html);
  const criticalMatch = processedHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);

  if (!criticalMatch) {
    console.warn('Critical CSS could not be extracted.');
    return '';
  }

  return criticalMatch[1].trim();
}

async function writeCssFile(filePath, contents) {
  await fs.writeFile(filePath, contents, 'utf8');
}

async function build() {
  await ensureOutputDirectory();
  const compiledCss = await compileSass();
  const optimizedCss = await optimizeCss(compiledCss);
  await writeCssFile(CSS_OUTPUT_FILE, optimizedCss);

  try {
    const html = await renderIndexHtml();
    const criticalCss = await buildCriticalCss(html);

    if (criticalCss) {
      await writeCssFile(path.join(CSS_OUTPUT_DIR, 'critical.css'), criticalCss);
    }
  } catch (error) {
    console.error('Critical CSS generation failed:', error);
  }
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
