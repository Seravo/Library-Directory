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

gettext.setlocale('LC_ALL', conf.default_lang); // initial language (when server starts, may change on each request)

// load all localizations at once
gettext.loadLocaleDirectory("locale", function(){
	var languages = []
	for (var key in gettext.data) {
		languages.push(key);
	}
	rlog("Loaded messages for: " + languages.join(" "));
});

function rlog(str) { console.log(str); }

function switch_locale(req) {
// turn of language headers sniffing, since / should always return
// the Finnish version, both to end users, Varnish cache and crawlers
//	var browser_lang = req.locale;   // accept-language: fi;q=1
	var path_lang = req.params.lang; // /fi/about
	var get_lang = req.query.lang;   // /about?lang=fi

	//rlog(browser_lang, path_lang, get_lang);
	// locale precedence:
	// 1) get var 2) request path 3) browser setting
	var locale = "";
//	if (browser_lang != undefined) locale = browser_lang;
	if (path_lang != undefined) locale = path_lang;
	if (get_lang != undefined) locale = get_lang;

	// set default application locale if request is hairy
	if (!locale.match(/^(fi|en|sv)$/)) locale = conf.default_lang;

	gettext.setlocale("LC_ALL", locale);
	
	if (locale == conf.default_lang) {
    	req.locale_url_prefix = "/";
	} else {
    	req.locale_url_prefix = "/" + locale + "/";
    }
    rlog("Language: " + locale);
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
    rlog("Using development settings.");
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
    view_cache_time = 0;
});

// specific settings if started with $ NODE_ENV=prod node server.js
app.configure('prod', function(){
    rlog("Using production settings.");
    //app.use(express.logger('dev'))
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.set(app.router, false); // must be last so that wildcard route does not override
	app.set('view engine','mustache');
	app.set('view options',{layout:false});
    app.set('views',__dirname + '/output/views');
	app.register('mustache',adapter.init(hogan));
    app.use(connect.compress());
    var oneYear = 31557600000;
    app.use(express.static(__dirname + '/output', { maxAge: oneYear }));
    app.use(express.errorHandler());
    headerfile = '/output/views/header.mustache';
    footerfile = '/output/views/footer.mustache';
    view_cache_time = 60*10; // ten minutes
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

// route handler for all dynamic data with language path
app.get("/:lang(en|sv)/:resource(*)",function(req,res,next) {
	// rlog(":lang/:resource -->");
	route_parser(req,res,next);
});

// remove default lang from url
app.get("/:lang(" + conf.default_lang + ")/:resource(*)",function(req,res,next) {
    rlog("Request url " + req.url + " redirected to " + req.url.slice(3));
    res.redirect(req.url.slice(3), 301); // 301 for permanent redirect
    return; // nothing more to do here!
});

// route handler for all dynamic data without language path
// as this has the most generic matcher it should be last
app.get("/:resource(*)",function(req,res,next) {
	// rlog(":resource -->");
	route_parser(req,res,next);
});

function route_parser(req,res,next) {
    
    // cache view output
    if (view_cache_time != 0) {
        res.setHeader('Cache-Control', 'public, max-age=' + view_cache_time);
        // Expires and max-age do the same thing, in theore either one is enough
        // multiply with seconds with thousand to get milliseconds
        res.setHeader("Expires", new Date(Date.now() + 1000*view_cache_time).toUTCString());
        // TODO: last-modified still missing, should be available
        // make update-production touch a file and server.js to read that timestamp,
        // and deliver it as last modified for everything with the exeption of library pages
        // since those get updates via ES database
        // https://developers.google.com/speed/docs/best-practices/caching?hl=fi#LeverageBrowserCaching
    }

    // this is supposed to be good practice
    res.setHeader("Vary", "Accept-Encoding");

    // only one lang switcher and it is here now
	switch_locale(req);
	
	var page = req.params.resource;
	//rlog("request: " + page);

	// static page
	if (page == '' || page.match(/^(about|browse|contact|feedback-sent|search|widget|loadwidget|widget[0-9])$/)) {
		//rlog("match page");
		render_static_page(page, req, res);
	}

	// get library by slug
	// must start with at least two characters, otherwise conflict with IDs of form "b620"
	else if (page.match(/^[a-z][a-z][a-z0-9-_]+$/)) {
	//	rlog("Route slug: " + page);
		render_library_by_slug(page, req, res);
	}

	// get library by id
	else if (page.match(/(^[a-zA-Z0-9_-]{22}$)|(^[bm][0-9]+$)/)) {
	//	rlog("Route id: " + page);
		render_library_by_id(page, req, res);
	}

	// redirect to remove trailing slash
	else if (page.match(/^[a-zA-Z0-9_-]{3,60}\/$/)) { // {3,60} to inhibit redirect loop for /en/ and /sv/
		rlog("Redirect trailing slash: " + page + " (referer " + req.headers['referer'] + ")");
  		res.redirect(req.url.slice(0,-1), 301);
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

        message = _("Feedback from: ") + req.form.fname + " <" + req.form.femail + "> \n\nMessage: \n" + req.form.fmessage + "\n\n";
        message += "\n\nRequest headers:\n" + JSON.stringify(req.headers);
        rlog("Feedback message: " + message);
        var nodemailer = require("nodemailer");

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
        smtpTransport.sendMail(mailOptions, function(error, mailresponse){
            if (error){
                rlog(error);
                return res.end("Library directory error, please send this to admin: \n\n" + error.toString());
            } else {
                rlog("Message sent: " + mailresponse.message);
                return res.redirect('/feedback-sent');
            }
            // if you don't want to use this transport object anymore, uncomment following line
            //smtpTransport.close(); // shut down the connection pool, no more messages
        });
    }
  }
);

function render_static_page(page, req, res) {
	// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);

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
				// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
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
			var cityfilter = req.query.city || "";
			res.local("header", header.render(req, {search_active: true}))
			res.local("footer", footer.render({js_code: "jQuery(document).ready(function($) { $('.facet-view-simple').facetview({cityfilter: '" + cityfilter + "'}); });", js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
			res.render("index", res.locals());
			break;

		case "feedback-sent":
			//rlog(JSON.stringify(res.locals()));
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

		// search with consortium selection /widget1/?area=foo OR city selection /widget1/?city=bar
		case "widget1":
			// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
			var areafilter = req.query.area || "";
			var cityfilter = req.query.city || "";
			var js_code = "";
			if (areafilter != "") js_code = "jQuery(document).ready(function($) { $('.facet-view-simple').facetview({areafilter: '" + areafilter + "'}); });";
			else if (cityfilter != "") js_code = "jQuery(document).ready(function($) { $('.facet-view-simple').facetview({cityfilter: '" + cityfilter + "'}); });";
			else js_code = "jQuery(document).ready(function($) { $('.facet-view-simple').facetview(); });";

			res.local("header", header.render(req, { nobanners: true }));
			res.local("footer", footer.render({ nobanners: true, js_code: js_code, js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
			res.render("widget1", { lang: gettext.lang });
			break;

		// library details - lite
		case "widget2":
			// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
			get_library_by_id(req.query.id, function(data) {
				data._source["id"] = data._id;
				// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);

				res.local("header", header.render(req, { nobanners: true }));
				res.local("footer", footer.render({ nobanners: true, js_code: "jQuery(document).ready(function($) { library_details_map(); });", js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
				res.render("widget2", { data: data._source });
			});
			break;

		// library details - full
		case "widget3":
			// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
			get_library_by_id(req.query.id, function(data) {
				data._source["id"] = data._id;
				// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);

				res.local("header", header.render(req, { nobanners: true }));
				res.local("footer", footer.render({ nobanners: true, js_code: "jQuery(document).ready(function($) { library_details_map(); });", js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
				res.render("widget3", { data: data._source } );
			});
			break;

		case "loadwidget":
			// get library details for widget
			if (req.query.id != undefined) {
				// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
				get_library_by_id(req.query.id, function(data) {
					// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);

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
	// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);

    rlog("Requested id: "+page);
    get_library_by_id(page, function(data){
		// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
    
        // if slug exists, redirect to pretty url
        if (typeof data._source.slug == "string" && data._source.slug.length > 1) {
    		rlog("Redirect to pretty url: /" + data._source.slug + " (referer " + req.headers['referer'] + ")");
      		res.redirect(req.locale_url_prefix + data._source.slug, 301);
      		return false; // don't print out stuff after headers sent
        }

        // return 404 if no library was returned
        // TODO: is this the most elegant place to check for results and render 404?
        if (typeof data == "undefined"){
			res.local("header", header.render(req, {title: _("Not found") }));
			res.local("footer", footer.render());
			res.render("404", res.locals());
			return false;
		}

		var id = data._id;
		data._source["id"] = id;

		var library = data._source;

		get_library_children(id, function(child_data) {
			// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
			if (child_data.hits.hits.length>0)
			{
				var children = [];
				for (item in child_data.hits.hits) {
					var child = child_data.hits.hits[item]._source;
					if (typeof child.additional_info != "undefined" && typeof child.additional_info.slug != "undefined") {
    					child.link = child.additional_info.slug;
    				} else {
    					child.link = child_data.hits.hits[item]._id;
    				}
					children.push(child);
				}

				library.children = children;
				library.has_children = true;
			} else {
				library.has_children = false;
			}

			res.local("data", library);
            res.local("header", header.render(req, {title: eval("library.name_" + _("locale")) + ": " + _("contact details, open hours, services")}))
            res.local("footer", footer.render({js_code: "jQuery(document).ready(function($) { library_details_map(); });", js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
			res.render("library_details", res.locals());
		});
	});
}


function render_library_by_slug(slug, req, res) {
	// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);

    rlog("Requested slug: "+req.params);
    get_library_by_name(slug, req, function(data){
		// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
        rlog("Total results: "+data.hits.total);
        if (data.hits.total > 0) {
		    data.hits.hits[0]._source["id"] = data.hits.hits[0]._id;
    		var library = data.hits.hits[0]._source;
		    res.local("data", library);
            res.local("header", header.render(req, {title: eval("library.name_" + _("locale")) + ": " + _("contact details, open hours, services")}))
            res.local("footer", footer.render({js_code: "jQuery(document).ready(function($) { library_details_map(); });", js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
		    res.render("library_details", res.locals());
		} else {
			res.local("header", header.render(req, {title: _("Not found") }));
			res.local("footer", footer.render());
			res.render("404", res.locals());
		}
	});
}

// get list of all libraries
var http = require('http');
function get_libraries(callback) {

	var query = {
		"size": 999,
		"sort": [ { "name_fi" : {} } ],
		"query" : {
		    "filtered" : {
                "query" : {"match_all":{}},
                "filter" : { 
                    "and" : [
                        {"terms": { "organisation_type" : [ "branchlibrary", "library" ] } },
			            {"term": { "meta.document_state" : "published" } }
			        ]
			    }
		    }
        }
	};

	query = JSON.stringify(query);
	query = encodeURIComponent(query);

    var options = {
      host: conf.proxy_config.host,
      port: conf.proxy_config.port,
      path: '/testink/organisation/_search?source='+query,
      method: 'GET'
    };

    var req = http.get(options, function(res) {
      //rlog('GET: ' + options.path);
      //rlog('STATUS: ' + res.statusCode);
      //rlog('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      data = '';
      res.on('data', function(chunk){ 
        data += chunk;
      });
      res.on('end', function() {
		  dataobj = JSON.parse(data);
		  add_library_metadata_for_browse(dataobj, callback);
      });
    }).on('error', function(e) {
      rlog('Problem with request: ' + e.message);
    });
}

function add_library_metadata_for_browse(dataobj, callback) {
	for (var temp in dataobj.hits.hits) {
		var lib = dataobj.hits.hits[temp]._source;

		// localize organisation types
		if (lib.organisation_type == "branchlibrary") lib.organisation_type = _("branchlibrary");
		if (lib.organisation_type == "department") lib.organisation_type = _("department");
		if (lib.organisation_type == "library") lib.organisation_type = _("library");
		if (lib.organisation_type == "mobile_stop") lib.organisation_type = _("mobile_stop");
		if (lib.organisation_type == "organisaatio") lib.organisation_type = _("organisation");
		if (lib.organisation_type == "unit") lib.organisation_type = _("unit");

		// delete empty names, default to name_fi in views if missing
		if (lib.name_en == "") delete lib.name_en;
		if (lib.name_sv == "") delete lib.name_sv;
	}
	callback(dataobj);
}

// enrich result meta data
function add_library_metadata(dataobj, callback){
    //rlog(JSON.stringify(dataobj, null, 4).slice(0,500));

    if (typeof dataobj._source == "undefined") {
        dataobj._source = dataobj.hits.hits[0]._source;
    }

	var lib = dataobj._source;

	lib.opening_hours = get_library_open_hours(lib.period);

    switch(lib.organisation_type) {
        case "library":
        case "unit":
        case "department":
            lib.neveropen = true;
            break;
    }


	for (var item in lib.contact.internet) {
		var temp = lib.contact.internet[item];
		// TODO: Could these be more universally expressed to support any language?
		if (typeof temp.url_description_fi=='string' && temp.url_description_fi=="") delete temp.url_description_fi;
		if (typeof temp.url_description_sv=='string' && temp.url_description_sv=="") delete temp.url_description_sv;
		if (typeof temp.url_description_en=='string' && temp.url_description_en=="") delete temp.url_description_en;
	}

	if (lib.image_url=="") delete lib.image_url;

    if (typeof lib.accessibility != "undefined") {
	    if (lib.accessibility.accessible_entry ||
		    lib.accessibility.accessible_parking ||
		    lib.accessibility.accessible_toilet ||
		    lib.accessibility.induction_loop ||
		    lib.accessibility.large_typeface_collection ||
		    lib.accessibility.lift ||
		    lib.extraaccessibilityinfo ) { 
                lib.accessibility_available = true 
	    }
	} else {
	    rlog("Error: lib.accessibility undefined for id " + dataobj._id );
	}

	lib.map_popup_html =
		"<strong>" + lib["name_" + _("locale")] + "</strong>" + "<br>" +
		lib.contact.street_address["street_"+_("locale")] + "<br>" +
		lib.contact.street_address.post_code + " " + lib.contact.street_address["municipality_" + _("locale")];

    // delete empty object so that they will not be displayed in Mustache templates
    if (typeof lib.additional_info != "undefined") {
        if (lib.additional_info.slug == '') {
            delete lib.additional_info.slug;
        } else {
            lib.slug = lib.additional_info.slug;
        }
    }
	if (lib.parent_organisation == '') {
		delete lib.parent_organisation;
	}
    if (lib.contact.telephones[0].telephone_number == '') {
        delete lib.contact.telephones;
    }

	// delete empty telephone name descriptions in locale
	for (var temp in lib.contact.telephones) {
		var name = lib.contact.telephones[temp]['telephone_name_'+_('locale')];
		if (name=='') delete lib.contact.telephones[temp]['telephone_name_'+_('locale')];
	}

    // TODO: Change data model to have own extrainfo branches for each language
    if (typeof lib.additional_info != "undefined" && typeof lib.additional_info.extrainfo != "undefined") {
        if (lib.additional_info.extrainfo[0].property_label_fi == '') {
            delete lib.additional_info;
        }
    }
    if (lib.established_year == '') {
        delete lib.established_year;
    }

	// localize organisation types
	if (lib.organisation_type == "branchlibrary") lib.organisation_type = _("branchlibrary");
	if (lib.organisation_type == "department") lib.organisation_type = _("department");
	if (lib.organisation_type == "library") lib.organisation_type = _("library");
	if (lib.organisation_type == "mobile_stop") lib.organisation_type = _("mobile_stop");
	if (lib.organisation_type == "organisaatio") lib.organisation_type = _("organisation");
	if (lib.organisation_type == "unit") lib.organisation_type = _("unit");

	// delete empty names, default to name_fi in views
	if (lib.name_en == "") delete lib.name_en;
	if (lib.name_sv == "") delete lib.name_sv;

	// delete empty description fields, default to _fi in views
	if (lib.description_fi == "") delete lib.description_fi;
	if (lib.description_sv == "") delete lib.description_sv;
	if (lib.description_en == "") delete lib.description_en;

    // delete empty service fields
    if (typeof lib.services != "undefined") {
        lib.services.forEach( function(s) {
            if (s.description_short_fi.trim() == '') { delete s.description_short_fi; }
            // TODO: consider trimming all fields, some might be empty but have just whitespace or line feed
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
    }
   
    if (lib.contact.coordinates != undefined && lib.contact.coordinates != '') {
        latlon = lib.contact.coordinates.split(",");
        lib.contact.coordinnates_lat = latlon[0];
        lib.contact.coordinnates_lon = latlon[1];
    }

    callback(dataobj);
}

// get a specific library
function get_library_by_id(id, callback) {
    var options = {
      host: conf.proxy_config.host,
      port: conf.proxy_config.port,
      path: '/testink/organisation/' + id,
      method: 'GET'
    };
    var req = http.get(options, function(es_res) {
      es_res.setEncoding('utf8');
      data = '';
      es_res.on('data', function(chunk){
        data += chunk;
        // rlog("...read chunk: " + chunk);
      });
      es_res.on('end', function() {
          dataobj = JSON.parse(data);
          if (dataobj.exists) {
            add_library_metadata(dataobj, callback);
          } else {
            rlog("Library with id " + id + " does not exist.");
            callback(); // no parameter, return will notice empty value
          }
      });
    }).on('error', function(e) {
      rlog('Problem with request: ' + e.message);
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
      port: conf.proxy_config.port,
      path: '/testink/organisation/_search?source='+query,
      method: 'GET'
    };
   
    var req = http.get(options, function(res) {
      res.setEncoding('utf8');
      data = '';
      res.on('data', function(chunk){
        data += chunk;
        //rlog("...read chunk: " + chunk);
      });
      res.on('end', function() {
          dataobj = JSON.parse(data);
          if (dataobj.hits.total>0) {
	          // might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(browser_req);
	          add_library_metadata(dataobj, callback);
		  }
		  else {
			  callback(dataobj);
		  }
      });
    }).on('error', function(e) {
      rlog('Problem with request: ' + e.message);
    });
}

// get library's children organisations
function get_library_children(id, callback) {
	var query = {
		"size": 999,
		"sort": [ { "name_fi" : {} } ],
		"query" : {
		    "filtered" : {
                "query" : {"match_all":{}},
                "filter" : { 
                    "and" : [
                        {"term": { "parent_organisation" : id } },
			            {"term": { "meta.document_state" : "published" } }
			        ]
			    }
		    }
        }
	};

    query = JSON.stringify(query);
	query = encodeURIComponent(query);

	//rlog("requested children of :", id);

    var options = {
      host: conf.proxy_config.host,
      port: conf.proxy_config.port,
      path: '/testink/organisation/_search?source='+query,
      method: 'GET'
    };

    var req = http.get(options, function(res) {
      res.setEncoding('utf8');
      data = '';
      res.on('data', function(chunk){
        data += chunk;
        //rlog("...read chunk: " + chunk);
      });
      res.on('end', function() {
		dataobj = JSON.parse(data);
		callback(dataobj);
      });
    }).on('error', function(e) {
      rlog('Problem with request: ' + e.message);
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
	// rlog(unixtime, mondaystamp);

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
			//if (j==6) rlog(p.name_fi, days[j], curday, Date.parse(p.start), Date.parse(p.end), curday >= Date.parse(p.start) && curday <= Date.parse(p.end))

			// if period has no end defined, assume today + 1 year
			if (p.end == null) {
				var now = new Date();
				now.setYear(now.getFullYear()+1);
				p.end = now;
			}
			if ( curday >= Date.parse(p.start) && curday <= Date.parse(p.end) ) {
				if ( (start!=0 && end!=0) && (start!= null && end!= null) ) {
					opening_hours.open_hours_week[j] = { "day": days_translated[j], "time": ld_format_time(start) + " - " + ld_format_time(end) }; }
				else {
					opening_hours.open_hours_week[j] = { "day": days_translated[j], "time": _("closed") }; }
			}

			/* find opening hours for current day */
			//if (j==4) rlog(p.name_fi, days[j], unixtime, Date.parse(p.start), Date.parse(p.end), unixtime >= Date.parse(p.start) && unixtime <= Date.parse(p.end))
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
    rlog("No header banner in use. OK");
}
try {
    header_banner_css = fs.readFileSync("./views/header-banner.css",'utf8');
} catch(err) {
    rlog("No header banner css in use. OK");
}
try {
    footer_banner = fs.readFileSync("./views/footer-banner.html",'utf8');
} catch(err) {
    rlog("No footer banner in use. OK");
}

var watch = require('nodewatch');
// Adding 2 dirs relative from process.cwd()
// Nested dirs are not watched
// dirs can also be added absolute
watch.add("./views").onChange(function(file,prev,curr,action){
    // .add("./output/views") omitted since it would crash entire server.js
    // each time h5bp is run and output folder emptied
    rlog("Views changed and reloaded");
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
rlog("Server started at port " + conf.server_port);

