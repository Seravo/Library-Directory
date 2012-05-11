// export NODE_PATH="/usr/lib/node_modules/"
var express = require('express');
var app = express.createServer();

app.configure(function(){
    app.use(express.logger('dev'))
//    app.use(express.compress())
    app.use(express.directory(__dirname))
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.static(__dirname));
// in production?    app.use(express.static(__dirname + '/static'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(app.router);
});

/* 
route logic:
if /(.*) <html lang="fi"...
if /fi/(.*) -> html lang fi
if /en/(.*) -> html lang en
if /sv/(.*) -> html lang sv
*/

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

