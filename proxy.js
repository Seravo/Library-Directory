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
    console.log(url);
}

var config = conf.proxy_config;
var proxy = require('./node_modules/elasticsearch-proxy').getProxy(config, logrequest).start();
