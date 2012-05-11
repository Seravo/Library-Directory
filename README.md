README
======
This is an initial prototype of the library directory website and widgets.

![Screenshot](https://github.com/Seravo/Library-Directory/raw/master/screenshot.png "Screenshot of main page")

Dependencies
------------

Development tested on Ubuntu 11.10, where the required dependencies can be installed with:

### Node.js, Node Package Manager and LESS

    sudo add-apt-repository ppa:chris-lea/node.js
    sudo apt-get update
    sudo apt-get install nodejs npm
    sudo npm install -g less

### Node.js building environment 

    # source: https://github.com/h5bp/node-build-script
    sudo npm -g install grunt
    sudo npm install https://github.com/h5bp/node-build-script/tarball/master -g
    

### JS libraries are in the folder js/lib/ and the sources are

* http://www.initializr.com/

    * HTML5 Boilerplate
    * Modernizr
    * JQuery
    * Bootstrap (responsive)
        
* http://github.com/okfn/facetview
    * JQuery UI
    * D3.js
    * Linkify

### Elastic Search (Java server)
    
    # in parent directory, not under librarydirectory folder
    cd ..
    wget https://github.com/downloads/elasticsearch/elasticsearch/elasticsearch-0.18.7.tar.gz
    tar xvf elasticsearch-0.18.7.tar.gz
    # download and extract library data data to data/


### Read-only proxy (https://github.com/lukas-vlcek/node.es)
    
    # useable out of the box
    # in server/proxy.json defined to use port 8888 
    # sudo required for port 80
    # expects back-end Elastic Search server at localhost:9200

### More Node.js libs for simple server

    sudo npm install -g connect@2.0.3
    # make sure modules in path, otherwise require('connect') will fail
    export NODE_PATH="/usr/lib/node_modules/" # example on Debian/Ubuntu
    
    
Generating CSS from LESS
------------------------

    cd less
    lessc style.less > style.css

Building the production version
-------------------------------

    cd build
    ant build

The publishable version of the website will appear in folder `publish`. All intermediate files should be in gitignore.

Running server
--------------
1. Start Elastic Search backend

        cd elasticsearch-0.18.7
        bin/elasticsearch -f
        
2. Start proxy for ES
        
        node proxy.js

3. Start HTTP server

        node server.js

Finally open `localhost:8080` and select index.html to view main screen.
        
Credits
-------

Project built on HTM5boilerplate for Node.js (http//github.com/h5bp/html5-boilerplate) and HTM5boilerplate for Twitter Bootstrap Responsive.

Icons by Glyphicons (http://glyphicons.com/), license CC-BY-3.0.

