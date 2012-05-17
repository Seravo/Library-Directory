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
    app.use(express.static(__dirname + "/output", { maxAge: 0 }));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// if started with $ NODE_ENV=production node server.js
app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/output', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

var fs = require('fs');
header = hogan.compile(fs.readFileSync(__dirname + '/output/views/header.mustache', 'utf-8'));
footer = hogan.compile(fs.readFileSync(__dirname + '/output/views/footer.mustache', 'utf-8'));
context = {};

/* 
route logic:
if /(.*) <html lang="fi"...
if /fi/(.*) -> html lang fi
if /en/(.*) -> html lang en
if /sv/(.*) -> html lang sv
*/

// Hogan.js does not support template inheritance yet, must do workaround
// https://gist.github.com/1854699
app.get("/",function(req,res,next) {
    context.header = header.render({search_active: true});
    context.footer = footer.render({js_code: "jQuery(document).ready(function($) { $('.facet-view-simple').facetview(); });", js_files: [{src: 'http://maps.google.com/maps/api/js?v=3.6&amp;sensor=false'}, {src: 'js/libs/openlayers/openlayers.js'}]});
	res.render("index", context);
});

var http = require('http');
function get_libraries(callback) {
    var options = {
      host: 'localhost',
      port: 9200,
      path: '/testink/organisation/_search?source',
      method: 'GET'
    };
    var req = http.get(options, function(res) {
      console.log('GET: ' + options.path);
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      data = '';
      res.on('data', function(chunk){ 
        data += chunk;
        console.log("..read chunk..");
      });
      res.on('end', function() {
          callback(JSON.parse(data));
      });
    }).on('error', function(e) {
      console.log('Problem with request: ' + e.message);
    });
}

function print_libraries(data) {
    console.log("data: " + JSON.stringify(data.hits.hits[3]._source.name_fi));
}
app.get("/browse",function(req,res,next) {
    context = {};
    context.header = header.render({title: "Browse all", browse_active: true});
    context.footer = footer.render();
    get_libraries(print_libraries);
	res.render("browse", context);
});

app.get("/about",function(req,res,next) {
    context.header = header.render({title: "About", about_active: true});
    context.footer = footer.render();
	res.render("about", context);
});

app.get("/contact",function(req,res,next) {
    context.header = header.render({title: "Contact", contact_active: true});
    context.footer = footer.render();
	res.render("contact", context);
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

