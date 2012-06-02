#!/bin/sh
echo "Updating sources to production server"

# abort on errors
set -e

# print commands before execution
set -x

git checkout js/libs/jquery.facetview.js proxy.json server.js # move away old changes, they would otherwise stop the pull
git pull git://github.com/Seravo/Library-Directory.git

sed -i "s/localhost/libdir.seravo.fi/" js/libs/jquery.facetview.js

cd css
lessc style.less > style.css
cd ..

h5bp

# server.js includes a watcher that automatically restarts if when view 
# files in output changes, but it works only for ./views, not ./output/views
# as ./output can be deleted, it's contents cannot be watched with current software
#
# force server.js watcher to reload
touch views/header.mustache


