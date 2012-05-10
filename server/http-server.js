// export NODE_PATH="/usr/lib/node_modules/"
var connect = require('connect');

var con_app = connect()
  .use(connect.logger('dev'))
  .use(connect.compress())
  .use(connect.directory('../'))
  .use(connect.static('../'))
 .listen(8080);

var express = require('express');
var app = express.createServer();

app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.static(__dirname + '/static'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(app.router);
});

app.get('/', function(req, res){
  res.send('hello world');
});

port = 3000;
app.listen(port);
console.log("Server started at port " + port);
