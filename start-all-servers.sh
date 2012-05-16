#!/bin/sh
echo "Starting library directory server"

# abort on errors
set -e

# print commands before execution
set -x

gnome-terminal -x elasticsearch-0.18.7/bin/elasticsearch -f
sleep 8 # wait for ES to come up
gnome-terminal -x node proxy.js
gnome-terminal -x node server.js

# Build static
cd css
lessc style.less > style.css
cd ..
h5bp reload

echo "All servers running in their own terminals. Open in a browser http://localhost:8080/"
