/* Author:

*/

/* enable javascript gettext-translations */
// for json-data
//var params = {  "domain": "messages", "locale_data": ld_json_locale_data };

//for po-data
var params = {  "domain": "messages" };
var gt = new Gettext(params);
function _ (msgid) { return gt.gettext(msgid); }

function ld_mapcontrol_init(coords, name, desc) {
	if (coords.length<2) {
		alert("Error: coordinates are missing");
		return true; }

	var lat = coords.split(",")[0];
	var lon = coords.split(",")[1];

	/* initialize map canvas and set location for given coordinates */
	$(window).scrollTop(0);
	$('#basicmap').empty();
	$('#mapcontrol').empty();
	$('#basicmap').show();

	var mapOptions = {
		controls: [
			new OpenLayers.Control.Navigation(),
			new OpenLayers.Control.PanZoomBar(),
			//new OpenLayers.Control.LayerSwitcher(),
			new OpenLayers.Control.Attribution() ],
		theme: '/js/libs/openlayers/style.css'
	};

	/* convert wgs-84 coordinates into OSM spherical mercator projection */
	var fromProjection = new OpenLayers.Projection("EPSG:4326");
	var toProjection = new OpenLayers.Projection("EPSG:900913");
	var mapLocation = new OpenLayers.LonLat(lon, lat).transform(fromProjection,toProjection);

	/* add map layers */
	var osmLayer = new OpenLayers.Layer.OSM("OpenStreetMap");
	//var gmapLayer = new OpenLayers.Layer.Google("Google Streets", { numZoomLevels: 22 });

	map = new OpenLayers.Map("basicmap", mapOptions);

	map.addLayers([osmLayer]);
	map.setCenter(mapLocation, 15);

	/* add marker layer with coordinate projection transform */
	var vectorLayer = new OpenLayers.Layer.Vector("Overlay");
	var marker = new OpenLayers.Feature.Vector(
		new OpenLayers.Geometry.Point(lon, lat).transform(fromProjection,toProjection),
		{ },
		{externalGraphic: 'js/libs/openlayers/markers/marker-black.png', graphicHeight: 41, graphicWidth: 25, graphicYOffset: -40});
	if (name!="" && desc!="") {
		popup = new OpenLayers.Popup.FramedCloud("popup", mapLocation, new OpenLayers.Size(200, 200), name+desc, null, false);
		// dont' style name and desc here, they come prestyled from calling functions
		// consider joining to one variable, e.g. htmlcontents
		map.addPopup(popup);
	}

	vectorLayer.addFeatures(marker);
	map.addLayer(vectorLayer);

	// I don't think we need this?
	// $('#mapcontrol').append('<button class="btn btn-danger" onclick="ld_mapcontrol_close();">Hide map</button>');
      }


function ld_mapcontrol_close() {
	/* clear and hide the map elements */
	$('#basicmap').slideToggle();
	$('#basicmap').empty();
	$('#mapcontrol').empty();
}

/* geolocation related variables, globals for now */
var ld_position = false;
var ld_position_coords = null;

/* calculate whether library is open at given time or not, helper functions */
function ld_open_now(timerange) {
	start = String(timerange.start)
	stop = String(timerange.end)

    timestamp = new Date();
    mins = timestamp.getMinutes();
    hrs = timestamp.getHours();

    current_time = hrs*60+mins;

    start_time = ld_get_minutes(start);
    end_time = ld_get_minutes(stop);

    /* 15 minute buffer for closing-time */
    if (current_time>=start_time && (current_time+15)<=end_time) return true;
    else return false;
}

function ld_get_minutes(time) {
    mins = Number(time.slice(-2));
    hrs = Number(time.slice(0,-2));

    return hrs*60+mins;
}

function ld_format_time(time) {
	time = String(time);
	mins = time.slice(-2);
	hrs = time.slice(0,-2);
	return hrs+":"+mins
}

function ld_widget_wizard() {
	$("#widgetcode").empty();

	// construct the widget code
	$("#makewidget").bind('click', function() {
		var id = $("#widget_library").val();
		var consortium = $("#widget_consortium").val();
		var type = $("#widget_type").val();
		var uuid = get_uuid();
		var code = "";
		var widget_lang = $("#widget_lang").val();
		var style = $("#widgetstyle").val().replace(/\n+/g," ");
		var lang = "";

		//if (widget_lang != "") lang = '?lang=' + widget_lang;
		if (widget_lang != "") lang = widget_lang;

		switch(type) {
			// 1-3 iframe widgets
			case "1":
				if (lang != '') lang+="/";
				var code =	'<iframe src="http://omppu:8080/' + lang + 'widget1';
				if (consortium != '') code += '?area='+consortium+'"';
				else code += '"';
				if (style != '') code += ' style="' + style + '"';
				code += '></iframe>';
				break;

			case "2":
				if (lang != '') lang+="/";
				var code =	'<iframe src="http://omppu:8080/' + lang;
				code += 'widget2?id='  + id + '"';
				if (style != '') code += ' style="' + style + '"';
				code += '></iframe>';
				break;

			case "3":
				if (lang != '') lang+="/";
				var code =	'<iframe src="http://omppu:8080/' + lang;
				code += 'widget3?id='  + id + '"';
				if (style != '') code += ' style="' + style + '"';
				code += '></iframe>';
				break;

			// jsonp-widgets
			default:
				var code = '<script class="libdir_widget" ';
				code += 'data-params="id=' + id + '" ';
				code += 'data-type="' + type + '" ';
				code += 'data-id="' + uuid + '" ';
				code += 'data-lang="' + lang + '" ';
				code += 'src="' + "http://omppu:8080/js/widget.js" + '" ';
				code += 'type="text/javascript"></script>';
				code += '<div class="libdir_widget_' + type + '" ';
				if (style!="") code += 'style="' + style + '" ';
				code += 'id="libdir_widget-' + uuid + '"' + '></div>';
				break;
		}
		$("#widgetcode").val(code);
	});

	function get_uuid() {
		// http://www.ietf.org/rfc/rfc4122.txt
		var s = [];
		var hexDigits = "0123456789abcdef";
		for (var i = 0; i < 36; i++) {
			s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
		}
		s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
		s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
		s[8] = s[13] = s[18] = s[23] = "-";

		var uuid = s.join("");
		return uuid;
	}

	$(".langselector").bind('click', function(event) {
		event.preventDefault();
		$("#widget_lang").val($(this).attr('value'));
	});

	$(function() {
		$( "#radio" ).buttonset();
	});

	$(function() {
		$("#libraries").selectable({
			stop: function() {
				$(".ui-selected", this).each(function() {
					$('#widget_library').val($(this).attr("data-id"));
					$('#widget_consortium').val($(this).attr("data-consortium"));
				});
			}
		});

		$("#types").selectable({
			stop: function() {
				$(".ui-selected", this).each(function() {
					$('#widget_type').val($(this).attr("data-type"));
				});
			}
		});
	});

	$(document).bind('search', function(event, data) {

		var url = "http://localhost:8888/testink/organisation/_search";
		var query2 =
			{
			  "size": 10,
			  "sort": [ { "name_fi" : {} } ],
			  "query":
				{ "query_string":
					{
						//"default_operator": "AND",
						"fields": ["contact.street_address.street_*", "name_*"],
						"query": "*"+data.terms+"*"
					}
				}
			};

		query = JSON.stringify(query2);
		//console.log(query);

		$.ajax({
			url: url,
			data: { source: query },
			dataType: "jsonp",
			beforeSend: function() { $('#status').html("searching"); },
			complete: function(data) { /*console.log("ajax complete");*/ },
			success: function(data) {
				$('#status').html("done") ;
				results = new Object();
				results["records"] = new Array();
				var index=1;
				for (var item in data.hits.hits) {
					data.hits.hits[item]._source["id"] = data.hits.hits[item]._id;
					data.hits.hits[item]._source["count"] = index;
					results["records"].push(data.hits.hits[item]._source);
					index++;
				}
				results.hits = data.hits.total;

				var template =
					'{{#records}}' +
					  '<li data-id="{{id}}" data-consortium="{{consortium}}"><strong>' +
					  '{{#name_' + _("locale") + '}}' +
					    '{{name_' + _("locale") + '}}' +
					  '{{/name_' + _("locale") + '}}' +
					  '{{^name_' + _("locale") + '}}' +
					    '{{name_fi}}' +
					  '{{/name_' + _("locale") + '}}' +
					  '</strong><br>' +
					  '{{#contact.street_address.street_' + _("locale") + '}}' +
					    '{{contact.street_address.street_' + _("locale") + '}}' +
					  '{{/contact.street_address.street_' + _("locale") + '}}' +
					  '{{^contact.street_address.street_' + _("locale") + '}}' +
					    '{{contact.street_address.street_fi}}' +
					  '{{/contact.street_address.street_' + _("locale") + '}}' +
					'{{/records}}';

				$('.search_results').empty();
				if (results.records.length>0) {
					$('#hits').html(results.hits + " " + _("results, showing first 10 ordered by name"));
					$('.search_results').html(Mustache.render(template, results)); }
				else {
					$('.search_results').html("No results");
					$('#hits').html("No hits");
				}
			}
		})
	});

	// submit on each key press if interval>500 ms
	$('#search_txt').keyup(function() {
		typewatch(function () {
			var lastSearchTerm = $('#search_txt').data('lastSearchTerm');
			if (!lastSearchTerm) {
				lastSearchTerm = '';
			}
			if (lastSearchTerm != $('#search_txt').val()) {
				$(document).trigger('search', {terms:$('#search_txt').val()});
			}
			$('#search_txt').data('lastSearchTerm', $('#search_txt').val());
		}, 500);
	});

	var typewatch = (function() {
		var timer = 0;
		return function(callback, ms) {
			clearTimeout(timer);
			timer = setTimeout(callback, ms);
		}
	})();
}
