#!/bin/sh
echo "Updating sources to production server"

# abort on errors
set -e

# print commands before execution
set -x

git stash # move away old changes, they would otherwise stop the pull
git pull git://github.com/Seravo/Library-Directory.git

sed -i "s/8080/80/" server.js
sed -i "s/\"localhost\"/libdir.seravo.fi/" proxy.json
sed -i "s/localhost/libdir.seravo.fi/" js/libs/jquery.facetview.js

cd css
lessc style.less > style.css
cd ..

h5bp

# server.js includes a watcher that automatically restarts if when view 
# files in output changes, so there is no need to manually restart it

