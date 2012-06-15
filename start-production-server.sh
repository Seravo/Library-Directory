#!/bin/sh
echo "Starting library directory server in production mode"

# abort on errors
set -e

# print commands before execution
set -x

# Build static
cd css
lessc style.less > style.css
cd ..
h5bp

# start servers
gnome-terminal -x elasticsearch/bin/elasticsearch -f
sleep 12 # wait for ES to come up
gnome-terminal -x node proxy.js
NODE_ENV=prod gnome-terminal -x node server.js

echo "Running. Open in a browser http://localhost:8080/"


