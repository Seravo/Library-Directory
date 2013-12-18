// export NODE_PATH='/usr/lib/node_modules/'
/* jshint node:true */
// 'use strict';

var util = require('util');
var fs = require('fs');

var async = require('async');

try {
    var content = fs.readFileSync('./config.json','utf8').replace('\n', '');
  } catch(err) {
    util.debug(err);
    throw('Please set up your configuration by copying the config.json-template');
  }
try {
	var conf = JSON.parse(content);
} catch (err) {
    util.debug(err);
    throw 'Syntax error in config.json';
  }

// Gettext
// _() might conflict with underscore.js, but not an issue for us
// do withouth var, makes global
var gettext = require('gettext');
global._ = gettext.gettext;

gettext.setlocale('LC_ALL', conf.default_lang); // initial language (when server starts, may change on each request)

// load all localizations at once
gettext.loadLocaleDirectory('locale', function(){
	var languages = [];
	for (var key in gettext.data) {
		languages.push(key);
	}
	rlog('Loaded messages for: ' + languages.join(' '));
});

function rlog(str) { console.log(str); }

// sort services by type, name
function sortByKeys(array, key1, key2) {
  return array.sort(function(a, b) {
    var x1 = a[key1];
    var y1 = b[key1];
    var x2 = a[key2];
    var y2 = b[key2];
    if (x1==y1) {
      return ((x2 < y2) ? -1 : ((x2 > y2) ? 1 : 0)); // sort by key2
    } else {
      return ((x1 < y1) ? -1 : ((x1 > y1) ? 1 : 0)); // sort by key1
    }
  });
}

// globals to hold consortium/region data for libraries
global.consortiumData = {};
global.regionData = {};
global.personQualityData = {};

function get_consortium_data () {
  var options = {
    host: conf.proxy_config.host,
    port: conf.proxy_config.port,
    path: '/testink/consortium/_search?size=200',
    method: 'GET'
  };

  var req = http.get(options, function(res) {
    rlog('Requested consortium data');
    res.setEncoding('utf8');
    data = '';
    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end', function() {
      dataobj = JSON.parse(data);
      // check if we got valid data and store it into global object
      if (dataobj.hits.hits !== undefined && dataobj.hits.hits.length>0) {
        rlog('Got ' + dataobj.hits.hits.length + ' consortium items');

        for (var item in dataobj.hits.hits) {
          var consId = dataobj.hits.hits[item]._id;
          var consItem = dataobj.hits.hits[item]._source;
          consortiumData[consId] = { name: consItem.name, url: consItem.url };
        }
      }
    });
  }).on('error', function(e) {
    rlog('Error getting consortium data: ' + e.message);
  });
}

function get_region_data () {
  var options = {
    host: conf.proxy_config.host,
    port: conf.proxy_config.port,
    path: '/testink/region/_search?size=200',
    method: 'GET'
  };

  var req = http.get(options, function(res) {
    rlog('Requested region data');
    res.setEncoding('utf8');
    data = '';
    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end', function() {
      dataobj = JSON.parse(data);
      // check if we got valid data and store it into global object
      if (dataobj.hits.hits !== undefined && dataobj.hits.hits.length>0) {
        rlog('Got ' + dataobj.hits.hits.length + ' region items');

        for (var item in dataobj.hits.hits) {
          var regionId = dataobj.hits.hits[item]._id;
          var regionItem = dataobj.hits.hits[item]._source;
          regionData[regionId] = regionItem;
        }
      }
    });
  }).on('error', function(e) {
    rlog('Error getting region data: ' + e.message);
  });
}

function get_person_qualities_data () {
  var options = {
    host: conf.proxy_config.host,
    port: conf.proxy_config.port,
    path: '/testink/person_quality/_search?size=200',
    method: 'GET'
  };

  var req = http.get(options, function(res) {
    rlog('Requested person qualities data');
    res.setEncoding('utf8');
    data = '';
    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end', function() {
      dataobj = JSON.parse(data);
      // check if we got valid data and store it into global object
      if (dataobj.hits.hits !== undefined && dataobj.hits.hits.length>0) {
        rlog('Got ' + dataobj.hits.hits.length + ' person quality items');

        for (var item in dataobj.hits.hits) {
          var qualityId = dataobj.hits.hits[item]._id;
          var qualityItem = dataobj.hits.hits[item]._source;
          personQualityData[qualityId] = qualityItem;
        }
      }
    });
  }).on('error', function(e) {
    rlog('Error getting person qualities data: ' + e.message);
  });
}

function switch_locale(req) {
// turn of language headers sniffing, since / should always return
// the Finnish version, both to end users, Varnish cache and crawlers
//	var browser_lang = req.locale;   // accept-language: fi;q=1
	var path_lang = req.params.lang; // /fi/about
	var get_lang = req.query.lang;   // /about?lang=fi

	//rlog(browser_lang, path_lang, get_lang);
	// locale precedence:
	// 1) get var 2) re''est path 3) browser setting
	var locale = '';
//	if (browser_lang !== undefined) locale = browser_lang;
	if(path_lang !== undefined) {
    locale = path_lang;
  }
	if(get_lang !== undefined) {
    locale = get_lang;
  }

	// set default application locale if request is hairy
	if(!locale.match(/^(fi|en|sv)$/)) {
    locale = conf.default_lang;
  }

	gettext.setlocale('LC_ALL', locale);

	if (locale == conf.default_lang) {
    req.locale_url_prefix = '/';
	} else {
    req.locale_url_prefix = '/' + locale + '/';
  }
  rlog('Language: ' + locale);
}

// Use consolidate.js in Express.js 3.0, otherwise custom adaptor
// var cons = require('consolidate');
var hogan = require('hogan.js');
var adapter = require('hogan-express');

var connect = require('connect');
var express = require('express');
var	locale = require('locale');
var	supported_locales = ['en', 'fi', 'sv'];

var app = express.createServer(locale(supported_locales)),
    form = require('express-form'),
    filter = form.filter,
    validate = form.validate;

// don't use flash() since it requires sessions and cookies
// and we don't want to pollute our site and bust cache with cookies
form.configure({flashErrors: false});
// var headerfile = '/views/header-dev.mustache';
// var footerfile = '/output/views/footer.mustache';
// var view_cache_time;

// default settings assume development environment
app.configure('dev', function(){
    rlog('Using development settings.');
    app.use(express.logger('dev'));
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
    rlog('Using production settings.');
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
      res.local('header', header.render(req, {title: _('Not found'), about_active: true}));
      res.local('footer', footer.render(req));
      res.render('404', res.locals());
    });
  });

// route handler for all dynamic data with language path
app.get('/:lang(en|sv)/:resource(*)',function(req,res,next) {
	// rlog(':lang/:resource -->');
	route_parser(req,res,next);
});

// remove default lang from url
app.get('/:lang(' + conf.default_lang + ')/:resource(*)',function(req,res,next) {
    rlog('Request url ' + req.url + ' redirected to ' + req.url.slice(3));
    res.redirect(req.url.slice(3), 301); // 301 for permanent redirect
    return; // nothing more to do here!
  });

// Preview data submitted from admin interface [or such]
app.post('/preview', function(req, res) {
    rlog('Render library preview');

    var library = JSON.parse(req.body.library);
    var fake_query = {
        _id: library.doc_id,
        _source: library
      };

    add_library_metadata(fake_query, function() {
        res.local('preview_mode', true);
        res.local('data', library);
        res.local('header', header.render(req, {
            title: eval('library.name_' + _('locale')) + ': ' + _('contact details, open hours, services')
          }));
        res.render('library_details', res.locals());
      });
  });

app.post('/personnel-search', function(req, res) {
  var sstr = req.body.sstr;
  get_personnel(sstr,function(data) {
    if (data.length > 0) {
      res.local('personnel_status', true);
      res.local('people', []);

      for (var item in data) {
        if(data[item]){
          var person = data[item]._source;
          // honour public email status in personnel data
          if (person.contact.public_email !== true) {
            delete person.contact.email;
          }

          data[item]._source.id = data[item]._id;
          res.local('people').push(data[item]._source);
        }
      }
    } else {
      res.local('personnel_status', false);
    }
    res.render('personnel-search-results', res.locals());
  });
});

app.post('/openTimeChangeWeek', function(req,res){
  var mondayDate = new Date(req.body.mondayDate);

  if(req.body.value === 'next'){
    mondayDate.setDate(mondayDate.getDate() + 7);
  } else {
    mondayDate.setDate(mondayDate.getDate() - 7);
  }
  
  get_library_opening_times(req.body.id,
    {_source:{}},
    mondayDate,
    function(openingTimes) {
    res.send(openingTimes)
  });
});

// route handler for all dynamic data without language path
// as this has the most generic matcher it should be last
app.get('/:resource(*)',function(req,res,next) {
	// rlog(':resource -->');
	route_parser(req,res,next);
});

function route_parser(req,res,next) {

    // cache view output
    if (view_cache_time !== 0) {
      res.setHeader('Cache-Control', 'public, max-age=' + view_cache_time);
      // Expires and max-age do the same thing, in theore either one is enough
      // multiply with seconds with thousand to get milliseconds
      res.setHeader('Expires', new Date(Date.now() + 1000*view_cache_time).toUTCString());
      // TODO: last-modified still missing, should be available
      // make update-production touch a file and server.js to read that timestamp,
      // and deliver it as last modified for everything with the exeption of library pages
      // since those get updates via ES database
      // https://developers.google.com/speed/docs/best-practices/caching?hl=fi#LeverageBrowserCaching
    }

    // this is supposed to be good practice
    res.setHeader('Vary', 'Accept-Encoding');

    // only one lang switcher and it is here now
    switch_locale(req);

  // handle ssl-proxy same origin policy
    if (req.headers['x-forwarded-proto']=='https') {
      res.local('proto', 'https');
    } else {
      res.local('proto', 'http');
    }

    var page = req.params.resource;
    //rlog('request: ' + page);
    // static page
    if (page === '' || page.match(/^(about|browse|personnel|contact|feedback-sent|search|widget|loadwidget|widget[0-9])$/)) {
      //rlog('match page');
      render_static_page(page, req, res);
    }

    // get library by slug
    // must start with at least two characters, otherwise conflict with IDs of form 'b620'
    else if (page.match(/^[a-z][a-z][a-z0-9-_]+$/)) {
      //	rlog('Route slug: ' + page);
      render_library_by_slug(page, req, res);
    }

    // get library by id
    else if (page.match(/(^[a-zA-Z0-9_-]{22}$)|(^[bm][0-9]+$)/)) {
      	rlog('Route id: ' + page);
      render_library_by_id(page, req, res);
    }

    // redirect to remove trailing slash
    else if (page.match(/^[a-zA-Z0-9_-]{3,60}\/$/)) { // {3,60} to inhibit redirect loop for /en/ and /sv/
      rlog('Redirect trailing slash: ' + page + ' (referer ' + req.headers.referer + ')');
      res.redirect(req.url.slice(0,-1), 301);
    }

    // static assets and unmatched requests
    else {
      //rlog('UNMATCHED: ' + page);
      next('route');
    }
  }

app.post('/contact', // Route

      form( // Form filter and validation middleware
        filter('fname').trim(),
        validate('fname', _('Name')).required().notEmpty(),
        filter('femail').trim(),
        validate('femail', _('E-mail')).required(_('Please provide your' +
          'e-mail so we can respond to your feedback.')).isEmail(),
        validate('femail_confirm', _('E-mail')).trim().is(/^$/i),
        validate('fmessage', _('Feedback')).required().notEmpty()
      ),

      // Express request-handler gets filtered and validated data
      function(req, res){
        if (!req.form.isValid) {
          // Handle errors
          res.local('errors', req.form.getErrors());
          res.local('header', header.render(req, {title: _('Contact'),
            contact_active: true}));
          res.local('footer', footer.render(req));
          res.render('contact', res.locals());

        } else {
            // Or, use filtered form data from the form object:

          message = _('Feedback from: ') + req.form.fname + ' <' +
            req.form.femail + '> \n\nMessage: \n' + req.form.fmessage + '\n\n';
          message += '\n\nRequest headers:\n' + JSON.stringify(req.headers);
          rlog('Feedback message: ' + message);
          var nodemailer = require('nodemailer');

          // create reusable transport method (opens pool of SMTP connections)
          var smtpTransport = nodemailer.createTransport('SMTP',
            conf.nodemailer_config);

          // setup e-mail data with unicode symbols
          var mailOptions = {
              from: 'Library directory <noreply@seravo.fi>', // sender address
              to: conf.nodemailer_config.feedbackto, // list of receivers
              subject: _('Feedback from library directory'), // Subject line
              text: message // plaintext body
            };

            // send mail with defined transport object
          smtpTransport.sendMail(mailOptions, function(error, mailresponse){
                if (error){
                  rlog(error);
                  return res.end('Library directory error, please send this to admin: \n\n' + error.toString());
                } else {
                  rlog('Message sent: ' + mailresponse.message);
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
  case 'about':
    res.local('header', header.render(req, {title: _('About'), about_active: true}));
    res.local('footer', footer.render(req));
    res.render('about', res.locals());
    break;

	case 'browse':
		res.local('header', header.render(req, {title: _('Browse all'), browse_active: true}));
		res.local('footer', footer.render(req));
		get_libraries(function(data){
			// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
			res.local('count', data.hits.total);
			res.local('libraries', []);
			for (var item in data.hits.hits) {
				data.hits.hits[item]._source.id = data.hits.hits[item]._id;
				res.local('libraries').push(data.hits.hits[item]._source);
			}
			res.render('browse', res.locals());
		});
    break;

	case 'contact':
		res.local('header', header.render(req, {title: _('Contact'),
      contact_active: true}));
		res.local('footer', footer.render(req));
		res.render('contact', res.locals());
		break;

  case 'personnel':
    res.local('header', header.render(req, {title: _('Personnel'),
      personnel_active: true}));
    res.local('footer', footer.render(req,
      {js_code: '', qualities: 'var QUALITIES = ' +
        JSON.stringify(personQualityData) + ';' } ));
    res.render('personnel', res.locals());
    break;

	case 'search':
	case '':
		var cityfilter = req.query.city || '';
		res.local('header', header.render(req, {search_active: true}));
		res.local('footer', footer.render(req, {regions: 'var REGIONS = ' +
      JSON.stringify(regionData) + ';', consortiums: 'var CONSORTIUMS = ' +
        JSON.stringify(consortiumData) + ';',
          js_code: 'jQuery(document).ready(function($)'+
            ' { $(".facet-view-simple").facetview({cityfilter: "' +
              cityfilter + '"}); });',
          js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
		res.render('index', res.locals());
		break;

	case 'feedback-sent':
		//rlog(JSON.stringify(res.locals()));
		res.local('header', header.render(req, {title: _('Feedback sent'), contact_active: true}));
		res.local('footer', footer.render(req));
		res.render('feedback-sent', res.locals());
		break;

	// widget creation wizard
	case 'widget':
		res.local('header', header.render(req, {title: 'Widget wizard', widget_active: true}));
		res.local('footer', footer.render(req, {regions: 'var REGIONS = ' +
      JSON.stringify(regionData) + ';',
      consortiums: 'var CONSORTIUMS = ' + JSON.stringify(consortiumData) + ';',
      js_code:'jQuery(document).ready(function($) { ld_widget_wizard(); });'}));
		res.render('widget_wizard', res.locals());
		break;

	// search with consortium selection /widget1/?area=foo OR city selection /widget1/?city=bar
	case 'widget1':
		// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
		var areafilter = req.query.area || '';
		var cityfilter = req.query.city || '';
		var js_code = '';
		if (areafilter !== '') js_code = 'jQuery(document).ready(function($) { $(".facet-view-simple").facetview({widget: true, areafilter: "' + areafilter + '"}); });';
		else if (cityfilter !== '') js_code = 'jQuery(document).ready(function($) { $(".facet-view-simple").facetview({widget: true, cityfilter: "' + cityfilter + '"}); });';
		else js_code = 'jQuery(document).ready(function($) { $(".facet-view-simple").facetview({widget: true}); });';

		res.local('header', header.render(req, { nobanners: true }));
		res.local('footer', footer.render(req, { nobanners: true, regions: 'var REGIONS = ' + JSON.stringify(regionData) + ';', consortiums: 'var CONSORTIUMS = ' + JSON.stringify(consortiumData) + ';', js_code: js_code, js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
		res.render('widget1', { lang: gettext.lang });
		break;

	// library details - lite
	case 'widget2':
		// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
		get_library_by_id(req.query.id, function(data) {
			data._source['id'] = data._id;
			// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);

			res.local('header', header.render(req, { nobanners: true }));
			res.local('footer', footer.render(req, { nobanners: true, regions: 'var REGIONS = ' + JSON.stringify(regionData) + ';', consortiums: 'var CONSORTIUMS = ' + JSON.stringify(consortiumData) + ';', js_code: 'jQuery(document).ready(function($) { library_details_map(); });', js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
			res.render('widget2', { data: data._source });
		});
		break;

	// library details - full
	case 'widget3':
		// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
		get_library_by_id(req.query.id, function(data) {
			data._source.id = data._id;
			// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);

			res.local('header', header.render(req, { nobanners: true }));
			res.local('footer', footer.render(req, { nobanners: true, regions: 'var REGIONS = ' + JSON.stringify(regionData) + ';', consortiums: 'var CONSORTIUMS = ' + JSON.stringify(consortiumData) + ';', js_code: 'jQuery(document).ready(function($) { library_details_map(); });', js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
			res.render('widget3', { data: data._source } );
		});
		break;

	case 'loadwidget':
		// get library details for widget
		if (req.query.id !== undefined) {
			// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
			get_library_by_id(req.query.id, function(data) {
				// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);

        if (data === undefined || data._source === undefined) {
          jsondata = { html: 'Id does not exist: ' + req.query.id };
          res.send(req.query.callback + '(' + JSON.stringify(jsondata) + ')');
        } else {
          data._source.id = data._id;

          var jsondata = {};
          jsondata.html = widget.render(req, { data: data._source });
          res.send(req.query.callback + '(' + JSON.stringify(jsondata) + ')');
        }
			});
		}
		break;

	default:
		res.local('header', header.render(req, {title: _('Not found') }));
		res.local('footer', footer.render(req));
		res.render('404', res.locals());
		break;
	}
}


function render_library_by_id(page, req, res) {
	// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
    rlog('Requested id: '+page);
    get_library_by_id(page, function(data){
		// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);

        // return 404 if no library was returned
        // TODO: is this the most elegant place to check for results and render 404?
        if (typeof data == 'undefined'){
          res.local('header', header.render(req, {title: _('Not found') }));
          res.local('footer', footer.render(req));
          res.render('404', res.locals());
          return false;
        }

        // if slug exists, redirect to pretty url
        if (typeof data._source.slug == 'string' && data._source.slug.length > 1) {
          rlog('Redirect to pretty url: /' + data._source.slug + ' (referer ' + req.headers.referer + ')');
          res.redirect(req.locale_url_prefix + data._source.slug, 301);
          return false; // don't print out stuff after headers sent
        }

        var library = data._source;

        res.local('data', library);
        res.local('header', header.render(req, {title: eval('library.name_' + _('locale')) + ': ' + _('contact details, open hours, services')}));
        res.local('footer', footer.render(req, {regions: 'var REGIONS = ' + JSON.stringify(regionData) + ';', consortiums: 'var CONSORTIUMS = ' + JSON.stringify(consortiumData) + ';', js_code: 'jQuery(document).ready(function($) { library_details_map(); });', js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
        res.render('library_details', res.locals());
      });
  }


function render_library_by_slug(slug, req, res) {
	// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);

    rlog('Requested slug: '+req.params);
    get_library_by_name(slug, req, function(data){
      var nobanners = false;
      if (req.header('Referrer') !== undefined && req.header('Referrer').indexOf('widget') !== -1){
        nobanners = true;
      }
		// might be needed to mitigate concurrency issue, as gettext reads lang from global variable: switch_locale(req);
      rlog('Total results: '+data.hits.total);
      if (data.hits.total > 0) {
        data.hits.hits[0]._source.id = data.hits.hits[0]._id;
        var library = data.hits.hits[0]._source;
        res.local('data', library);
        res.local('header', header.render(req, {nobanners: nobanners, title: eval('library.name_' + _('locale')) + ': ' + _('contact details, open hours, services')}));
        res.local('footer', footer.render(req, {nobanners: nobanners, regions: 'var REGIONS = ' + JSON.stringify(regionData) + ';', consortiums: 'var CONSORTIUMS = ' + JSON.stringify(consortiumData) + ';', js_code: 'jQuery(document).ready(function($) { library_details_map(); });', js_files: [{src: 'js/libs/openlayers/openlayers.js'}]}));
        res.render('library_details', res.locals());
      } else {
        res.local('header', header.render(req, {nobanners: nobanners, title: _('Not found') }));
        res.local('footer', footer.render(req,
          {nobanners: nobanners, regions: 'var REGIONS = ' +
            JSON.stringify(regionData) + ';',
            consortiums: 'var CONSORTIUMS = ' +
            JSON.stringify(consortiumData) + ';'}));
        res.render('404', res.locals());
      }
    });
  }

// get list of all libraries
var http = require('http');
function get_libraries(callback) {

	var query = {
		'size': 999,
		'sort': [ { 'name_fi' : {} } ],
		'query' : {
        'filtered' : {
          'query' : {'match_all':{}},
          'filter' : {
              'and' : [
                  {'terms': { 'organisation_type' : [ 'branchlibrary', 'library' ] } },
                  {'term': { 'meta.document_state' : 'published' } }
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
		if (lib.organisation_type === 'branchlibrary'){
      lib.organisation_type = _('branchlibrary');
    }
		if (lib.organisation_type === 'department'){
      lib.organisation_type = _('department');
    }
		if (lib.organisation_type === 'library'){
      lib.organisation_type = _('library');
    }
		if (lib.organisation_type === 'mobile_stop'){
      lib.organisation_type = _('mobile_stop');
    }
		if (lib.organisation_type === 'organisaatio'){
      lib.organisation_type = _('organisation');
    }
		if (lib.organisation_type === 'unit'){
      lib.organisation_type = _('unit');
    }

		// delete empty names, default to name_fi in views if missing
		if (lib.name_en === ''){
      delete lib.name_en;
    }
		if (lib.name_sv === ''){
      delete lib.name_sv;
    }
	}
	callback(dataobj);
}

// enrich result meta data
function add_library_metadata(dataobj, callback){
    //rlog(JSON.stringify(dataobj, null, 4).slice(0,700));

    if (typeof dataobj._source == 'undefined') {
      dataobj._source = dataobj.hits.hits[0]._source;
      dataobj._source.id = dataobj.hits.hits[0]._id;
    } else {
      dataobj._source.id = dataobj._id;
    }

    var lib = dataobj._source;

    switch(lib.organisation_type) {
    case 'library':
    case 'unit':
    case 'department':
      lib.neveropen = true;
      break;
    }

  // remove web library url if empty
    if (lib.contact.web_library_url !== 'undefined' && lib.contact.web_library_url === '') {
      delete lib.contact.web_library_url;
    }
    // if localized street address is unavailable, use fi-locale
    if (lib.contact.street_address['street_' + _('locale')] === ''){
      lib.contact.street_address['street_' + _('locale')] = lib.contact.street_address.street_fi;
    }
    if (lib.contact.street_address['area_' + _('locale')] === ''){
      lib.contact.street_address['area_' + _('locale')] = lib.contact.street_address.area_fi;
    }
    if (lib.contact.street_address['municipality_' + _('locale')] === ''){
      lib.contact.street_address['municipality_' + _('locale')] = lib.contact.street_address.municipality_fi;
    }

    for (var item in lib.contact.internet) {
      var temp = lib.contact.internet[item];
      // TODO: Could these be more universally expressed to support any language?
      if (typeof temp.url_description_fi==='string' && temp.url_description_fi===''){
        delete temp.url_description_fi;
      }
      if (typeof temp.url_description_sv==='string' && temp.url_description_sv===''){
        delete temp.url_description_sv;
      }
      if (typeof temp.url_description_en==='string' && temp.url_description_en===''){
        delete temp.url_description_en;
      }
    }

    if (typeof lib.default_attachment !== 'undefined' && lib.default_attachment !== null) {
      var index = lib.default_attachment;
      var base = lib.attachments[index].file;
      var image = 'http://kirkanta.kirjastot.fi/media/image_content/medium/'+base;
      lib.image_url = image;
    } else {
      delete lib.image_url;
    }

    if (typeof lib.accessibility !== 'undefined') {
      if (lib.accessibility.accessible_entry ||
        lib.accessibility.accessible_parking ||
        lib.accessibility.accessible_toilet ||
        lib.accessibility.induction_loop ||
        lib.accessibility.large_typeface_collection ||
        lib.accessibility.lift ||
        lib.extraaccessibilityinfo ) {
        lib.accessibility_available = true;
      }
    } else {
      rlog('Error: lib.accessibility undefined for id ' + dataobj._id );
    }

    lib.map_popup_html =
    '<strong>' + lib['name_' + _('locale')] + '</strong>' + '<br>' +
    lib.contact.street_address['street_'+_('locale')] + '<br>' +
    lib.contact.street_address.post_code + ' ' + lib.contact.street_address['municipality_' + _('locale')];

	// if post box is empty, delete it
    if (typeof lib.contact.mail_address.post_box !== 'undefined') {
      if (lib.contact.mail_address.post_box === ''){
        delete lib.contact.mail_address.post_box;
      }
    }

    // delete empty object so that they will not be displayed in Mustache templates
    if (typeof lib.additional_info !== 'undefined') {
      if (lib.additional_info.slug === '') {
        delete lib.additional_info.slug;
      } else {
        lib.slug = lib.additional_info.slug;
      }
    }
    if (lib.parent_organisation === '') {
      delete lib.parent_organisation;
    }
    if (lib.consortium === '') {
      delete lib.consortium;
    } else {
      if (lib.consortium.length >0) {
        var consId = lib.consortium;
        if (typeof consortiumData[consId] !== 'undefined') {
          lib.consortium = consortiumData[consId].name;
          lib.consortium_url = consortiumData[consId].url;
        } else {
          delete lib.consortium;
        }
      }
    }

    if (lib.contact.telephones[0].telephone_number === '') {
      delete lib.contact.telephones;
    }

    // delete empty telephone name descriptions in locale
    for (var temp in lib.contact.telephones) {
      var name = lib.contact.telephones[temp]['telephone_name_'+_('locale')];
      if (name === ''){
        delete lib.contact.telephones[temp]['telephone_name_'+_('locale')];
      }
    }

    // TODO: Change data model to have own extrainfo branches for each language
    if (typeof lib.additional_info !== 'undefined' && typeof lib.additional_info.extrainfo !== 'undefined') {
      if (lib.additional_info.extrainfo[0].property_label_fi === '') {
        delete lib.additional_info;
      }
    }

	// delete ifla-visit & accessibility code from fi-locale extrainfo
    if (typeof lib.additional_info !== 'undefined' && typeof lib.additional_info.extrainfo !== 'undefined') {
      var len = lib.additional_info.extrainfo.length;
      while (len--) {
        var label = lib.additional_info.extrainfo[len]['property_label_'+_('locale')];
        if (label == 'ifla-visit' || label == 'esteettömyys'){
          lib.additional_info.extrainfo.splice(len, 1);
        }
      }
    }

    if (lib.established_year === '') {
      delete lib.established_year;
    }

    // localize organisation types
    if (lib.organisation_type == 'branchlibrary'){
      lib.organisation_type = _('branchlibrary');
    }
    if (lib.organisation_type == 'department'){
      lib.organisation_type = _('department');
    }
    if (lib.organisation_type == 'library'){
      lib.organisation_type = _('library');
    }
    if (lib.organisation_type == 'mobile_stop'){
      lib.organisation_type = _('mobile_stop');
    }
    if (lib.organisation_type == 'organisaatio'){
      lib.organisation_type = _('organisation');
    }
    if (lib.organisation_type == 'unit'){
      lib.organisation_type = _('unit');
    }

    // delete empty names, default to name_fi in views
    if (lib.name_en === ''){
      delete lib.name_en;
    }
    if (lib.name_sv === ''){
      delete lib.name_sv;
    }

    // delete empty description fields, default to _fi in views
    if (lib.description_fi === ''){
      delete lib.description_fi;
    }
    if (lib.description_sv === ''){
      delete lib.description_sv;
    }
    if (lib.description_en === ''){
      delete lib.description_en;
    }

    // delete empty service fields
    if (typeof lib.services !== 'undefined') {
      lib.services.forEach( function(s) {
          if (s.description_short_fi.trim() === '') { delete s.description_short_fi; }
          // TODO: consider trimming all fields, some might be empty but have just whitespace or line feed
          if (s.description_short_sv === '') { delete s.description_short_sv; }
          if (s.description_short_en === '') { delete s.description_short_en; }
          if (s.description_long_fi === '') { delete s.description_long_fi; }
          if (s.description_long_sv === '') { delete s.description_long_sv; }
          if (s.description_long_en === '') { delete s.description_long_en; }
          if (s.price === '') { delete s.price; }
          if (s.for_loan === '') { delete s.for_loan; }
          if (s.instance_name_fi === '') { delete s.instance_name_fi; }
          if (s.instance_name_sv === '') { delete s.instance_name_sv; }
          if (s.instance_name_en === '') { delete s.instance_name_en; }
          if (s.tag[0] === '') { delete s.tag[0]; }
          if (s.contact !== undefined) {
            if (s.contact[0] === '') { delete s.contact[0]; }
          }

            // style label for visuals
            // use Twitter Bootstrap classes
          if (s.type == 'laite') { s.type = _('service type device'); s.label = 'label-inverse'; }
          if (s.type == 'tila') { s.type = _('service type room'); s.label = 'label-info'; }
          if (s.type == 'palvelu') { s.type = _('service type service'); }
        });

      lib.services = sortByKeys(lib.services, 'type', 'name_'+_('locale'));
    }

    if (lib.contact.coordinates !== undefined && lib.contact.coordinates !== '') {
      latlon = lib.contact.coordinates.split(',');
      lib.contact.coordinnates_lat = latlon[0];
      lib.contact.coordinnates_lon = latlon[1];
    }

    rlog("personnel slug: " + lib.slug);
    rlog("personnel id: " + lib.id);

    if(typeof lib.id === 'undefined'){
      callback(dataobj);
    }
    else {
      get_library_personnel(lib.id, dataobj, function(err, data){
        get_library_children(data.id, data.dataobj, callback);
      });
    }
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
            rlog('Library with id ' + id + ' does not exist.');
            callback(); // no parameter, return will notice empty value
          }
        });
    }).on('error', function(e) {
      rlog('Problem with request: ' + e.message);
    });
  }

// get personnel by search via ajax get
function get_personnel(sstr, callback) {
   // reformat the search string to match better
  var stemp = sstr.split(/ /);
  for (var item in stemp) {
    stemp[item] = '*' + stemp[item] + '*';
  }
  var wild = stemp.join(' ');

  // try to handle special case of first+lastname search
  var firstName = 'foobar';
  var lastName = 'xyzzy';
  if (sstr.split(/ /).length==2) {
    var stemp = sstr.split(/ /);
    firstName = stemp[0];
    lastName = stemp[1];
  }

  rlog('Personnel search request: ' + sstr);
  var query_fields_1 = [ 'contact.email' ];
  var query_fields_2 = [ 'first_name*', 'last_name*', 'job_title_*', 'responsibility_*' ];
  var query_fields_3 = ['qualities'];
        var query = {
    'size': 9999,
    'sort': [ "_score", 'first_name','last_name' ],
    'query' : {
      'filtered' : {
        'query' : {
          'bool': {
            'should': [
              { 'bool': { 'should': [ { 'field': { 'first_name*': firstName } },
                { 'field': { 'last_name*': lastName } } ] } },
              { 'query_string': { 'fields': query_fields_1, 'query': wild } },
              { 'query_string': { 'fields': query_fields_2, 'query': wild } },
              { 'query_string': { 'fields': query_fields_3, 'query': wild } }
            ],
            'minimum_should_match' : 1
          }
        },
        'filter' : {
          'and' : [
            {'term': { 'meta.document_state' : 'published' } }
          ]
        }
      }
    }
  }


	query = JSON.stringify(query);
	query = encodeURIComponent(query);

  var options = {
    host: conf.proxy_config.host,
    port: conf.proxy_config.port,
    path: '/testink/person/_search?source='+query,
    method: 'GET'
  };

  var req = http.get(options, function(res) {
    res.setEncoding('utf8');
    data = '';
    res.on('data', function(chunk){
      data += chunk;
    });
    res.on('end', function() {
      dataobj = JSON.parse(data);
      async.mapSeries(dataobj.hits.hits, getOrganizationById, function(err, persons){
        if(err){
          rlog(err);
        } else {
          callback(persons)
        }
      })
    });
  }).on('error', function(e) {
    rlog('Problem with request: ' + e.message);
  });
}

function getOrganizationById(person, callback) {
  var id = person._source.organisation;
  if(id){

    // TODO limit result, only one possible
    var query = {
      'size': 9999,
      'query' : {
        "ids" : { 'values' : [id] }
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
        });
        res.on('end', function() {
          data = JSON.parse(data);
          if(data.hits.hits[0]){
            person._source.organisation = data.hits.hits[0]._source;
            callback(null, person);
          } else {
            callback(null, null);
          }        
        });
      }).on('error', function(e) {
        callback(e);
      });

  } else {
    callback(null, null);
  }
}

// get library by slug
function get_library_by_name(name, browser_req, callback) {
    var query =
    {
      "size": 1,
      "sort": [ "_score" ],
      "query": { 
        "match": {
          "additional_info.slug" : name
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
        //rlog('...read chunk: ' + chunk);
      });
      res.on('end', function() {
          dataobj = JSON.parse(data);
          if (dataobj.hits.total>0) {
            // might be needed to mitigate concurrency issue, as gettext reads
            // lang from global variable: switch_locale(browser_req);
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
function get_library_children(id, library_data, callback) {
  var query = {
    'size': 999,
    'sort': [ { 'name_fi' : {} } ],
    'query' : {
      'filtered' : {
        'query' : {'match_all':{}},
        'filter' : {
          'and' : [
            {'term': { 'parent_organisation' : id } },
            {'term': { 'meta.document_state' : 'published' } },
            { 'or': [
              {'term': { 'organisation_type': 'branchlibrary' } },
              {'term': { 'organisation_type': 'library' } },
              {'term': { 'organisation_type': 'department' } }
            ]
          }
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
    rlog('Requested children of: ' + id);
    res.setEncoding('utf8');
    data = '';
    res.on('data', function(chunk){
      data += chunk;
      //rlog("...read chunk: " + chunk);
    });

    res.on('end', function() {
      dataobj = JSON.parse(data);
      library = library_data._source;
      var results = dataobj.hits.hits;
      rlog('Children size: ' + results.length);
      //rlog(results);
      if (dataobj.hits.hits.length>0)
      {
        children = dataobj.hits.hits;
        var children = [];
        for (var item in dataobj.hits.hits) {
          var child = dataobj.hits.hits[item]._source;
          // get children database id for data retrieval/linking if pretty-url slug is missing
          child.id = dataobj.hits.hits[item]._id
          if (typeof child.additional_info !== 'undefined' && typeof child.additional_info.slug !== 'undefined') {
            if (child.additional_info.slug === '') {
              // TODO Put more data for view
              children.push( { link: child.id, name: child.name_fi, id:child.id });
            } else {
              children.push( { link: child.additional_info.slug, name: child.name_fi, id: child.id });
            }
          }
        }
        async.mapSeries(children,
          get_library_personnel.bind(null, children),
          function(err, data){
            library.children = data.dataobj;
            library.has_children = true;    
          })

        library.children = children;
        library.has_children = true; 
        
      } else {
        library.has_children = false;     
      }

      get_centralized_services(id, library_data, callback);
      
    });
  }).on('error', function(e) {
    rlog('Problem with request: ' + e.message);
  });
}

// get library's personnel by library id
function get_library_personnel(id, dataobj, callback) {
  // Small hack to reuse this function when getting children personnel
  if (typeof id === 'object'){
    id = dataobj.id;
  }

	var query = {
		"size": 999,
		"sort": [ { "last_name" : {} } ],
		"query": {
      "filtered": {
          "query": { "match": {"organisation" : id} },
          "filter": {
              "and": [
                  {
                    "term": { "meta.document_state" : "published" }
                  }
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
    path: '/testink/person/_search?source='+query,
    method: 'GET'
  };

  var req = http.get(options, function(res) {
    rlog('Requested personnel of: ' + id);

    res.setEncoding('utf8');
    data = '';
    res.on('data', function(chunk){
      data += chunk;
      //rlog("...read chunk: " + chunk);
    });
    res.on('end', function() {

      dataobj2 = JSON.parse(data);
      // if personnel exists, inject it into library data
      if (typeof dataobj2.hits !== 'undefined' && typeof dataobj2.hits.hits !== 'undefined') {
        personnel = dataobj2.hits.hits;

        // Awful solution but no other choice, since merge two object in javascript takes even 
        // more lines of code
        if(dataobj.hasOwnProperty('_source')){

          dataobj._source.has_personnel = false;

          if (personnel.length>0) {
            personnel = obfuscate_email_addresses(personnel);
            dataobj._source.personnel = personnel;
            dataobj._source.has_personnel = true;
          }


        } else {
            dataobj.has_personnel = false;
            if (personnel.length>0) {
              personnel = obfuscate_email_addresses(personnel);
              dataobj.personnel = personnel;
              dataobj.has_personnel = true;
            }
        }
        
        //rlog(personnel);
        rlog('Personnel size: ' + personnel.length);
      }
		  callback(null, {id: id, dataobj :dataobj});
    });
  }).on('error', function(e) {
    rlog('Problem with request: ' + e.message);
  });
}

// get library's centralized services by library id
function get_centralized_services(id, library_data, callback) {
	var query = {
		'size': 999,
		'sort': [ { 'name_fi' : {} } ],
		'query': {
      'filtered': {
        'query': { 'match_all': {} },
        'filter': {
          'and': [
            {'term': { 'parent_organisation' : id } },
            {'term': { 'organisation_type' : 'unit' } }
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
    rlog('Requested centralized services of: ' + id);

    res.setEncoding('utf8');
    data = '';
    res.on('data', function(chunk){
      data += chunk;
    //rlog('...read chunk: ' + chunk);
    });
    res.on('end', function() {

    // if centralized services exist, inject them into library data
      dataobj = JSON.parse(data);
      var library = library_data._source;
      library.has_services = false;

      if (typeof dataobj.hits !== 'undefined' &&
        typeof dataobj.hits.hits !== 'undefined') {
        results = dataobj.hits.hits;

        var services = [];
        if (results.length>0) {
          for (var item in results) {
            var temp = results[item];
            services.push( { name: temp._source.name_fi, link: temp._id });
          }

          library.has_services = true;
          library.services = services;

        }

        rlog('Services size: ' + results.length);
      }
      get_library_opening_times(id, library_data, null, callback);
    });
  }).on('error', function(e) {
    rlog('Problem with request: ' + e.message);
  });
}


// number formatting for zeropadded dates
function zpad(num) {
  return ('0' + num).slice(-2);
}

function get_monday(date){
  var unixtime = date.getTime();
  var daynum = date.getDay();

  /* js daynum is 0-6 starting from sunday, libdir daynum is 0-6 starting from monday, fix it */
  if (daynum===0){
    daynum = 7;
  }
  daynum = daynum-1;

  /* get time for current week's monday */
  var mtime = new Date(unixtime-24*60*60*1000*daynum);

  /* get YYYY-MM-DD for current week's monday */
  return mtime.getFullYear() + '-' + zpad(mtime.getMonth()+1) + '-' + zpad(mtime.getDate());

}

// get library's opening times by library id
function get_library_opening_times(id, dataobj, fromDate, callback) {

	var days_translated = [ _('Monday'),
							_('Tuesday'),
							_('Wednesday'),
							_('Thursday'),
							_('Friday'),
							_('Saturday'),
							_('Sunday') ];

	// container for formatted opening times data
	var opening_hours = new Object();
	opening_hours.has_opening_hours = false;
	opening_hours.open_now = false;


	var curtime = new Date();

  if(fromDate){
    if(get_monday(fromDate) !== get_monday(curtime)){
      curtime = new Date(fromDate);
    } else {
      opening_hours.this_week = true;
    }
  }

  var mondaydate = get_monday(curtime);

	var daynum = curtime.getDay();

  if (daynum===0){
    daynum = 7;
  }

  daynum = daynum-1;

	var query = {
		'size': 999,
		'query': {
      'filtered': {
        'query': { 'match_all': {} },
        'filter': {
            'and': [
              {'term': { 'organisation' : id } },
              {'term': { '_type' : 'week' } },
              {'term': { '_id' : id + '::' + mondaydate } }
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
    path: '/production_libdir_hours/_search?source='+query,
    method: 'GET'
  };

  var req = http.get(options, function(res) {
    rlog('Requested opening times for: ' + id + ' from monday ' + mondaydate);

    res.setEncoding('utf8');
    data = '';
    res.on('data', function(chunk){
      data += chunk;
    });
    res.on('end', function() {
      data=JSON.parse(data);

      if (data.hits.total===0) {
        dataobj._source.opening_hours = opening_hours;
        callback(dataobj);
        return;
      }

      var opening_times = data.hits.hits[0]._source.days;

      // extract HH:MM time from ecmascript timestamp
      function format_time(str) {
        var idx = str.indexOf('T')+1;
        return str.slice(idx).slice(0,5);
      }

      // extract opening times for use in view templates
      opening_hours.open_hours_week = [];
      opening_hours.has_opening_hours = true;
      var ot = opening_times;
      for (var idx in ot) {
        var day = ot[idx];

        // include info about "current day" in opening hours data for week
        var today_status = false;
        if (parseInt(idx) == daynum){
          today_status = true;
        }

        // take copy of period description for lib details view template
        var desc = day['period_description_' +_ ('locale')];
        if (desc !== undefined && desc !== '') {
          opening_hours.period_description = desc;
        }

        // try to handle missing or corrupt opening times data gracefully, assume closed status if so
        if (day.date===undefined || day.opens===undefined || day.closes===undefined) {
          opening_hours.open_hours_week[idx] = { day: days_translated[idx], time: _('closed'), today: today_status };
          continue;
        }

        if (parseInt(idx) === daynum && day.closed === true) {
          opening_hours.open_now = false;
        }

        if (day.closed===true) {
          opening_hours.open_hours_week[idx] = { day: days_translated[idx], time: _('closed'), today: today_status };
          continue;
        }
        else {
          var opens = format_time(day.opens);
          var closes = format_time(day.closes);
          opening_hours.open_hours_week[idx] = {
            day: days_translated[idx],
            time: opens + ' - ' + closes,
            today: today_status
          };
        }

        if (parseInt(idx) === daynum && day.closed === false) {
          var opens = format_time(day.opens);
          var closes = format_time(day.closes);
          var tzoffset = curtime.getTimezoneOffset();
          var opentime = new Date(day.opens).getTime()+tzoffset*60*1000;
          var closetime = new Date(day.closes).getTime()+tzoffset*60*1000;

          if (curtime >= opentime && curtime <= closetime){
            opening_hours.open_now = true;
          }

          // If fromDate isn't null, then open_hours_today is irrelevant
          if (!fromDate){
            opening_hours.open_hours_today = opens + ' - ' + closes;
          }
        }
      }

      dataobj._source.opening_hours = opening_hours;
      dataobj._source.opening_hours.mondaydate = mondaydate;

      // if(!dataobj._source.parent_organisation){
      //   callback(dataobj);
      // } else {
      //   rlog('Getting parent personnel')
      //   get_library_personnel(dataobj._source.parent_organisation,
      //     dataobj,
      //     function(err, data){
      //     if(err){
      //       // rlog(err);
      //       callback(null)
      //     } else {
      //       dataobj.parent_organisation_personnel = data.dataobj;
      //       callback(dataobj);
      //     }
      //   })
      // }

      callback(dataobj);
    });
  }).on('error', function(e) {
    rlog('Problem with request: ' + e.message);
  });
}


var headerfilecontents = fs.readFileSync(__dirname + headerfile, 'utf-8');
var footerfilecontents = fs.readFileSync(__dirname + footerfile, 'utf-8');

try {
    header_banner = fs.readFileSync('./views/header-banner.html','utf8');
  } catch(err) {
    rlog('No header banner in use. OK');
  }
try {
    header_banner_css = fs.readFileSync('./views/header-banner.css','utf8');
  } catch(err) {
    rlog('No header banner css in use. OK');
  }
try {
    footer_banner = fs.readFileSync('./views/footer-banner.html','utf8');
  } catch(err) {
    rlog('No footer banner in use. OK');
  }

var watch = require('nodewatch');
// Adding 2 dirs relative from process.cwd()
// Nested dirs are not watched
// dirs can also be added absolute
watch.add('./views').onChange(function(file,prev,curr,action){
    // .add("./output/views") omitted since it would crash entire server.js
    // each time h5bp is run and output folder emptied
    rlog('Views changed and reloaded');
    // Hogan.js does not support template inheritance yet, must do workaround
    // https://gist.github.com/1854699
    headerfilecontents = fs.readFileSync(__dirname + headerfile, 'utf-8');
    footerfilecontents = fs.readFileSync(__dirname + footerfile, 'utf-8');
  });

// wrapped functions to transparently forward rendering to proper
// rendering function that also has built in localization
var header = new function () {
    this.render = function (req, options) {
        options.lang = gettext.lang;
        options.resource = req.params.resource;
        options[gettext.lang+'_active'] = true;
        options.header_banner = header_banner;
        options.header_banner_css = header_banner_css;
        // handle ssl-proxy same origin policy
        if (req.headers['x-forwarded-proto']==='https') {
          headerfilecontents = headerfilecontents.replace(/(http\:|https\:)/g, 'https:');
        } else {
          headerfilecontents = headerfilecontents.replace(/(http\:|https\:)/g, 'http:');
        }
        return adapter.init(hogan).compile(headerfilecontents)(options);
      };
  }

var footer = new function () {
    this.render = function (req, options) {
        if (typeof options == 'undefined') {
           options = {};
        }
        // handle ssl-proxy same origin policy
        if (req.headers['x-forwarded-proto']=='https') {
          footerfilecontents = footerfilecontents.replace(/(http\:|https\:)/g, 'https:');
          footer_banner = footer_banner.replace(/(http\:|https\:)/g, 'https:');
        } else {
          footerfilecontents = footerfilecontents.replace(/(http\:|https\:)/g, 'http:');
          footer_banner = footer_banner.replace(/(http\:|https\:)/g, 'http:');
        }
        options.footer_banner = footer_banner;
        return adapter.init(hogan).compile(footerfilecontents)(options);
    }
}

var widget = new function() {
	this.render = function (req, options) {
		var widget_id = req.query.type;
		var widgetdata = fs.readFileSync(__dirname + '/views/json_widget_' + widget_id + '.mustache', 'utf-8');
		return adapter.init(hogan).compile(widgetdata)(options);
	}
}

// obfuscate displayed email-addresses a bit to avoid harvester bots
function obfuscate_email(email) {
  parts = email.split('@');
  head = parts[0];
  tail = parts[1].split('');
  tail.unshift('@');

  obfuscated = [];
  tail.forEach(function(char) {
    obfuscated.push('&#' + char.charCodeAt() + ';');
  });

  return head + obfuscated.join('');
}

function obfuscate_email_addresses(data) {
  data.forEach(function(person) {
    person = person._source;
    // obfuscate if person's email is defined and valid-ish
    if (typeof person.contact.email !== 'undefined' &&
      person.contact.email.length>0 && person.contact.email.indexOf('@') !== -1) {
      if (typeof person.contact.public_email !== 'undefined' && person.contact.public_email === true){
        person.contact.email = obfuscate_email(person.contact.email);
      } else{
        delete person.contact.email;
      }
    //rlog('email: ' + person.contact.email);
    }

  // delete person's empty fields
    if (typeof person.contact.email !== 'undefined' &&
      person.contact.email === '') { delete person.contact.email; }
    if (typeof person.contact.telephone !== 'undefined' &&
      person.contact.telephone === '') {
      delete person.contact.telephone;
    }
    if (typeof person.job_title_fi !== 'undefined' &&
      person.job_title_fi === '') { delete person.job_title_fi; }

  });
  return data;
}


app.listen(conf.server_port);
get_consortium_data();
get_region_data();
get_person_qualities_data();

rlog('Server started at port ' + conf.server_port);

