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


    # installing Node modules based on dependencies in package.json does not work,
    # some Node.js cannot find libs or bins when dependencies installed like this
    $ # sudo npm install -g -d
    
    # Instead install globally manually
    $ sudo npm install -g connect express hogan grunt https://github.com/h5bp/node-build-script/tarball/master

### Elastic Search (Java server)
    
    $ wget https://github.com/downloads/elasticsearch/elasticsearch/elasticsearch-0.18.7.tar.gz
    $ tar xvf elasticsearch-0.18.7.tar.gz
    # Download and extract library data data to data/
    # To force bindin to localhost, you might want to set
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

Starting server
--------------
Execute each step in dedicated terminal or screen.

1. Start Elastic Search backend

        $ elasticsearch-0.18.7/bin/elasticsearch -f
        
2. Build project

        $ h5bp

3. Start proxy for ES
        
        $ node proxy.js

4. Start HTTP server

        $ node server.js
        

The publishable version of the website will appear in folder `output`. All intermediate files should be in gitignore.

Finally open `localhost:8080` and select index.html to view main screen.
        
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

