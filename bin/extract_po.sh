#!/bin/bash
# Source: https://raw.github.com/mozilla/i18n-abide/master/bin/extract_po.sh
# Adapted a little bit to work for the Library Directory, e.g. parsing as Python not Perl etc..

# syntax:
# extract-po.sh

# remove temp build files
rm -rf staging/ output/
# No -j on first line, to clear out .pot file (Issue#1170)

# messages.po is server side strings
xgettext --keyword=_ -L Python --output-dir=locale/templates/LC_MESSAGES --from-code=utf-8 --output=messages.pot \
server.js js/libs/jquery.facetview.js locale/templates/LC_MESSAGES/gettext.tmpl
sed -e 's/charset=CHARSET/charset=UTF-8/g' < locale/templates/LC_MESSAGES/messages.pot > messages.pot.tmp
mv messages.pot.tmp locale/templates/LC_MESSAGES/messages.pot

xgettext -j --keyword=_ -L Python --output-dir=locale/templates/LC_MESSAGES --from-code=utf-8 --output=messages.pot `find views -name '*.mustache'`

# i18n-abide supports client-side gettext too. Usually you won't need this, unless your doing some
# fancy new fangled webapp.
#
# client.po, assuming you have gettext strings in your client files (.js, .ejs)
# js
# xgettext -L Perl --output-dir=locale/templates/LC_MESSAGES --from-code=utf-8 --output=client.pot\
# `find client -name '*.js' | grep -v 'gettext.js'`
# ejs
# xgettext -j -L PHP --keyword=_ --output-dir=locale/templates/LC_MESSAGES --output=client.pot `find client -name '*.ejs'`

echo "Notice: If there are warnings about unterminated strings it does not matter. We are using Python extraction for Javascript.."

