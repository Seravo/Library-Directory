#!/bin/bash
# Server specific script to update ES data folder
# Run nightly

cd /var/www/libdir/elasticsearch
stop libdir-server elasticserach elasticsearch-proxy
cp /home/datasync/data.tar.gz .
rm -rf data-old
mv data data-old
tar zxvf data.tar.gz
start libdir-server

