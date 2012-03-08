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

* Oracle Java JDK and Ant build system

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

	wget https://github.com/downloads/elasticsearch/elasticsearch/elasticsearch-0.18.7.tar.gz
	tar xvf elasticsearch-0.18.7.tar.gz
	# download and extract library data data to data/
	cd elasticsearch-0.19.0
	bin/elasticsearch -f

* Read-only proxy (Node.js module)

	https://github.com/lukas-vlcek/node.es
	cd server/
	node proxy.js
	ERROR: 
	
		$ node proxy.js
		The "sys" module is now called "util". It should have a similar interface.

		node.js:201
				throw e; // process.nextTick error, or 'error' event on first tick
				      ^
		SyntaxError: Unexpected token /
			at Object.parse (native)
			at /home/otto/Kirjastot.fi/librarydirectory/server/lib/elasticsearch-proxy.js:179:31
			at /home/otto/Kirjastot.fi/librarydirectory/server/lib/elasticsearch-proxy.js:278:9
			at new <anonymous> (/home/otto/Kirjastot.fi/librarydirectory/server/lib/elasticsearch-proxy.js:310:5)
			at Object.getProxy (/home/otto/Kirjastot.fi/librarydirectory/server/lib/elasticsearch-proxy.js:475:21)
			at Object.<anonymous> (/home/otto/Kirjastot.fi/librarydirectory/server/proxy.js:54:32)
			at Module._compile (module.js:441:26)
			at Object..js (module.js:459:10)
			at Module.load (module.js:348:31)
			at Function._load (module.js:308:12)

	
Generating CSS from LESS
------------------------

	cd less
	lessc style.less > style.css

Building the production version
-------------------------------

	cd build
	build ant

The publishable version of the website will appear in folder `publish`. All intermediate files should be in gitignore.
