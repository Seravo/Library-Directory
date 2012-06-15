#!/bin/sh
echo "Starting library directory server in development mode"

# abort on errors
set -e

# print commands before execution
set -x

# No need to build static

# start servers
gnome-terminal -x elasticsearch/bin/elasticsearch -f
sleep 12 # wait for ES to come up
gnome-terminal -x node proxy.js
NODE_ENV=dev gnome-terminal -x node server.js

echo "Running. Open in a browser http://localhost:8080/"

# if you want everything to reload automatically, run
# $ gnome-terminal -x h5bp reload
# $ gnome-terminal -x nodemon -d 10 server.js

