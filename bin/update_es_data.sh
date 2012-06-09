#!/bin/bash
# Server specific script to update ES data folder
# Run nightly

cd /var/www/libdir/elasticsearch
cp /home/datasync/data.tar.gz .
rm -rf data-old
mv data data-old
tar zxvf data.tar.gz
# User libdir does not have permission to 
# stop/start these services, but owns process
# so this is enough to restart ES, thanks to 
# automatic respawn of upstart.
killall java 

