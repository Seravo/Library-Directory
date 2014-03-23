About
=====

The Library Directory (published at http://hakemisto.kirjastot.fi/) is a website by [Seravo Oy](http://seravo.fi/) on comission from [Kirjastot.fi](http://kirjasto.fi/) / City of Helsinki. It provides an easy to use interface for the public to search libraries and their details, like open times, contact information, list of services etc. It also provides widgets that web developers can embed, for example if somebody wants to display local library information on the city or muncipality website.

The site is available in Finnish, Swedish and English. A gettext-based translation systems makes it easy to add more languages.

The source, comments and other project documentation is in English. The code is designed for reuse in other countries and is not limited just to Finland.

Ohloh profile: https://www.ohloh.net/p/libdir

<script type="text/javascript" src="http://www.ohloh.net/p/603249/widgets/project_partner_badge.js"></script>

Screenshots
-----------

Screenshot of main page
![Screenshot](https://github.com/Seravo/Library-Directory/raw/master/screenshot.png "Screenshot of main page")

Screenshot of main page with narrow screen (mobile). Showcases responsive design.
![Screenshot](https://github.com/Seravo/Library-Directory/raw/master/screenshot-mobile.png "Screenshot of main page with narrow screen (mobile). Showcases responsive design.")

Screenshot of details page with medium screen (tablet).
![Screenshot](https://github.com/Seravo/Library-Directory/raw/master/screenshot-tablet-detailspage.png "Screenshot of details page with medium screen (tablet).")


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

* Node.js

    * Express.js
    * Mustache / Hogan.js
    * Node-gettext
    
Icons by Glyphicons (http://glyphicons.com/), license CC-BY-3.0.

The Dark theme for OpenLayers by MapBox (from http://zzolo.org/thoughts/openlayers-facelift), license GPL2+ (as modules in Drupal-git are derivates of Drupal).

Thank you also for all the great Node.js packages we use in this project!


Installation
============

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
    $ sudo npm install -g connect locale express express-form nodemailer hogan grunt nodewatch https://github.com/h5bp/node-build-script/tarball/master
    # Normal "npm install -g gettext" no possible, library broken with TypeError: Object #<Object> has no method 'dcnpgettext'
    # Install a fixed fork
    $ sudo npm install -g git://github.com/dodo/node-gettext.git
    
    # Form the feedback form to work, you need to have some [Nodemailer](http://documentup.com/andris9/nodemailer/) compatible SMTP server credentials in config.json
    $ cp config.json-template config.json
    $ nano config.json # e.g. add the credentials of a dummy GMail account

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

#### Install bower globally and get all dependencies

    $ npm install -g bower
    $ bower install

#### Compile .less into .css

    $ cd css
    $ lessc style.less > style.css


Starting development server
---------------------------

1. Start Elastic Search backend

        $ elasticsearch/bin/elasticsearch -f
        
2. Start proxy for ES
        
        $ node proxy.js

3. Start HTTP server

        $ NODE_ENV=dev node server.js

Finally open `localhost:8080` to use server.


Running production server
--------------------------
Execute each step in dedicated terminal or screen.

1. Start Elastic Search backend

        $ elasticsearch/bin/elasticsearch -f
        
2. Build project, will output static files in folder `output`

        $ h5bp

3. Start proxy for ES
        
        $ node proxy.js

4. Start HTTP server with production variable

        $ NODE_ENV=prod node server.js
        
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
        $ sudo cp upstart-scripts/* /etc/init/

3. Start servers

        $ sudo start libdir-server
        # elasticsearch and elasticsearch-proxy will be started automatically
        
Server will now be running in port 80 and logging to `/var/log/upstart/<service name>.log`. Additionally Elastic Search has its own log under its own folder in `logs`.

There is also a script `update-in-production.sh` that will automatically check out the latest version, modify sources to use port 80 and server name and build the project. Make your own copy of it for your own production installation. Invoke it as `sudo -u libdir ./update-in-production.sh`.

Note! If you want to run the server in port 80, you need to grant special permissions, since ports below 1024 are normally reserved only for the root user:
    $ sudo apt-get install libcap2-bin 
    $ sudo setcap 'cap_net_bind_service=+ep' /usr/bin/node

Possibly also:
    $ sudo chmod +s /usb/bin/node

If Elastic Search complains about too few file descriptors, try
    $ ulimit -n 5000
      
Database
--------

Elastic Serach is used as the database and search backend. More documentation about the database and administration UI will be written soon..


