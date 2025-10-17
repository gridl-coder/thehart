const path = require('path');
const express = require('express');
const livereload = require('livereload');
const connectLivereload = require('connect-livereload');

const PORT = process.env.PORT || 3000;
const app = express();

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

app.get('/', (req, res) => {
  res.render('index', { title: 'The White Hart' });
});

app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
