const path = require('path');
const fs = require('fs');
const express = require('express');
const livereload = require('livereload');
const connectLivereload = require('connect-livereload');

const PORT = process.env.PORT || 3000;
const app = express();

const CRITICAL_CSS_PATH = path.join(__dirname, 'public', 'css', 'critical.css');
let criticalCss = '';

const loadCriticalCss = () => {
  try {
    criticalCss = fs.readFileSync(CRITICAL_CSS_PATH, 'utf8');
  } catch (error) {
    criticalCss = '';
  }
};

loadCriticalCss();

try {
  fs.watch(path.dirname(CRITICAL_CSS_PATH), (eventType, filename) => {
    if (filename === path.basename(CRITICAL_CSS_PATH)) {
      loadCriticalCss();
    }
  });
} catch (error) {
  // Directory might not exist during development builds.
}

app.use((req, res, next) => {
  res.locals.criticalCss = criticalCss;
  next();
});

// Live reload setup
const liveReloadServer = livereload.createServer({
  exts: ['html', 'ejs', 'css', 'js']
});
liveReloadServer.watch(path.join(__dirname, 'public'));
liveReloadServer.watch(path.join(__dirname, 'views'));

liveReloadServer.server.once('connection', () => {
  setTimeout(() => {
    liveReloadServer.refresh('/');
  }, 100);
});

app.use(connectLivereload());

// View engine configuration
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res, next) => {
  const htmlPath = path.join(__dirname, 'public', 'index.html');

  if (!fs.existsSync(htmlPath)) {
    return res.render('index', { title: 'The White Hart' });
  }

  res.sendFile(htmlPath, (error) => {
    if (error) {
      next(error);
    }
  });
});

app.use((req, res, next) => {
  const htmlPath = path.join(__dirname, 'public', '404.html');

  if (!fs.existsSync(htmlPath)) {
    return res.status(404).render('404', { title: 'Not Found' });
  }

  res.status(404).sendFile(htmlPath, (error) => {
    if (error) {
      next(error);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
