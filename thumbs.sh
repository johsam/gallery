#!/bin/bash

set -e
shopt -s nullglob

######################################################################
#
# Generate thumbnails and posters for the gallery.
#
# Handles folders nested at any depth.
#
#   - every folder with a 'poster' symlink (or file) gets a
#     'poster.png' (500px) generated next to it
#   - every image gets a thumbnail (200px) in the flat thumbs folder,
#     named <parent-folder>_<filename>.png to match walk.js
#
######################################################################

[ -h "$0" ] && scriptdir=$(dirname "$(readlink "$0")") || scriptdir=$(cd "$(dirname "$0")" && pwd)
[ -r "${scriptdir}/.env" ] && source "${scriptdir}/.env"

# Sanity checks

if [ -z "${THUMBS_PATH}" ] || [ -z "${GALLERY_PATH}" ]; then
	echo "Fatal: missing env variables"
	exit 1
fi

thumbs="${THUMBS_PATH}"
gallery="${GALLERY_PATH}"

cd "${gallery}" || exit 1

# Every directory in the tree, at any depth

find . -type d -print0 | while IFS= read -r -d '' d; do
	dir="${d#./}"

	# Skip the gallery root itself
	[ -z "${dir}" ] && continue

	echo "Processing directory '${dir}'"

	# Generate poster.png from the 'poster' symlink/file if present

	if [ -e "${dir}/poster" ]; then
		if [ ! -f "${dir}/poster.png" ] || [ "${dir}/poster" -nt "${dir}/poster.png" ]; then
			echo "Generating poster '${dir}/poster.png'"
			convert "${dir}/poster" -resize 500x "${dir}/poster.png"
		fi
	fi

	# Generate thumbnails for images directly in this folder

	for f in "${dir}"/*; do
		# Only regular files, skip links, posters and non-images (e.g. videos)

		[ -f "${f}" ] || continue
		[ -h "${f}" ] && continue

		base=$(basename "${f}")
		[ "${base}" = "poster" ] && continue
		[ "${base}" = "poster.png" ] && continue

		case "${base,,}" in
			*.jpg|*.jpeg|*.png|*.gif|*.webp|*.tif|*.tiff) ;;
			*) continue ;;
		esac

		parent=$(basename "${dir}")
		target="${thumbs}/${parent}_${base%.*}.png"

		if [ ! -f "${target}" ]; then
			echo "Processing file '${f}'"
			convert "${f}" -set filename:name "%t" -resize 200x "${thumbs}/${parent}_%[filename:name].png"
		fi
	done
done
