// export NODE_PATH="/usr/lib/node_modules/"

// Use consolidate.js in Express.js 3.0, otherwise custom adaptor
// var cons = require('consolidate');
var hogan = require('hogan');
var adapter = require('hogan-express.js');

var connect = require('connect');
var express = require('express');
var app = express.createServer();

app.configure(function(){
    app.use(express.logger('dev'))
//    app.use(express.compress())
    app.use(express.methodOverride());
    app.use(express.bodyParser());
	app.set('view engine','mustache');
	app.set('view options',{layout:false});
	app.set('views',__dirname + '/output/views');
	app.register('mustache',adapter.init(hogan));    
    app.use(app.router);
    app.use(connect.compress()); // works for static files, but not for res.render?
    var oneHour = 31557600000;
    app.use(express.static(__dirname + "/output", { maxAge: oneHour }));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// if started with $ NODE_ENV=production node server.js
app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/output', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

/* 
route logic:
if /(.*) <html lang="fi"...
if /fi/(.*) -> html lang fi
if /en/(.*) -> html lang en
if /sv/(.*) -> html lang sv
*/

// Hogan.js does not support template inheritance yet, must do workaround
// https://gist.github.com/1854699
// ..but each render() ends the response, 
// we need a streaming way to write out several templates, not:
/*
	res.render("header",{title:"Search"});
	res.render("search");
	res.render("footer",{'js':{'code':"jQuery(document).ready(function($) { $('.facet-view-simple').facetview(); });"}});
*/	

app.get("/",function(req,res,next) {
	res.render("index");
});

app.get('/widget/load', function(req, res){
    // what kind of widget was requested?
    // with what parameters?
    // print out custom widget
  res.send('prints out custom widget js');
});

app.get('/widget', function(req, res){
    // display form for generating custom widget code
    // result <script src="http://hakemisto.kirjastot.fi/widget/load/?area=helmet"></script>
  res.send('prints out customization wizard');
});

port = 8080;
app.listen(port);
console.log("Server started at port " + port);

