README
======
This is an initial prototype of the library directory website and widgets.

Code boilerplate based on www.initializr.com (html5boilerplate, Boostrap Responsive 2, LESS etc..)


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

Generating CSS from LESS
------------------------

	cd less
	lessc style.less > style.css

Building the production version
-------------------------------

	cd build
	build ant

The publishable version of the website will appear in folder `publish`. All intermediate files should be in gitignore.
