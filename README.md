README
======
This is an initial prototype of the library directory website and widgets.

![Screenshot](https://github.com/Seravo/Library-Directory/raw/master/screenshot.png "Screenshot of main page")

Dependencies
------------

Instructions for Ubuntu 12.04, where the required dependencies can be installed with:

### Node.js, Node Package Manager, h5bp and Java dependencies

    $ sudo apt-get install nodejs npm node-less libjpeg-progs optipng default-jre-headless
    $ cd Library-Directory
    # make sure modules in path, otherwise require('connect') will fail
    $ export NODE_PATH="/usr/local/lib/node_modules/" # example on Ubuntu 12.04

    # Installing Node modules based on dependencies in package.json does not work,
    # some Node.js cannot find libs or bins when dependencies installed like this:
    $ # sudo npm install -g -d
    
    # Instead install globally manually:
    $ sudo npm install -g connect express hogan grunt nodewatch https://github.com/h5bp/node-build-script/tarball/master

### Elastic Search (Java server)

    $ wget https://github.com/downloads/elasticsearch/elasticsearch/elasticsearch-0.18.7.tar.gz
    $ tar xvf elasticsearch-0.18.7.tar.gz
    $ ln -s elasticsearch-0.18.7 elasticsearch
    # Download and extract library database file to data/
    # To force binding to localhost, you might want to set
    # in config/elasticsearch.yml network.host: 127.0.0.1

### Read-only proxy (https://github.com/lukas-vlcek/node.es)
    
    # Useable out of the box.
    # In server/proxy.json defined to use port 8888 
    # sudo required for port 80
    # expects back-end Elastic Search server at localhost:9200

Generating CSS from LESS
------------------------

    $ cd css
    $ lessc style.less > style.css


Starting development server
---------------------------

1. Start Elastic Search backend

        $ elasticsearch/bin/elasticsearch -f
        
2. Start proxy for ES
        
        $ node proxy.js

3. Start HTTP server

        $ node server.js

Finally open `localhost:8080` to use server.


Starting production server
--------------------------
Execute each step in dedicated terminal or screen.

1. Start Elastic Search backend

        $ elasticsearch/bin/elasticsearch -f
        
2. Build project, will output static files in folder `output`

        $ h5bp

3. Start proxy for ES
        
        $ node proxy.js

4. Start HTTP server with production variable

        $ NODE_ENV=production node server.js
        
Finally open `localhost:8080` to use server.


Running a production server permanently
---------------------------------------

Following steps assume you already have a working version at `Library-Directory`.

1. Add use `libdir` to system to avoid running server directly as root:

        $ sudo adduser \
            --system \
            --shell /bin/bash \
            --gecos 'User for running library directory server' \
            --group \
            --disabled-password \
            --home /home/libdir \
            libdir

2. Move files to system location and make sure they are up to date

        $ sudo mkdir /var/www
        $ sudo mv Library-Directory /var/www/libdir
        $ sudo chown -R libdir:libdir /var/www/libdir
        
3. Install Upstart scripts

        $ sudo cd /var/www/libdir/
        $ cd/etc/init/
        $ sudo ln -s /var/www/libdir/upstart-scripts/* .
        $ cd /var/log
        $ sudo touch libdir-server.log elasticsearch-proxy.log
        $ sudo chown libdir libdir-server.log elasticsearch-proxy.log
        # Elastic Search has its own log under its own folder in `logs`

3. Start servers

        $ sudo start elasticsearch
        $ sudo start elasticsearch-proxy
        $ sudo start libdir-server
        
Server will now be running in port 80 and logging to `/var/log/libdir.log`

        
Credits
-------

Project built on HTM5boilerplate for Node.js (http//github.com/h5bp/html5-boilerplate) and HTM5boilerplate for Twitter Bootstrap Responsive.

Other libraries are:

* http://www.initializr.com/

    * HTML5 Boilerplate
    * Modernizr
    * JQuery
    * Twitter Bootstrap (responsive)
        
* http://github.com/okfn/facetview
    * JQuery UI
    * D3.js
    * Linkify

Icons by Glyphicons (http://glyphicons.com/), license CC-BY-3.0.

The Dark theme for OpenLayers by MapBox (from http://zzolo.org/thoughts/openlayers-facelift), license GPL2+ (as modules in Drupal-git are derivates of Drupal).

