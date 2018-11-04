const debug = require('debug')('posters');
const Router = require('koa-router');
const walk = require('../walk');

const api = (route, galleryPath) => {
    const router = new Router();

    debug(`Adding route ${route}, Poster images served from ${galleryPath}`);

    router.get(route, async (ctx) => {
        let list = await walk.exifInfo(walk.postersSync(galleryPath));
        const result = [];

        // Remove any entries without a file list
        list = list.filter(item => item.files && item.files.length !== 0);

        // And return an array of posters
        list.map(item => result.push({ title: item.directory, path: item.files[0].path }));

        ctx.body = result.sort((a, b) => a.title > b.title);
    });

    return router;
};

module.exports = {
    api: api
};
