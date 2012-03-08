// This file is provided to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file
// except in compliance with the License.  You may obtain
// a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

var proxyFactory = require('./lib/elasticsearch-proxy');
var http = require('http');

var getClusterStatus = function(proxy) {
    
    var proxyClient = http.createClient(proxy.getPort(), proxy.getHost());
    var request = proxyClient.request("GET", "/_status");
    
    request.on('response', function(response) {

        var data = "";

        console.log('STATUS: ' + response.statusCode);
        console.log('HEADERS: ' + JSON.stringify(response.headers));

        response.on('data', function(chunk) {
            data += chunk;
        });

        response.on('end', function() {
            console.log('RESPONSE BODY: ' + JSON.stringify(JSON.parse(data),null,'  '));
        });
    });
    console.log("Getting cluster state");
    request.end();

};

var preRequest = function(request) {
    console.log("This function is executed before request is sent to Elastic Search cluster.");
};

var postRequest = function(request, response, responseData) {
    console.log("This function is executed after receiving response from Elastic Search cluster.");
    var json = JSON.parse(responseData);
    delete json.indices;
    return JSON.stringify(json);
};

var proxyServer = proxyFactory.getProxy(preRequest, postRequest);
proxyServer.start(
    function(){
        var id = setInterval(function(){getClusterStatus(proxyServer)},1000);
        setInterval(function(){
            clearInterval(id);
            proxyServer.stop();
        },6500);
});
get
