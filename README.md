# The White Hart front-end wireframe

This project provides a live-reloading front-end wireframe for The White Hart website. It uses the latest Bootstrap, SCSS, and EJS templates served via Express.

## Getting started

```bash
npm install
```

### Development

Run the development environment with live reloading and SCSS watching:

```bash
npm run dev
```

The server runs on [http://localhost:3000](http://localhost:3000). Livereload automatically refreshes the browser when you update EJS views, SCSS, or public assets.

### Build stylesheets

Compile the SCSS without starting the watcher:

```bash
npm run build:css
```

### Production

```bash
npm start
```

## Project structure

```
├── public/          # Compiled assets served by Express
│   └── css/
├── src/
│   └── scss/        # Source SCSS files
├── views/           # EJS templates and partials
├── server.js        # Express app with live reload
└── package.json
```

Use this scaffold to build out pages, partials, and assets for the full site experience.
