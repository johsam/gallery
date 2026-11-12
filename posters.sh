#!/bin/bash

set -e
shopt -s nullglob

######################################################################
#
# Create a 'poster' symlink in every gallery folder, pointing at the
# image with the latest EXIF timestamp (DateTimeOriginal, falling
# back to DateTimeDigitized then ModifyDate).
#
# Files without any EXIF date lose to dated ones, so a recently
# copied but date-stripped image never wins. Folders that already
# have a 'poster' file/symlink or a 'poster.png' are left alone.
#
# Run thumbs.sh afterwards to turn the symlinks into fast-loading
# 500px poster.png files.
#
# Usage: ./posters.sh [-n]   (-n = dry run, only print the links)
#
######################################################################

[ -h "$0" ] && scriptdir=$(dirname "$(readlink "$0")") || scriptdir=$(cd "$(dirname "$0")" && pwd)
[ -r "${scriptdir}/.env" ] && source "${scriptdir}/.env"

# Sanity checks

if [ -z "${GALLERY_PATH}" ]; then
	echo "Fatal: missing env variables"
	exit 1
fi

if ! command -v exiftool > /dev/null; then
	echo "Fatal: exiftool not installed"
	exit 1
fi

gallery="${GALLERY_PATH}"
dry=0
[ "${1:-}" = "-n" ] && dry=1

cd "${gallery}" || exit 1

created=0

# Every directory in the tree, at any depth

find . -type d -print0 | while IFS= read -r -d '' d; do
	dir="${d#./}"

	# Skip the gallery root itself
	[ -z "${dir}" ] && continue

	# Existing posters win: manual 'poster' file/symlink, or a
	# 'poster.png' generated earlier

	if [ -e "${dir}/poster" ] || [ -e "${dir}/poster.png" ]; then
		continue
	fi

	# Latest image by EXIF date: any dated file beats undated ones,
	# newest date wins, filename breaks ties

	latest=$(exiftool -q -Q -T -FileName -DateTimeOriginal -DateTimeDigitized -ModifyDate \
		-ext jpg -ext jpeg -ext png -ext gif -ext webp -ext tif -ext tiff \
		"${dir}" 2>/dev/null 		| awk -F'\t' '
			{
				# exiftool prints "-" for missing values
				date = $2
				if (date == "" || date == "-") date = $3
				if (date == "" || date == "-") date = $4
				if (date == "-" || date == "") date = ""
				print date "\t" $1
			}' | LC_ALL=C sort -t "$(printf '\t')" -k1,1r -k2,2 | head -n 1 | cut -f2)

	# No images in this folder

	[ -z "${latest}" ] && continue

	if [ "${dry}" = "1" ]; then
		echo "Would link '${dir}/poster' -> '${latest}'"
	else
		echo "Linking '${dir}/poster' -> '${latest}'"
		ln -sfn -- "${latest}" "${dir}/poster"
	fi
done

