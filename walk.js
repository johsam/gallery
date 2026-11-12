/* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["item"] }]*/

const fs = require('fs');
const path = require('path');

const mime = require('mime');
const exif = require('fast-exif');
const { forEach } = require('p-iteration');

const galleryPath = process.env.GALLERY_PATH;
const thumbsPath = process.env.THUMBS_PATH;

// Generic image used as tile/poster for folders that contain subfolders
// but have no poster of their own. Drop a file here to change it.

const genericPosterFile = path.join(__dirname, 'assets', 'images', 'folder.png');
const genericPoster = fs.existsSync(genericPosterFile) ? '/gallery/images/folder.png' : null;

const _exifDate = (value) => {
    if (!value) {
        return null;
    }

    const date = new Date(String(value).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));

    return Number.isNaN(date.getTime()) ? null : date;
};

const _readExif = async filePath => exif
    .read(filePath)
    .then(data => ({
        datetimedigitized: data.exif.DateTimeDigitized,
        datetimeoriginal: data.exif.DateTimeOriginal,
        modifydate: data.image.ModifyDate,
        isospeedratings: data.exif.ISO,
        model: data.image.Model,
        make: data.image.Make,
        gpslatitude: data.gps ? data.gps.GPSLatitude : undefined,
        gpslongitude: data.gps ? data.gps.GPSLongitude : undefined,
        gpsaltitude: data.gps ? data.gps.GPSAltitude : undefined
    }))
    .catch(err => ({ err: 'Missing exif' + err }));

// Recursively process exif, descending into {directory, files} nodes

const exifInfo = async (list) => {
    await forEach(list, async (item) => {
        if (item.files) {
            await exifInfo(item.files);
        } else {
            item.exif = await _readExif(item.source);
            item.taken = _exifDate(item.exif.datetimeoriginal)
                || _exifDate(item.exif.datetimedigitized)
                || _exifDate(item.exif.modifydate);
        }
    });

    return list;
};

const _fileEntry = (filePath) => {
    const dirName = path.basename(path.dirname(filePath));
    const filename = path.basename(filePath.replace(path.extname(filePath), '.png'));
    const thumbPath = path.join('/gallery/thumbs', dirName + '_' + filename);
    const url = filePath.replace(galleryPath, '/gallery/gallery');

    return {
        name: path.basename(filePath),
        source: filePath,
        path: url,
        thumb: fs.existsSync(path.join(thumbsPath, dirName + '_' + filename)) ? thumbPath : url,
        size: fs.statSync(filePath).size,
        timestamp: fs.statSync(filePath).mtime,
        type: mime.getType(filePath),
        exif: {}
    };
};

const allFilesSync = (dir, album = '') => {
    const entries = [];

    fs.readdirSync(dir).forEach((file) => {
        const filePath = path.join(dir, file);
        const albumPath = album ? album + '/' + file : file;

        if (fs.statSync(filePath).isDirectory()) {
            const posterPath = path.join(filePath, 'poster.png');

            entries.push({
                directory: file,
                album: albumPath,
                poster: fs.existsSync(posterPath) ? posterPath.replace(galleryPath, '/gallery/gallery') : null,
                files: allFilesSync(filePath, albumPath)
            });
        } else if (!fs.lstatSync(filePath).isSymbolicLink() && file !== 'poster.png') {
            entries.push(_fileEntry(filePath));
        }
    });

    return entries;
};

// Date used to pick the "latest" file: EXIF capture date when present,
// else the file's mtime

const _fileDate = file => file.taken || file.timestamp;

const _isImage = file => String(file.type || '').startsWith('image/');

// Latest image: files with an EXIF date always beat mtime-only files,
// then the newest date wins

const _latestImage = (files) => files.reduce((latest, file) => {
    if (!!file.taken !== !!latest.taken) {
        return file.taken ? file : latest;
    }

    return _fileDate(file) > _fileDate(latest) ? file : latest;
});

// Latest EXIF-dated photo anywhere inside a folder (recursively), used
// to sort subfolder tiles in "build order". Files without an EXIF date
// are ignored - poster symlinks and poster.png never enter the listing

const _latestDate = (node) => {
    let latest = null;

    node.files.forEach((item) => {
        if (item.directory) {
            const date = _latestDate(item);

            if (date && (!latest || date > latest)) {
                latest = date;
            }
        } else if (_isImage(item) && item.taken) {
            if (!latest || item.taken > latest) {
                latest = item.taken;
            }
        }
    });

    return latest;
};

// Poster for a folder: own poster.png, else generic image for folders with
// subfolders, else latest image here, else anywhere below

const _firstPoster = (node) => {
    if (node.poster) {
        return node.poster;
    }

    const dirs = node.files.filter(item => item.directory);

    if (dirs.length !== 0 && genericPoster) {
        return genericPoster;
    }

    const files = node.files.filter(item => !item.directory && _isImage(item));

    if (files.length !== 0) {
        return _latestImage(files).path;
    }

    for (let i = 0; i < node.files.length; i += 1) {
        if (node.files[i].directory) {
            const poster = _firstPoster(node.files[i]);

            if (poster) {
                return poster;
            }
        }
    }

    return null;
};

// Flatten the tree into a list of albums (any depth) that contain images

const albums = (tree, albumList = []) => {
    tree.forEach((node) => {
        const files = node.files.filter(item => !item.directory);
        const dirs = node.files.filter(item => item.directory);

        if (files.length !== 0) {
            albumList.push({ album: node.album, files: files });
        }

        if (dirs.length !== 0) {
            albums(dirs, albumList);
        }
    });

    return albumList;
};

// Flatten the tree into poster entries, one per folder, linked by parent album

const posters = (tree, parent = '', posterList = []) => {
    tree.forEach((node) => {
        const poster = _firstPoster(node);

        if (poster) {
            posterList.push({
                title: node.directory,
                album: node.album,
                parent: parent,
                path: poster,
                taken: _latestDate(node)
            });
        }

        const dirs = node.files.filter(item => item.directory);

        if (dirs.length !== 0) {
            posters(dirs, node.album, posterList);
        }
    });

    return posterList;
};

module.exports = {
    allFilesSync: allFilesSync,
    albums: albums,
    posters: posters,
    exifInfo: exifInfo
};
