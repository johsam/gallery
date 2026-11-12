const debug = require('debug')('posters');
const Router = require('koa-router');
const walk = require('../walk');

const api = (route, galleryPath) => {
    const router = new Router();

    debug(`Adding route ${route}, Poster images served from ${galleryPath}`);

    router.get(route, async (ctx) => {
        const tree = await walk.exifInfo(walk.allFilesSync(galleryPath));
        const list = walk.posters(tree);

        list.sort((a, b) => {
            if (a.parent !== b.parent) {
                return a.parent.localeCompare(b.parent);
            }

            // Top level stays alphabetical; inside a subfolder view the
            // tiles sort by the folder's latest photo date, oldest first

            if (a.parent === '') {
                return a.album.localeCompare(b.album);
            }

            const ta = a.taken ? a.taken.getTime() : Infinity;
            const tb = b.taken ? b.taken.getTime() : Infinity;

            if (ta !== tb) {
                return ta - tb;
            }

            return a.album.localeCompare(b.album);
        });

        ctx.body = list;
    });

    return router;
};

module.exports = {
    api: api
};
