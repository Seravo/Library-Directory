a#!/bin/sh
echo "Starting library directory server"

# abort on errors
set -e

# print commands before execution
set -x

gnome-terminal -x elasticsearch-0.18.7/bin/elasticsearch -f
gnome-terminal -x node proxy.js
gnome-terminal -x node server.js

echo "All servers running in their own terminals."
echo "Open in a browser http://localhost:8080/"
