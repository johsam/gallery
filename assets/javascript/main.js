$(async function() {
    let results = [];
    const gallery = {};

    $.templates('posterItemTpl', '#posterItemTpl');
    $('#gallery-wrapper').hide();

    const getAllUrls = async (urls) => {
        try {
            var data = await Promise.all(urls.map(url => fetch(url).then(response => response.json())));
            return data;
        } catch (error) {
            throw error;
        }
    };

    const showGallery = (target, id) => {
        $(target).lightGallery({
            share: false,
            dynamic: true,
            dynamicEl: gallery[id]
        });
    };

    results = await getAllUrls(['/api/v1/posters', '/api/v1/gallery']);

    // Process posters data

    const html = $.render.posterItemTpl(results[0]);

    $('#gallery-wrapper').append(html);

    setTimeout(() => {
        $('#gallery-wrapper').fadeIn();

        $('div.tile,div.media').on('click', (event) => {
            const { target } = event;
            event.stopPropagation();

            showGallery(
                target,
                $(target)
                    .closest('div')
                    .data('id')
            );
        });
    }, 1000);

    // Process gallery data

    $.each(results[1], (_i, item) => {
        gallery[item.directory] = [];
        $.each(item.files, (_j, file) => {
            gallery[item.directory].push({
                src: file.path,
                thumb: file.thumb,
                subHtml: file.exif.DateTimeDigitized ? file.exif.DateTimeDigitized : ''
            });
        });
    });
});