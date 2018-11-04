#!/bin/bash

set -e
shopt -s nullglob

######################################################################
#
# Setup variables...
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

(
	cd ${gallery} || exit

	for d in ./*; do
		echo "Processing directory '${d}'"
		(
			cd "${d}" || exit
			for f in ./*; do
				if [ ! -h "${f}" ]; then
					echo "Processing file '$f'"
					convert "${f}" -set filename:name "%t" -resize 200x "${thumbs}/${d}_%[filename:name].png"
				fi
			done
		)
	done

)
