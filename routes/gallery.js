const Router = require('koa-router');
const walk = require('../walk');

const router = new Router();

router.get('/api/v1/gallery', async (ctx) => {
    const list = await walk.exifInfo(walk.allFilesSync(process.env.GALLERY_PATH));
    ctx.body = list;
});

module.exports = router;
