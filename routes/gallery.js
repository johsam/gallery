const debug = require('debug')('gallery');
const Router = require('koa-router');
const walk = require('../walk');

const api = (route, galleryPath) => {
    const router = new Router();

    debug(`Adding route ${route}, Gallery images served from ${galleryPath}`);

    router.get(route, async (ctx) => {
        const tree = walk.allFilesSync(galleryPath);
        const list = await walk.exifInfo(walk.albums(tree));

        list.sort((a, b) => a.album.localeCompare(b.album));

        ctx.body = list;
    });

    return router;
};

module.exports = {
    api: api
};
