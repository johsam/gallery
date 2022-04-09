// Read .env and expand variables


var dotenv = require('dotenv');
var dotenvExpand = require('dotenv-expand');

dotenvExpand.expand(dotenv.config());

const path = require('path');
const Koa = require('koa');
const morgan = require('koa-morgan');
const serve = require('koa-static');
const mount = require('koa-mount');
//const json = require('koa-json');

// Constants
const oneDayMs = 1000 * 60 * 60 * 24;
const sevenDayMs = 7 * 1000 * 60 * 60 * 24;
const thumbsPath = process.env.THUMBS_PATH;
const galleryPath = process.env.GALLERY_PATH;
const port = process.env.LISTEN_PORT;

// Api routes
const posters = require('./routes/posters').api('/gallery/api/v1/posters', galleryPath);
const gallery = require('./routes/gallery').api('/gallery/api/v1/gallery', galleryPath);

// Koa app

const app = new Koa();

// setup the logger

morgan.format('simple', '[:date[iso]] :status :method :url :res[content-length] - :response-time ms');
app.use(morgan('simple'));

// static images and thumbs

app.use(mount('/gallery/thumbs', serve(thumbsPath, { maxage: sevenDayMs })));
app.use(mount('/gallery/gallery', serve(galleryPath, { maxage: sevenDayMs })));

// static assets

app.use(mount('/gallery', serve(path.join(__dirname, '/assets'), { maxage: oneDayMs })));

// api

//app.use(json({ pretty: false, param: 'pretty' }));

app.use(posters.routes()).use(posters.allowedMethods());
app.use(gallery.routes()).use(gallery.allowedMethods());

// Start our app
console.log(`listening on port ${port}`);
app.listen(port);
