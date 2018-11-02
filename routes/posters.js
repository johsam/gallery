const Router = require('koa-router');
const walk = require('../walk');

const router = new Router();

router.get('/api/v1/posters', async (ctx) => {
    let list = await walk.exifInfo(walk.postersSync(process.env.GALLERY_PATH));
    const result = [];

    // Remove any entries without a file list
    list = list.filter(item => item.files && item.files.length !== 0);

    // And return an array of posters
    list.map(item => result.push({ title: item.directory, path: item.files[0].path }));

    ctx.body = result.sort((a, b) => a.title > b.title);
});

module.exports = router;
