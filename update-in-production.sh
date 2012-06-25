#!/bin/sh
echo "Updating sources to production server"

# abort on errors
set -e

# print commands before execution
set -x

git checkout js/libs/jquery.facetview.js js/script.js js/widget.js # move away old changes, they would otherwise stop the pull
git pull

sed -i "s/localhost/hakemisto.kirjastot.fi/" js/libs/jquery.facetview.js
sed -i "s/localhost:8080/hakemisto.kirjastot.fi/" js/script.js
sed -i "s/localhost:8888/hakemisto.kirjastot.fi:8888/" js/script.js
sed -i "s/localhost:8080/hakemisto.kirjastot.fi/" js/widget.js

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


