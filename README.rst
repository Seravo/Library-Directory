README
======
This is an initial prototype of the library directory website and widgets.

Dependencies
------------

Development tested on Ubuntu 11.10, where the required dependencies can be installed with:

* Node.js, Node Package Manager and LESS

	sudo add-apt-repository ppa:chris-lea/node.js
	sudo apt-get update
	sudo apt-get install nodejs npm
	sudo npm install -g less

* Oracle Java JDK and Ant build system (could be replaced with Node build script https://github.com/h5bp/node-build-script)

	sudo add-apt-repository ppa:webupd8team/java
	sudo apt-get update
	sudo apt-get install oracle-jdk7-installer ant
 
* Image compression for Ant

	sudo apt-get install libjpeg-progs optipng

* JS libraries are in the folder js/lib/ and the sources are:

	http://www.initializr.com/
	
		HTML5 Boilerplate
		Modernizr
		JQuery
		Bootstrap (responsive)
		
	http://github.com/okfn/facetview
	
		JQuery UI
		D3.js
		Linkify

* Elastic Search (Java server)

	(in parent directory, not under librarydirectory folder)
	cd ..
	wget https://github.com/downloads/elasticsearch/elasticsearch/elasticsearch-0.18.7.tar.gz
	tar xvf elasticsearch-0.18.7.tar.gz
	# download and extract library data data to data/
	cd elasticsearch-0.18.7
	bin/elasticsearch -f

* Read-only proxy (https://github.com/lukas-vlcek/node.es)
	
	cd server/
	node proxy.js
	# in proxy.json defined to use port 8888 
	# sudo required for port 80	
	# espects back-end Elastic Search server at localhost:9200

* More Node.js libs for simple server

	sudo npm install -g connect
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
