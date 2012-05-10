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
app.get('/', function(req, res){
  res.send('hello world');
});
*/

port = 8080;
app.listen(port);
console.log("Server started at port " + port);
