/* globals moment:false */

$(async () => {
    const gallery = {};
    let posters = [];
    let currentAlbum = '';

    $.templates('posterItemTpl', '#posterItemTpl');

    $('#gallery-wrapper').hide();
    $('#breadcrumb').hide();

    const getAllUrls = async (urls) => {
        // eslint-disable-next-line no-useless-catch
        try {
            const data = await Promise.all(urls.map((url) => fetch(url).then((response) => response.json())));
            return data;
        } catch (error) {
            throw error;
        }
    };

    const showGallery = (target, elements, index) => {
        if (!elements || elements.length === 0) {
            return;
        }

        const instance = $(target).data('lightGallery');

        if (instance) {
            instance.destroy(true);
        }

        $(target).lightGallery({
            share: false,
            dynamic: true,
            dynamicEl: $(elements),
            index: index || 0,
        });
    };

    // Process gallery data: album path -> lightgallery elements

    const buildGalleryData = (albumList) => {
        $.each(albumList, (_i, item) => {
            gallery[item.album] = [];

            $.each(item.files, (_j, file) => {
                let epoch;
                let ts;

                if (!file.type || file.type.indexOf('image/') !== 0) {
                    return;
                }

                if (file.exif.datetimeoriginal || file.exif.datetimedigitized) {
                    const dtc = moment(file.exif.datetimeoriginal || file.exif.datetimedigitized);
                    ts = dtc.utc().format('YYYY-MM-DD HH:mm');
                    epoch = dtc.unix();
                } else {
                    epoch = 0;
                }
                gallery[item.album].push({
                    src: file.path,
                    thumb: file.thumb,
                    epoch: epoch,
                    subHtml: ts || 'No date...',
                    dataset: {
                        filename: file.name,
                        isospeedratings: file.exif.isospeedratings,
                        datetimeoriginal: file.exif.datetimeoriginal,
                        model: file.exif.model || '',
                        make: file.exif.make || '',
                        gpslatitude: file.exif.gpslatitude || '',
                        gpslongitude: file.exif.gpslongitude || '',
                        gpsaltitude: file.exif.gpsaltitude || '',
                    },
                });
            });

            gallery[item.album].sort((a, b) => (a.epoch || Infinity) - (b.epoch || Infinity));
        });
    };

    // Drill-down navigation

    const hasChildren = (album) => posters.some((poster) => poster.parent === album && poster.path);

    const renderBreadcrumb = (album) => {
        const $crumbs = $('#breadcrumb').empty();

        if (album === '') {
            $crumbs.hide();
            return;
        }

        $crumbs.show();
        $crumbs.append($('<span class="crumb"></span>').text('Home').data('target', ''));

        const parts = album.split('/');
        let acc = '';

        parts.forEach((part, index) => {
            acc = index === 0 ? part : acc + '/' + part;
            $crumbs.append(' &rsaquo; ');

            const $crumb = $('<span class="crumb"></span>').text(part);

            if (index !== parts.length - 1) {
                $crumb.data('target', acc);
            } else {
                $crumb.addClass('current');
            }

            $crumbs.append($crumb);
        });
    };

    const renderTiles = (album) => {
        const $wrapper = $('#gallery-wrapper');
        const tiles = posters.filter((poster) => poster.parent === album && poster.path);

        currentAlbum = album;
        renderBreadcrumb(album);
        $wrapper.empty();

        if (tiles.length !== 0) {
            const enriched = tiles.map((poster) => ({
                title: poster.title,
                album: poster.album,
                path: poster.path,
                category: hasChildren(poster.album)
            }));

            $wrapper.append($('<div class="gallery"></div>').append($.render.posterItemTpl(enriched)));
        }
    };

    const onTileClick = (event) => {
        event.stopPropagation();

        const $tile = $(event.currentTarget);
        const album = String($tile.data('id'));

        if (hasChildren(album)) {
            renderTiles(album);
        } else {
            showGallery($tile, gallery[album] || [], 0);
        }
    };

    const onCrumbClick = (event) => {
        const $crumb = $(event.currentTarget);

        if ($crumb.hasClass('current')) {
            return;
        }

        renderTiles($crumb.data('target') || '');
    };

    const results = await getAllUrls(['/gallery/api/v1/posters', '/gallery/api/v1/gallery']);

    posters = results[0];
    buildGalleryData(results[1]);

    $('#gallery-wrapper')
        .on('click', 'div.tile', onTileClick);
    $('#breadcrumb').on('click', '.crumb', onCrumbClick);

    renderTiles('');

    setTimeout(() => {
        $('#gallery-wrapper').fadeIn();
    }, 1000);
});
