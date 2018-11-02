/* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["oneFile"] }]*/

const fs = require('fs');
const path = require('path');

const mime = require('mime');
const exif = require('fast-exif');
const { forEach } = require('p-iteration');

/*async function _readExif(fp) {
    return exif
        .read(fp)
        .then(data => ({ DateTimeDigitized: data.exif.DateTimeDigitized }))
        .catch(err => ({ err: 'Missing exif' + err }));
}

*/

const _readExif = async filePath => exif
    .read(filePath)
    .then(data => ({ DateTimeDigitized: data.exif.DateTimeDigitized }))
    .catch(err => ({ err: 'Missing exif' + err }));

const exifInfo = async (list) => {
    // Async loops
    await forEach(list, async (item) => {
        await forEach(item.files, async (oneFile) => {
            oneFile.exif = await _readExif(oneFile.path);
        });
    });

    return list;
};

const allFilesSync = (dir, fileList = []) => {
    fs.readdirSync(dir).forEach((file) => {
        const filePath = path.join(dir, file);

        if (fs.statSync(filePath).isDirectory()) {
            fileList.push({ directory: file, files: allFilesSync(filePath) });
        } else if (!fs.lstatSync(filePath).isSymbolicLink()) {
            const dirName = path.basename(path.dirname(filePath));
            const filename = path.basename(filePath.replace(path.extname(filePath), '.png'));

            fileList.push({
                name: file,
                path: filePath.replace(process.env.GALLERY_PATH, '/gallery'),
                thumb: path.join('/thumbs', dirName + '_' + filename),
                size: fs.statSync(filePath).size,
                type: mime.getType(file),
                exif: {}
            });
        }
    });

    return fileList;
};

const postersSync = (dir, fileList = []) => {
    fs.readdirSync(dir).forEach((file) => {
        const filePath = path.join(dir, file);

        if (fs.statSync(filePath).isDirectory()) {
            fileList.push({ directory: file, files: postersSync(filePath) });
        } else if (fs.lstatSync(filePath).isSymbolicLink()) {
            fileList.push({
                name: file,
                path: path.join(path.dirname(filePath), fs.readlinkSync(filePath)).replace(process.env.GALLERY_PATH, '/gallery'),
                size: fs.statSync(filePath).size,
                exif: {}
            });
        }
    });

    return fileList;
};

module.exports = {
    allFilesSync: allFilesSync,
    postersSync: postersSync,
    exifInfo: exifInfo
};
