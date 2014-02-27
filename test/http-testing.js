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
var elasticsearch = 'localhost:8888/testink/organisation/_search?'

describe('Libdir tests', function(){

  it('Expect GET "/" returns 200', function(done){
    chai.request(app)
      .get('/')
      .res(function (res) {
        chai.expect(res).to.have.status(200);
        chai.expect(res).to.be.html;
        done();
      });
  });

  it('Expect GET "/en" returns 200', function(done){
    chai.request(app)
      .get('/en')
      .res(function (res) {
        chai.expect(res).to.have.status(200);
        chai.expect(res).to.be.html;
        done();
      });
  });

  it('Expect GET "/sv" returns 200', function(done){
    chai.request(app)
      .get('/sv')
      .res(function (res) {
        chai.expect(res).to.have.status(200);
        chai.expect(res).to.be.html;
        done();
      });
  });

  it('Expect GET "/nonexisitngpage" still returns 200', function(done){
    chai.request(app)
      .get('/nonexisitngpage')
      .res(function (res) {
        chai.expect(res).to.have.status(200);
        chai.expect(res).to.be.html;
        done();
      });
  });

  it('Expect POST "/personnel-search" returns 200', function(done){
    chai.request(app)
      .post('/personnel-search')
      .req(function (req) {
        req.send({sstr:'Mika'});
      })
      .res(function (res) {
        chai.expect(res).to.have.status(200);
        chai.expect(res).to.be.html;
        done();
      });
  });

  it('Expect empty POST "/personnel-search" returns 500', function(done){
    chai.request(app)
      .post('/personnel-search')
      .req(function (req) {
        req.send();
      })
      .res(function (res) {
        chai.expect(res).to.have.status(500);
        done();
      });
  });

});

describe('Elasticsearch tests', function(){
  it('Expect main (library) search returns json', function(done){
    var query = {"sort":[{"name_fi":{}}],"query":{"filtered":{"query":{"query_string":{"fields":["name_*","name_short_*","contact.street_address.municipality_*","contact.street_address.post_code*","services.name_*","description_*"],"query":"Pasila*","default_operator":"AND"}},"filter":{"and":[{"terms":{"organisation_type":["branchlibrary","library"]}},{"term":{"meta.document_state":"published"}}]}}},"size":50,"facets":{"contact.street_address.municipality_en":{"terms":{"field":"contact.street_address.municipality_en","order":"term","size":400}},"services.name_en":{"terms":{"field":"services.name_en","order":"term","size":500}},"accessibility.accessible_entry":{"terms":{"field":"accessibility.accessible_entry"}},"accessibility.accessible_parking":{"terms":{"field":"accessibility.accessible_parking"}},"accessibility.accessible_toilet":{"terms":{"field":"accessibility.accessible_toilet"}},"accessibility.induction_loop":{"terms":{"field":"accessibility.induction_loop"}},"accessibility.large_typeface_collection":{"terms":{"field":"accessibility.large_typeface_collection"}},"accessibility.lift":{"terms":{"field":"accessibility.lift"}},"accessibility.extraaccessibilityinfo":{"terms":{"field":"accessibility.extraaccessibilityinfo"}},"consortium":{"terms":{"field":"consortium","size":100,"order":"term"}},"provincial_area":{"terms":{"field":"provincial_area","size":100,"order":"term"}},"organisation_type":{"terms":{"field":"organisation_type"}},"branch_type":{"terms":{"field":"branch_type"}}}};
    chai.request(app)
      .get(elasticsearch)
      .req(function (req) {
        req.send(query);
      })
      .res(function (res) {
        chai.expect(res).to.have.status(200);
        chai.expect(res).to.be.json;
        done();
      });
  });

  it('Expect main (library) search returns json', function(done){
    var query = {"sort":[{"name_fi":{}}],"query":{"filtered":{"query":{"query_string":{"fields":["name_*","name_short_*","contact.street_address.municipality_*","contact.street_address.post_code*","services.name_*","description_*"],"query":"Pasila*","default_operator":"AND"}},"filter":{"and":[{"terms":{"organisation_type":["branchlibrary","library"]}},{"term":{"meta.document_state":"published"}}]}}},"size":50,"facets":{"contact.street_address.municipality_en":{"terms":{"field":"contact.street_address.municipality_en","order":"term","size":400}},"services.name_en":{"terms":{"field":"services.name_en","order":"term","size":500}},"accessibility.accessible_entry":{"terms":{"field":"accessibility.accessible_entry"}},"accessibility.accessible_parking":{"terms":{"field":"accessibility.accessible_parking"}},"accessibility.accessible_toilet":{"terms":{"field":"accessibility.accessible_toilet"}},"accessibility.induction_loop":{"terms":{"field":"accessibility.induction_loop"}},"accessibility.large_typeface_collection":{"terms":{"field":"accessibility.large_typeface_collection"}},"accessibility.lift":{"terms":{"field":"accessibility.lift"}},"accessibility.extraaccessibilityinfo":{"terms":{"field":"accessibility.extraaccessibilityinfo"}},"consortium":{"terms":{"field":"consortium","size":100,"order":"term"}},"provincial_area":{"terms":{"field":"provincial_area","size":100,"order":"term"}},"organisation_type":{"terms":{"field":"organisation_type"}},"branch_type":{"terms":{"field":"branch_type"}}}};
    chai.request(app)
      .get(elasticsearch)
      .req(function (req) {
        req.send(query);
      })
      .res(function (res) {
        chai.expect(res).to.have.status(200);
        chai.expect(res).to.be.json;
        done();
      });
  });

  it('Expect widget library search returns json', function(done){
    var query = {"size":10,"sort":[{"name_fi":{}}],"query":{"query_string":{"fields":["contact.street_address.street_*","name_*"],"query":"*pasila*"}}};
    chai.request(app)
      .get(elasticsearch)
      .req(function (req) {
        req.send(query);
      })
      .res(function (res) {
        chai.expect(res).to.have.status(200);
        chai.expect(res).to.be.json;
        done();
      });
  });

});

