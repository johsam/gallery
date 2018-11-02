
// Read .env and expand variables

require('dotenv-expand')(require('dotenv').config());

const path = require('path');
const Koa = require('koa');
const morgan = require('koa-morgan');
const serve = require('koa-static');
const mount = require('koa-mount');
const json = require('koa-json');

// Api routes
const posters = require('./routes/posters');
const gallery = require('./routes/gallery');

// Constants
const oneDayMs = 1000 * 60 * 60 * 24;
const thumbsPath = process.env.THUMBS_PATH;
const galleryPath = process.env.GALLERY_PATH;
const port = process.env.LISTEN_PORT;

// Koa app

const app = new Koa();

// setup the logger

morgan.format('simple', '[:date[iso]] :status :method :url :res[content-length] - :response-time ms');
app.use(morgan('simple'));

// static assets

app.use(serve(path.join(__dirname, '/assets'), { maxage: oneDayMs }));

app.use(mount('/thumbs', serve(thumbsPath, { maxage: oneDayMs })));
app.use(mount('/gallery', serve(galleryPath, { maxage: oneDayMs })));

// api

app.use(json({ pretty: false, param: 'pretty' }));

app.use(posters.routes()).use(posters.allowedMethods());
app.use(gallery.routes()).use(gallery.allowedMethods());

// Start our app
console.log(`listening on port ${port}`);
app.listen(port);
