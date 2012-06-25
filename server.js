// export NODE_PATH="/usr/lib/node_modules/"
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

// Gettext
// _() might conflict with underscore.js, but not an issue for us
// do withouth var, makes global
gettext = require('gettext'),
    _ = gettext.gettext;

//gettext.setlocale('LC_ALL', 'en'); // default language English
gettext.setlocale('LC_ALL', 'fi'); // default language Finnish (for server, not single request!)
lang = gettext.lang; // save in global variable

// load all localizations at once
gettext.loadLocaleDirectory("locale", function(){
	var languages = []
	for (var key in gettext.data) {
		languages.push(key);
	}
	console.log("Loaded messages for: " + languages.join(" "));
});

function rlog(str) { console.log(str); }

function switch_locale(req) {
	var browser_lang = req.locale;   // accept-language: fi;q=1
	var path_lang = req.params.lang; // /fi/about
	var get_lang = req.query.lang;   // /about?lang=fi

	//console.log(browser_lang, path_lang, get_lang);
	// locale precedence:
	// 1) get var 2) request path 3) browser setting
	var locale = lang; // default application language (fi) from global var if nothing else is defined
	if (browser_lang != undefined) locale = browser_lang;
	if (path_lang != undefined) locale = path_lang;
	if (get_lang != undefined) locale = get_lang;

	gettext.setlocale("LC_ALL", locale);
}

// Use consolidate.js in Express.js 3.0, otherwise custom adaptor
// var cons = require('consolidate');
var hogan = require('hogan');
var adapter = require('hogan-express.js');

var connect = require('connect');
var express = require('express');
var	locale = require("locale");
var	supported_locales = ["en", "fi", "sv"];

var app = express.createServer(locale(supported_locales)),
    form = require("express-form"),
    filter = form.filter,
    validate = form.validate;

// don't use flash() since it requires sessions and cookies
// and we don't want to pollute our site and bust cache with cookies
form.configure({flashErrors: false});

// default settings assume development environment
app.configure('dev', function(){
    console.log("Using development settings.");
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

// specific settings if started with $ NODE_ENV=prod node server.js
app.configure('prod', function(){
    console.log("Using production settings.");
    //app.use(express.logger('dev'))
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.set(app.router, false); // must be last so that wildcard route does not override
	app.set('view engine','mustache');
	app.set('view options',{layout:false});
    app.set('views',__dirname + '/output/views');
	app.register('mustache',adapter.init(hogan));
    app.use(connect.compress()); // works for static files, but not for res.render?
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
		res.local("header", header.render(req, {title: _("Not found"), about_active: true}));
		res.local("footer", footer.render());
		res.render("404", res.locals());
    });
});

// route handler for all dynamic data without language path
app.get("/:resource(*)",function(req,res,next) {
	//rlog(":resource -->");
	route_parser(req,res,next);
});

// route handler for all dynamic data with language path
app.get("/:lang(fi|en|sv)/:resource(*)",function(req,res,next) {
	//rlog(":lang/:resource -->");
	route_parser(req,res,next);
});

function route_parser(req,res,next) {

    // check that hostname matches, otherwise redirect
    //console.log("expected hostname: "+conf.server_host);
    hostname = req.headers.host.match(/([0-9A-Za-z-.]+)(:[0-9]+)?/)[1];
    //console.log("actual hostname: "+hostname);
    
    if (hostname != conf.server_host){
        res.redirect("http://"+conf.server_host+":"+conf.server_port+req.url, 301); // 301 for permanent redirect
        return; // nothing more to do here!
    }

	switch_locale(req);
	var page = req.params.resource;
	//rlog("request: " + page);

	// static page
	if (page == '' || page.match(/^(about|browse|contact|feedback-sent|search|widget|loadwidget|widget[0-9])$/)) {
		//rlog("match page");
		render_static_page(page, req, res);
	}

	// get library by slug
	else if (page.match(/^[a-z-]+$/)) {
		//rlog("match slug");
		render_library_by_slug(page, req, res);
	}

    // TODO: there should be some more universal code to handle 
    // trailing slashes and redirects
	// get library by slug, redirect to remove trailing slash
	else if (page.match(/^[a-z-]{3,60}\/$/)) { // {3,60} to inhibit redirect loop for /en/ and /sv/
		//rlog("match slug");
  		res.redirect(req.url.slice(0,-1), 301);
	}
	
	// get library by id
	else if (page.match(/^[a-zA-Z0-9_-]{22}$/)) {
		//rlog("match id");
		render_library_by_id(page, req, res);
	}

	// static assets and unmatched requests
	else {
		//rlog("UNMATCHED: " + page);
		next('route');
	}
}

app.post("/contact", // Route

  form( // Form filter and validation middleware
    filter("fname").trim(),
    validate("fname", _("Name")).required().notEmpty(),
    filter("femail").trim(),
    validate("femail", _("E-mail")).required(_("Please provide your e-mail so we can respond to your feedback.")).isEmail(),
    validate("fmessage", _("Feedback")).required().notEmpty()
  ),

  // Express request-handler gets filtered and validated data
  function(req, res){
    if (!req.form.isValid) {
      // Handle errors
      res.local("errors", req.form.getErrors());
      res.local("header", header.render(req, {title: _("Contact"), contact_active: true}));
      res.local("footer", footer.render());
      res.render("contact", res.locals());

    } else {
        // Or, use filtered form data from the form object:

        message = _("Feedback from: ") + req.form.fname + " <" + req.form.femail + "> \n\nMessage: \n" + req.form.fmessage + "\n";
        console.log("Feedback message: " + message);
        var nodemailer = require("nodemailer");
        console.log("conf.nodemailer_config: " + conf.nodemailer_config);

        // create reusable transport method (opens pool of SMTP connections)
        var smtpTransport = nodemailer.createTransport("SMTP", conf.nodemailer_config);

        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: "Library directory <noreply@seravo.fi>", // sender address
            to: conf.nodemailer_config.feedbackto, // list of receivers
            subject: _("Feedback from library directory"), // Subject line
            text: message // plaintext body
        }

        // send mail with defined transport object
        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error){
                console.log(error);
            }else{
                console.log("Message sent: " + response.message);
            }

            // if you don't want to use this transport object anymore, uncomment following line
            //smtpTransport.close(); // shut down the connection pool, no more messages
        });
        res.redirect('/feedback-sent');
    }
  }
);

function render_static_page(page, req, res) {
	switch_locale(req);

	switch(page) {
		case "about":
			res.local("header", header.render(req, {title: _("About"), about_active: true}));
			res.local("footer", footer.render());
			res.render("about", res.locals());
			break;

		case "browse":
			res.local("header", header.render(req, {title: _("Browse all"), browse_active: true}))
			res.local("footer", footer.render());
			get_libraries(function(data){
				switch_locale(req);
				res.local("count", data.hits.total);
				res.local("libraries", []);
				for (var item in data.hits.hits) {
					data.hits.hits[item]._source["id"] = data.hits.hits[item]._id;
					res.local("libraries").push(data.hits.hits[item]._source);
				}
				res.render("browse", res.locals());
			});
			break;

		case "contact":
			res.local("header", header.render(req, {title: _("Contact"), contact_active: true}));
			res.local("footer", footer.render());
			res.render("contact", res.locals());
			break;

		case "search":
		case "":
			res.local("header", header.render(req, {search_active: true}))
			res.local("footer", footer.render({js_code: "jQuery(document).ready(function($) { $('.facet-view-simple').facetview(); });", js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
			res.render("index", res.locals());
			break;

		case "feedback-sent":
			//console.log(JSON.stringify(res.locals()));
			res.local("header", header.render(req, {title: _("Feedback sent"), contact_active: true}))
			res.local("footer", footer.render());
			res.render("feedback-sent", res.locals());
			break;

		// widget creation wizard
		case "widget":
			res.local("header", header.render(req, {title: "Widget wizard", widget_active: true}))
			res.local("footer", footer.render({js_code: "jQuery(document).ready(function($) { ld_widget_wizard(); });"}));
			res.render("widget_wizard", res.locals());
			break;

		// search with consortium selection /widget1/area=foo
		case "widget1":
			switch_locale(req);
			var filter = req.query.area || "";
			var js_code = "jQuery(document).ready(function($) { $('.facet-view-simple').facetview({filter: '" + filter + "'}); });";

			res.local("header", header.render(req, { nobanners: true }));
			res.local("footer", footer.render({ nobanners: true, js_code: js_code, js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
			res.render("widget1", { lang: gettext.lang });
			break;

		// library details - lite
		case "widget2":
			switch_locale(req);
			get_library_by_id(req.query.id, function(data) {
				data._source["id"] = data._id;
				switch_locale(req);

				res.local("header", header.render(req, { nobanners: true }));
				res.local("footer", footer.render({ nobanners: true, js_code: "jQuery(document).ready(function($) { library_details_map(); });", js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
				res.render("widget2", { data: data._source });
			});
			break;

		// library details - full
		case "widget3":
			switch_locale(req);
			get_library_by_id(req.query.id, function(data) {
				data._source["id"] = data._id;
				switch_locale(req);

				res.local("header", header.render(req, { nobanners: true }));
				res.local("footer", footer.render({ nobanners: true, js_code: "jQuery(document).ready(function($) { library_details_map(); });", js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
				res.render("widget3", { data: data._source } );
			});
			break;

		case "loadwidget":
			// get library details for widget
			if (req.query.id != undefined) {
				switch_locale(req);
				get_library_by_id(req.query.id, function(data) {
					switch_locale(req);

					data._source["id"] = data._id;

					var jsondata = {};
					jsondata.html = widget.render(req, { data: data._source });
					res.send(req.query.callback + '(' + JSON.stringify(jsondata) + ')');
				});
			}
			break;

		default:
			res.local("header", header.render(req, {title: _("Not found") }));
			res.local("footer", footer.render());
			res.render("404", res.locals());
			break;
	}
}


function render_library_by_id(page, req, res) {
	switch_locale(req);

    res.local("header", header.render(req, {title: _("Library details")}))
    res.local("footer", footer.render({js_code: "jQuery(document).ready(function($) { library_details_map(); });", js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
    //console.log("Requested: "+req.params.id);
    get_library_by_id(page, function(data){
		switch_locale(req);
		var id = data._id;
		data._source["id"] = id;

		var library = data._source;

		get_library_children(id, function(child_data) {
			switch_locale(req);
			if (child_data.hits.hits.length>0)
			{
				var children = [];
				for (item in child_data.hits.hits) {
					var child = child_data.hits.hits[item]._source;
					child.id = child_data.hits.hits[item]._id;
					children.push(child);
				}

				library.children = children;
				library.has_children = true;
			} else {
				library.has_children = false;
			}

			res.local("data", library);
			res.render("library_details", res.locals());
		});
	});
}


function render_library_by_slug(slug, req, res) {
	switch_locale(req);
    res.local("header", header.render(req, {title: _("Library details")}))
    res.local("footer", footer.render({js_code: "jQuery(document).ready(function($) { library_details_map(); });", js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
    console.log("Requested: "+req.params);
    get_library_by_name(slug, req, function(data){
		switch_locale(req);
        console.log("total: "+data.hits.total);
        if (data.hits.total > 0) {
		    data.hits.hits[0]._source["id"] = data.hits.hits[0]._id;
		    res.local("data", data.hits.hits[0]._source);
		    res.render("library_details", res.locals());
		}
	});
}

// get list of all libraries
var http = require('http');
function get_libraries(callback) {

	var query = {
		"size": 999,
		"sort": [ { "name_fi" : {} } ],
		"query":
			{ "bool":
				{ "should" :
					[
						{ "term" : { "organisation_type" : "library" } },
						{ "term" : { "organisation_type" : "branchlibrary" } }
					]
				}
			}
		};

	query = JSON.stringify(query);
	query = encodeURIComponent(query);

    var options = {
      host: conf.proxy_config.host,
      port: 8888,
      path: '/testink/organisation/_search?source='+query,
      method: 'GET'
    };

    var req = http.get(options, function(res) {
      //console.log('GET: ' + options.path);
      //console.log('STATUS: ' + res.statusCode);
      //console.log('HEADERS: ' + JSON.stringify(res.headers));
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

// enrich result meta data
function add_library_metadata(dataobj, callback){
    //console.log(JSON.stringify(dataobj, null, 4).slice(0,500));

    if (typeof dataobj.exists == false) {
        console.log("Bogus request: no matching record for id");
        return false; // TODO: write better error handling with error message to end user
    }
    if (typeof dataobj._source == "undefined") {
        dataobj._source = dataobj.hits.hits[0]._source;
    }

    dataobj._source.opening_hours = get_library_open_hours(dataobj._source.period);

    switch(dataobj._source.organisation_type) {
        case "library":
        case "unit":
        case "department":
            dataobj._source.neveropen = true;
            break;
    }

	var lib = dataobj._source;

	for (var item in lib.contact.internet) {
		var temp = lib.contact.internet[item];
		// TODO: Could these be more universally expressed to support any language?
		if (typeof temp.url_description_fi=='string' && temp.url_description_fi=="") delete temp.url_description_fi;
		if (typeof temp.url_description_sv=='string' && temp.url_description_sv=="") delete temp.url_description_sv;
		if (typeof temp.url_description_en=='string' && temp.url_description_en=="") delete temp.url_description_en;
	}

	if (lib.image_url=="") delete lib.image_url;

	if (lib.accessibility.accessible_entry ||
		lib.accessibility.accessible_parking ||
		lib.accessibility.accessible_toilet ||
		lib.accessibility.induction_loop ||
		lib.accessibility.large_typeface_collection ||
		lib.accessibility.lift ||
		lib.extraaccessibilityinfo ) { lib.accessibility_available = true }

    // delete empty object so that they will not be displayed in Mustache templates
    if (dataobj._source.additional_info.slug == '') {
        delete dataobj._source.additional_info.slug;
    }
	if (dataobj._source.parent_organisation == '') {
		delete dataobj._source.parent_organisation;
	}
    if (dataobj._source.contact.telephones[0].telephone_number == '') {
        delete dataobj._source.contact.telephones;
    }
    // TODO: Change data model to have own extrainfo branches for each language
    if (dataobj._source.additional_info.extrainfo[0].property_label_fi == '') {
        delete dataobj._source.additional_info;
    }
    if (dataobj._source.established_year == '') {
        delete dataobj._source.established_year;
    }
    
    // delete empty service fields
    dataobj._source.services.forEach( function(s) { 
        if (s.description_short_fi == '') { delete s.description_short_fi; }
        if (s.description_short_sv == '') { delete s.description_short_sv; }
        if (s.description_short_en == '') { delete s.description_short_en; }
        if (s.description_long_fi == '') { delete s.description_long_fi; }
        if (s.description_long_sv == '') { delete s.description_long_sv; }
        if (s.description_long_en == '') { delete s.description_long_en; }
        if (s.price == '') { delete s.price; }
        if (s.for_loan == '') { delete s.for_loan; }
        if (s.instance_name_fi == '') { delete s.instance_name_fi; }
        if (s.instance_name_sv == '') { delete s.instance_name_sv; }
        if (s.instance_name_en == '') { delete s.instance_name_en; }
        if (s.tag[0] == '') { delete s.tag[0]; }
		if (s.contact != undefined) {
			if (s.contact[0] == '') { delete s.contact[0]; }
		}

        // style label for visuals
        // use Twitter Bootstrap classes
        if (s.type == 'laite') { s.type = _("service type device"); s.label = "label-inverse"; }
        if (s.type == 'tila') { s.type = _("service type room"); s.label = "label-info"; }
        if (s.type == 'palvelu') { s.type = _("service type service"); }
    });
   
    if (dataobj._source.established_year == '') {
        delete dataobj._source.established_year;
    }
    
    if (dataobj._source.contact.coordinates != undefined && dataobj._source.contact.coordinates != '') {
        latlon = dataobj._source.contact.coordinates.split(",");
        dataobj._source.contact.coordinnates_lat = latlon[0];
        dataobj._source.contact.coordinnates_lon = latlon[1];
    }

    callback(dataobj);
}

// get a specific library
function get_library_by_id(id, callback) {
    var options = {
      host: conf.proxy_config.host,
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
          dataobj = JSON.parse(data);
          //console.log(JSON.stringify(dataobj));
          add_library_metadata(dataobj, callback);
      });
    }).on('error', function(e) {
      console.log('Problem with request: ' + e.message);
    });
}

// get library by slug
function get_library_by_name(name, browser_req, callback) {
    query =
    {
      "size": 1,
      "sort": [ { "name_fi" : {} } ],
      "query":
     { "query_string":
       {
         "fields": ["additional_info.slug"],
         "query": name
       }
     }
    };
    query = JSON.stringify(query);
	query = encodeURIComponent(query);

    var options = {
      host: conf.proxy_config.host,
      port: 8888,
      path: '/testink/organisation/_search?source='+query,
      method: 'GET'
    };
   
    var req = http.get(options, function(res) {
      res.setEncoding('utf8');
      data = '';
      res.on('data', function(chunk){
        data += chunk;
        //console.log("...read chunk: " + chunk);
      });
      res.on('end', function() {
          dataobj = JSON.parse(data);
          if (dataobj.hits.total>0) {
	          switch_locale(browser_req);
	          add_library_metadata(dataobj, callback);
		  }
		  else {
			  callback(dataobj);
		  }
      });
    }).on('error', function(e) {
      console.log('Problem with request: ' + e.message);
    });
}

// get library's children organisations
function get_library_children(id, callback) {
    query = {
	  "size": 999,
      "sort": [ { "name_fi" : {} } ],
      "query":
		{ "term":
			{ "parent_organisation": id }
		}
    };

    query = JSON.stringify(query);
	query = encodeURIComponent(query);

	//console.log("requested children of :", id);

    var options = {
      host: conf.proxy_config.host,
      port: 8888,
      path: '/testink/organisation/_search?source='+query,
      method: 'GET'
    };

    var req = http.get(options, function(res) {
      res.setEncoding('utf8');
      data = '';
      res.on('data', function(chunk){
        data += chunk;
        //console.log("...read chunk: " + chunk);
      });
      res.on('end', function() {
		dataobj = JSON.parse(data);
		callback(dataobj);
      });
    }).on('error', function(e) {
      console.log('Problem with request: ' + e.message);
    });
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
	var days_translated = [ _("Monday"),
							_("Tuesday"),
							_("Wednesday"),
							_("Thursday"),
							_("Friday"),
							_("Saturday"),
							_("Sunday") ];

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
		opening_hours.open_hours_week[j] = { "day": days_translated[j], "time": _("closed") };
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
					opening_hours.open_hours_week[j] = { "day": days_translated[j], "time": ld_format_time(start) + " - " + ld_format_time(end) }; }
				else {
					opening_hours.open_hours_week[j] = { "day": days_translated[j], "time": _("closed") }; }
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

headerfilecontents = fs.readFileSync(__dirname + headerfile, 'utf-8');
footerfilecontents = fs.readFileSync(__dirname + footerfile, 'utf-8');

try {
    header_banner = fs.readFileSync("./views/header-banner.html",'utf8');
} catch(err) {
    console.log("No header banner in use. OK");
}
try {
    header_banner_css = fs.readFileSync("./views/header-banner.css",'utf8');
} catch(err) {
    console.log("No header banner css in use. OK");
}
try {
    footer_banner = fs.readFileSync("./views/footer-banner.html",'utf8');
} catch(err) {
    console.log("No footer banner in use. OK");
}

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
    headerfilecontents = fs.readFileSync(__dirname + headerfile, 'utf-8');
    footerfilecontents = fs.readFileSync(__dirname + footerfile, 'utf-8');
});

// wrapped functions to transparently forward rendering to proper
// rendering function that also has built in localization
header = new function () {
    this.render = function (req, options) {
        options.lang = gettext.lang;
        options.resource = req.params.resource;
        options[gettext.lang+"_active"] = true;
        options.header_banner = header_banner;
        options.header_banner_css = header_banner_css;
        return adapter.init(hogan).compile(headerfilecontents)(options);
    }
}

footer = new function () {
    this.render = function (options) {
        if (typeof options == "undefined") {
           options = {};
        }
        options.footer_banner = footer_banner;
        return adapter.init(hogan).compile(footerfilecontents)(options);
    }
}

widget = new function() {
	this.render = function (req, options) {
		var widget_id = req.query.type;
		var widgetdata = fs.readFileSync(__dirname + "/views/json_widget_" + widget_id + ".mustache", 'utf-8');
		return adapter.init(hogan).compile(widgetdata)(options);
	}
}


app.listen(conf.server_port);
console.log("Server started at port " + conf.server_port);

