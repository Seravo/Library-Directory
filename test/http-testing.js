/* jshint node:true */
/* global conf */
'use strict';
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

var request = require('supertest');
var chai = require('chai');
var chaiHttp = require('chai-http');
chai.use(chaiHttp);

var app = conf.server_host + ':' + conf.server_port;

describe('API tests', function(){

  it('Expect "/" returns html with status 200', function(done){
    chai.request(app)
      .get('/')
      .res(function (res) {
        chai.expect(res).to.have.status(200);
        chai.expect(res).to.be.html;
        done();
      });
  });

})
