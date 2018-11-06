/* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["oneFile"] }]*/

const fs = require('fs');
const path = require('path');

const mime = require('mime');
const exif = require('fast-exif');
const { forEach } = require('p-iteration');

const galleryPath = process.env.GALLERY_PATH;

/*async function _readExif(fp) {
    return exif
        .read(fp)
        .then(data => ({ datetimedigitized: data.exif.DateTimeDigitized }))
        .catch(err => ({ err: 'Missing exif' + err }));
}

*/

const _readExif = async filePath => exif
    .read(filePath)
    .then(data => ({
        datetimedigitized: data.exif.DateTimeDigitized,
        datetimeoriginal: data.exif.DateTimeOriginal,
        isospeedratings: data.exif.ISO,
        model: data.image.Model,
        make: data.image.Make,
        gpslatitude: data.gps.GPSLatitude,
        gpslongitude: data.gps.GPSLongitude,
        gpsaltitude: data.gps.GPSAltitude
    }))
    .catch(err => ({ err: 'Missing exif' + err }));

const exifInfo = async (list) => {
    // Async loops
    await forEach(list, async (item) => {
        await forEach(item.files, async (oneFile) => {
            oneFile.exif = await _readExif(oneFile.source);
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
                source: filePath,
                path: filePath.replace(galleryPath, '/gallery/gallery'),
                thumb: path.join('/gallery/thumbs', dirName + '_' + filename),
                size: fs.statSync(filePath).size,
                timestamp: fs.statSync(filePath).ctime,
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
                //name: file,
                //path: path.join(path.dirname(filePath), fs.readlinkSync(filePath)).replace(galleryPath, '/gallery/gallery'),
                //size: fs.statSync(filePath).size,
                // Use poster.png generated from poster link...
                path: path.join(path.dirname(filePath), 'poster.png').replace(galleryPath, '/gallery/gallery'),
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
