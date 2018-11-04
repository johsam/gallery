const debug = require('debug')('gallery');
const Router = require('koa-router');
const walk = require('../walk');

const api = (route, galleryPath) => {
    const router = new Router();

    debug(`Adding route ${route}, Gallery images served from ${galleryPath}`);

    router.get(route, async (ctx) => {
        const list = await walk.exifInfo(walk.allFilesSync(galleryPath));
        ctx.body = list;
    });

    return router;
};

module.exports = {
    api: api
};
