var util = require('util');
var fs = require('fs');

try {
    var content = fs.readFileSync("./config.json",'utf8').replace('\n', '');
} catch(err) {
    util.debug(err);
    throw("Please set up your configuration by copying the config.json-template");
}
try {
	var conf = JSON.parse(content);
} catch (err) {
    util.debug(err);
    throw "Syntax error in config.json";
}

function logrequest(req){
    url = decodeURIComponent(req.url);
    ip_address = req.connection.remoteAddress;
    user_agent = req.headers['user-agent'];
    timestamp = new Date().toJSON();
    
    console.log(ip_address + " - \"" + user_agent + "\" [" + timestamp + "] \"GET " + url + " HTTP/1.1\" 200 1");
//    console.log(req);
}

var config = conf.proxy_config;
var proxy = require('./node_modules/elasticsearch-proxy').getProxy(config, logrequest).start();
