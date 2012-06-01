// export NODE_PATH="/usr/lib/node_modules/"

// Use consolidate.js in Express.js 3.0, otherwise custom adaptor
// var cons = require('consolidate');
var hogan = require('hogan');
var adapter = require('hogan-express.js');
var fs = require('fs');

var connect = require('connect');
var express = require('express');
var app = express.createServer(),
    form = require("express-form"),
    filter = form.filter,
    validate = form.validate;

// don't use flash() since it requires sessions and cookies
// and we don't want to pollute our site and bust cache with cookies
form.configure({flashErrors: false});

// default settings assume development environment
app.configure(function(){
    app.use(express.logger('dev'))
    app.use(express.methodOverride());
    app.use(express.bodyParser());
	app.set('view engine','mustache');
	app.set('view options',{layout:false});
	app.set('views',__dirname + '/views');
	app.register('mustache',adapter.init(hogan));    
    app.use(connect.compress()); // works for static files, but not for res.render?
    app.use(express.static(__dirname, { maxAge: 0 }));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    headerfile = '/views/header-dev.mustache';
    footerfile = '/views/footer-dev.mustache';
});

// override specific settings if started with $ NODE_ENV=production node server.js
app.configure('production', function(){
    console.log("Use production settings.");
    app.set(app.router, false); // must be last so that wildcard route does not override 
    app.set('views',__dirname + '/output/views');
    var oneYear = 31557600000;
    app.use(express.static(__dirname + '/output', { maxAge: oneYear }));
    app.use(express.errorHandler());
    headerfile = '/output/views/header.mustache';
    footerfile = '/output/views/footer.mustache';
});

// route must always be defined last and only last (override does not work)
app.configure(function(){
    app.use(app.router); // must be last so that it's wildcard route does not override anything else
    // 404 page, really last if not any route matched
    app.use(function(req, res, next){
        fs.readFile(__dirname + "/output/views/404.html", function(error, content) {
            if (error) {
                res.writeHead(500);
                res.end();
            }
            else {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(content, 'utf-8');
            }
        });
    });
});


// get list of all libraries
var http = require('http');
function get_libraries(callback) {
    var options = {
      host: 'localhost',
      port: 8888,
      path: '/testink/organisation/_search?size=999&sort=name_fi',
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
      });
      res.on('end', function() {
          callback(JSON.parse(data));
      });
    }).on('error', function(e) {
      console.log('Problem with request: ' + e.message);
    });
}

// get a specific library
function get_library_by_id(id, callback) {
    var options = {
      host: 'localhost',
      port: 8888,
      path: '/testink/organisation/' + id,
      method: 'GET'
    };
    var req = http.get(options, function(res) {
      res.setEncoding('utf8');
      data = '';
      res.on('data', function(chunk){
        data += chunk;
        // console.log("...read chunk: " + chunk);
      });
      res.on('end', function() {
          callback(JSON.parse(data));
      });
    }).on('error', function(e) {
      console.log('Problem with request: ' + e.message);
    });
}

// get a library with partial name
function get_library_by_name(name, callback) {
    query =
    {
      "size": 1,
      "sort": [ { "name_fi" : {} } ],
      "query":
     { "query_string":
       {
         "fields": ["name_short_fi*"],
         "query": name+"*"
       }
     }
    };
    query = JSON.stringify(query);

    var options = {
      host: 'localhost',
      port: 8888,
      path: '/testink/organisation/_search',
      method: 'POST',
      headers: {  
          'Content-Type': 'application/x-www-form-urlencoded',  
          'Content-Length': query.length  
      }
    };
   
    var req = http.request(options, function(res) {
      res.setEncoding('utf8');
      data = '';
      res.on('data', function(chunk){
        data += chunk;
        // console.log("...read chunk: " + chunk);
      });
      res.on('end', function() {
          callback(JSON.parse(data));
      });
    }).on('error', function(e) {
      console.log('Problem with request: ' + e.message);
    });
    req.write(query);  
    req.end();  
}


function get_library_open_hours(periods) {
	function ld_format_time(time) {
		var time = String(time);
		var mins = time.slice(-2);
		var hrs = time.slice(0,-2);

		return hrs+":"+mins;
	}

	function ld_get_minutes(time) {
		var mins = Number(time.slice(-2));
		var hrs = Number(time.slice(0,-2));

		return hrs*60+mins;
	}

	function ld_open_now(timerange) {
		var start = String(timerange.start)
		var stop = String(timerange.end)

		var timestamp = new Date();
		var mins = timestamp.getMinutes();
		var hrs = timestamp.getHours();

		var current_time = hrs*60+mins;
		var start_time = ld_get_minutes(start);
		var end_time = ld_get_minutes(stop);

		/* 15 minute buffer for closing-time */
		/*if (current_time>=start_time && (current_time+15)<=end_time) return true; */
		if (current_time>=start_time && current_time<=end_time) return true;
		else return false;
	}

	var days = [ "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday" ];
	var days_en = [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ];
	var days_fi = [ "Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai", "Sunnuntai" ];

	var opening_hours = new Object();
	var curtime = new Date();
	var unixtime = curtime.getTime(); /* -24*60*60*1000*7; */
	var daynum = curtime.getDay();

	/* js daynum is 0-6 starting from sunday, libdir daynum is 0-6 starting from monday, fix it */
	if (daynum==0) daynum = 7;
	daynum = daynum-1;

	/* get timestmp for current week's monday */
	var mondaystamp = unixtime-24*60*60*1000*daynum;
	// console.log(unixtime, mondaystamp);

	/* library is not open until proven otherwise */
	opening_hours.open_now = false;
	opening_hours.open_hours_today = false;
	opening_hours.open_hours_week = [];
	for (var j=0; j<7; j++) {
		opening_hours.open_hours_week[j] = { "day": days_en[j], "time": "closed" };
	}

	/* iterate all periods */
	for (var i in periods) {
		var p = periods[i];
		/* check each weekday within period */
		for (var j=0; j<7; j++) {
			var start = p[days[j]+"_start"];
			var end = p[days[j]+"_end"];

			/* find opening hours for current week */
			var curday = mondaystamp + 24*60*60*1000*j;
			//if (j==6) console.log(p.name_fi, days[j], curday, Date.parse(p.start), Date.parse(p.end), curday >= Date.parse(p.start) && curday <= Date.parse(p.end))
			if ( curday >= Date.parse(p.start) && curday <= Date.parse(p.end) ) {
				if ( (start!=0 && end!=0) && (start!= null && end!= null) ) {
					opening_hours.open_hours_week[j] = { "day": days_en[j], "time": ld_format_time(start) + " - " + ld_format_time(end) }; }
				else {
					opening_hours.open_hours_week[j] = { "day": days_en[j], "time": "closed" }; }
			}

			/* find opening hours for current day */
			//if (j==4) console.log(p.name_fi, days[j], unixtime, Date.parse(p.start), Date.parse(p.end), unixtime >= Date.parse(p.start) && unixtime <= Date.parse(p.end))
			if ( unixtime >= Date.parse(p.start) && unixtime <= Date.parse(p.end) && j==daynum ) {
				if ( (start!=0 && end!=0) && (start!= null && end!= null) ) {
					opening_hours.open_now = ld_open_now( { start: start, end: end } );
					opening_hours.open_hours_today = ld_format_time(start) + " - " + ld_format_time(end);
				}
			}
		}
	}
	return opening_hours;
}

/* 
route logic:
if /(.*) <html lang="fi"...
if /fi/(.*) -> html lang fi
if /en/(.*) -> html lang en
if /sv/(.*) -> html lang sv
*/

// init variable
var context = {};
header = hogan.compile(fs.readFileSync(__dirname + headerfile, 'utf-8'));
footer = hogan.compile(fs.readFileSync(__dirname + footerfile, 'utf-8'));

var watch = require('nodewatch');
// Adding 2 dirs relative from process.cwd()
// Nested dirs are not watched
// dirs can also be added absolute
watch.add("./views").onChange(function(file,prev,curr,action){
    // .add("./output/views") omitted since it would crash entire server.js
    // each time h5bp is run and output folder emptied
    console.log("Views changed and reloaded");
    // Hogan.js does not support template inheritance yet, must do workaround
    // https://gist.github.com/1854699
    header = hogan.compile(fs.readFileSync(__dirname + headerfile, 'utf-8'));
    footer = hogan.compile(fs.readFileSync(__dirname + footerfile, 'utf-8'));
});
 
app.get("/",function(req,res,next) {
    res.local("header", header.render({search_active: true}))
    res.local("footer", footer.render({js_code: "jQuery(document).ready(function($) { $('.facet-view-simple').facetview(); });", js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
	res.render("index", res.locals());
});

app.get("/browse",function(req,res,next) {
    res.local("header", header.render({title: "Browse all", browse_active: true}))
    res.local("footer", footer.render());
    get_libraries(function(data){
		res.local("count", data.hits.total);
        res.local("libraries", []);
        for (var item in data.hits.hits) {
			data.hits.hits[item]._source["id"] = data.hits.hits[item]._id;
			res.local("libraries").push(data.hits.hits[item]._source);
		}
    	res.render("browse", res.locals());
    });
});

app.get("/about",function(req,res,next) {
    res.local("header", header.render({title: "About", about_active: true}))
    res.local("footer", footer.render());
	res.render("about", res.locals());
});

app.post("/contact", // Route
  
  form( // Form filter and validation middleware
    filter("fname").trim(),
    validate("fname", "Name").required().notEmpty(),
    filter("femail").trim(),
    validate("femail", "E-mail").required("Please provide your e-mail so we can respond to your feedback.").isEmail(),
    validate("fmessage", "Feedback").required().notEmpty()
  ),

  // Express request-handler gets filtered and validated data
  function(req, res){
    if (!req.form.isValid) {
      // Handle errors
      res.local("errors", req.form.getErrors());
      res.local("header", header.render({title: "Contact", contact_active: true}));
      res.local("footer", footer.render());
      res.render("contact", res.locals());

    } else {
      // Or, use filtered form data from the form object:
      // TODO: email feedback
      res.redirect('/feedback-sent');
    }
  }
);

app.get("/contact",function(req,res,next) {
    res.local("header", header.render({title: "Contact", contact_active: true}))
    res.local("footer", footer.render());
	res.render("contact", res.locals());
});

app.get("/feedback-sent",function(req,res,next) {
	console.log(JSON.stringify(res.locals()));
    res.local("header", header.render({title: "Feedback sent", contact_active: true}))
    res.local("footer", footer.render());
	res.render("feedback-sent", res.locals());
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

app.get("/id/:id",function(req,res,next) {
    res.local("header", header.render({title: "Library details", browse_active: true}))
    res.local("footer", footer.render());

    get_library_by_id(req.params.id, function(data){
		data._source["id"] = data._id;
		res.local("data", data._source);
    	res.local("data").opening_hours = get_library_open_hours(res.local("data").period);
		res.render("library_details", res.locals());
		});
});

app.get("/*",function(req,res,next) {
    res.local("header", header.render({title: "Library details", browse_active: true}))
    res.local("footer", footer.render());
    console.log("Requested: "+req.params);
    get_library_by_name(req.params[0], function(data){
        console.log("total: "+data.hits.total);
        if (data.hits.total > 0) {
		    data.hits.hits[0]._source["id"] = data.hits.hits[0]._id;
		    res.local("data", data.hits.hits[0]._source);
			console.log(res.local("data").period);
			res.local("data").opening_hours = get_library_open_hours(res.local("data").period);
		    res.render("library_details", res.locals());
		} else {
		    next(); // do standard 404
		    // TODO: the standard 404 is ugly, make nicer
	    };
	});
});

port = 8080;
app.listen(port);
console.log("Server started at port " + port);

