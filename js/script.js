/* Author:

*/

/* enable javascript gettext-translations */
var gt = new Gettext( { "domain": "messages" } );
function _(msgid) { return gt.gettext(msgid); }

// variable to hold the facet filters in memory, hash params across page navigation/history
var facethash = {};

function ld_parse_url_hash() {
  var hash = window.location.hash;

  var data = {};
  var params = [];
  if (hash.indexOf("#") != -1) params = decodeURIComponent(hash).slice(1).split("&");

  if (params.length==0) return data;

  // for (var temp in params) {
  for (var temp=0;temp<params.length;temp++) {
    var param = params[temp];
    var args = param.split("=");

    // data[args[0]]=decodeURIComponent(args[1]);
    data[args[0]]=args[1];
  }
  return data;
}

function ld_append_url_hash(param) {
  // get current parameters
  var curHash = window.location.hash;

  // get new parameters
  var newParams = param.split("=");
  var newKey = newParams[0];
  var newVal = newParams[1];

  // decode current hash data into object
  var newData = {};
  if (curHash.indexOf("#") != -1) {
    var params = curHash.slice(1).split("&");

    for (var temp=0;temp<params.length;temp++) {
      var param = params[temp];
      var args = param.split("=");

      // newData[args[0]]=decodeURIComponent(args[1]);
      newData[args[0]]=args[1];
    }
  }

  // check for old key
  if (newData[newKey] != undefined) {
    if (newVal=='') delete newData[newKey];
    // else newData[newKey] = encodeURIComponent(newVal);
    else newData[newKey] = newVal;
  }
  // insert new key & val if value is nonempty
  else {
    if (newVal != ''){
      // newData[newKey] = encodeURIComponent(newVal);
      newData[newKey] = newVal;
    }
  }

  // put new data into array
  var newHash = [];
  for (var key in newData) {
    newHash.push(key + "=" + newData[key]);
  }

  if (newHash.length>0) window.location.hash = newHash.join("&");
  else window.location.hash = "";
}

function ld_mapcontrol_init_geoloc(data) {
  if (data.length==0) {
    $('#basicmap').hide();
    return;
  }

    // hide hero-unit if map visible
  //$("#introtext").slideUp();

  /* initialize map canvas and set location for given coordinates */
  $(window).scrollTop(0);
  $('#basicmap').empty();
  $('#mapcontrol').empty();
  $('#basicmap').show();

  var mapOptions = {
    controls: [
      new OpenLayers.Control.Navigation({'zoomWheelEnabled': false}),
      new OpenLayers.Control.PanZoomBar(),
      new OpenLayers.Control.LayerSwitcher(),
      new OpenLayers.Control.Attribution() ],
    theme: '/js/libs/openlayers/style.css'
  };

  /* convert wgs-84 coordinates into OSM spherical mercator projection */
  var fromProjection = new OpenLayers.Projection("EPSG:4326");
  var toProjection = new OpenLayers.Projection("EPSG:900913");
  //var mapLocation = new OpenLayers.LonLat(lon, lat).transform(fromProjection,toProjection);

  /* add map layers */
  var osmLayer = new OpenLayers.Layer.OSM("OpenStreetMap");
  var gmapLayer = new OpenLayers.Layer.Google("Google Streets", { numZoomLevels: 19 });
  var map = new OpenLayers.Map("basicmap", mapOptions);
  //map.addLayers([osmLayer]);
  map.addLayers([osmLayer, gmapLayer]);
  //map.setCenter(mapLocation, 12);

  /* add marker layer with coordinate projection transform */
  var vectorLayer = new OpenLayers.Layer.Vector("Overlay");
  map.addLayer(vectorLayer);

  // show user position, if available
  if (ld_position) {
    var lat = ld_position_coords.latitude;
    var lon = ld_position_coords.longitude;

    var marker = new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.Point(lon, lat).transform(fromProjection,toProjection),
      { html: _("My Location") },
      { externalGraphic: 'js/libs/openlayers/markers/blue_dot_circle.png', graphicHeight: 10, graphicWidth: 10, graphicYOffset: -5 }
    );
    vectorLayer.addFeatures(marker);
  }

  /* selector for marker popups */
  var controls = { selector: new OpenLayers.Control.SelectFeature(vectorLayer, { onSelect: createPopup, onUnselect: destroyPopup, hover: true }) };
  map.addControl(controls['selector']);
  controls['selector'].activate();

  // bounding box for marker data
  var bounds = new OpenLayers.Bounds();

  /* add all libraries from results */
  // for (var item in data) {
  for (var item=0;item<data.length;item++) {
    var rec = data[item];
    if (rec.contact.coordinates != undefined && rec.contact.coordinates.length>2) {
      var lat = rec.contact.coordinates.split(",")[0];
      var lon = rec.contact.coordinates.split(",")[1];

      // extend marker bounding box
      bounds.extend(new OpenLayers.Geometry.Point(lon, lat).transform(fromProjection,toProjection));

      var html = rec.map_popup_html;

      var markersymbol = 'js/libs/openlayers/markers/marker-red-small.png';
      if (rec.open_now==true) markersymbol = 'js/libs/openlayers/markers/marker-green-small.png';
      if (rec.organisation_type == 'institution_library' || rec.organisation_type == 'home_service')
        {
          markersymbol = 'js/libs/openlayers/markers/marker-black-small.png';
        }

      var marker = new OpenLayers.Feature.Vector(
        new OpenLayers.Geometry.Point(lon, lat).transform(fromProjection,toProjection),
        { html: html },
        { externalGraphic: markersymbol, graphicHeight: 26, graphicWidth: 16, graphicYOffset: -26 }
      );
      vectorLayer.addFeatures(marker);
    }
  }

  // center map on markers and set proper zoomlevel
  map.zoomToExtent(bounds, false);

  /* click on marker */
  function createPopup(feature) {
    feature.popup =
    new OpenLayers.Popup.FramedCloud(
      "pop", feature.geometry.getBounds().getCenterLonLat(), null,
      '<div>'+feature.attributes.html+'</div>', null, true,
      function() { controls['selector'].unselectAll(); });
    map.addPopup(feature.popup);
  }

  /* click somewhere else */
  function destroyPopup(feature) {
    feature.popup.destroy();
    feature.popup = null;
  }
}

function ld_mapcontrol_init(coords, info) {
  if (coords.length<2) {
    //alert("Error: coordinates are missing");
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
      new OpenLayers.Control.LayerSwitcher(),
      new OpenLayers.Control.Attribution() ],
    theme: '/js/libs/openlayers/style.css'
  };

  /* convert wgs-84 coordinates into OSM spherical mercator projection */
  var fromProjection = new OpenLayers.Projection("EPSG:4326");
  var toProjection = new OpenLayers.Projection("EPSG:900913");
  var mapLocation = new OpenLayers.LonLat(lon, lat).transform(fromProjection,toProjection);

  /* add map layers */
  var osmLayer = new OpenLayers.Layer.OSM("OpenStreetMap");
  var gmapLayer = new OpenLayers.Layer.Google("Google Streets", { numZoomLevels: 19 });

  map = new OpenLayers.Map("basicmap", mapOptions);

  //map.addLayers([osmLayer]);
  map.addLayers([osmLayer, gmapLayer]);
  map.setCenter(mapLocation, 15);

  /* add marker layer with coordinate projection transform */
  var vectorLayer = new OpenLayers.Layer.Vector("Overlay");
  map.addLayer(vectorLayer);

  var marker = new OpenLayers.Feature.Vector(
    new OpenLayers.Geometry.Point(lon, lat).transform(fromProjection,toProjection),
    { html: info },
    { externalGraphic: 'js/libs/openlayers/markers/marker-black.png', graphicHeight: 41, graphicWidth: 25, graphicYOffset: -41 }
  );
  vectorLayer.addFeatures(marker);

  /* add marker popup */
  if (info != "") {
    var popup =
    new OpenLayers.Popup.FramedCloud(
      "pop", marker.geometry.getBounds().getCenterLonLat(), null,
      '<div>'+marker.attributes.html+'</div>', null, false);
    map.addPopup(popup);
  }

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
    if (current_time>=start_time && current_time<=end_time) return true;
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


var optionsArr = [];

function ld_widget_wizard() {
  // url for widgets/data
  // handle ssl-proxy
  var proto = 'http';
  if (window.location.protocol == 'https:') {
    proto = 'https';
  }
  var url = proto + "://localhost:8080/";

  function load_widget_css(type) {
    var css_link = $("<link>", {
      rel: "stylesheet",
      type: "text/css",
      href: url + "css/json_widget" + type + ".css" });
    css_link.appendTo('head');
  }

  // preload jsonp-widget css
  load_widget_css(4);
  load_widget_css(5);

  $(".langselector").prop('disabled', true);
  $(".typeselector").prop('disabled', true);
  $("#widget_style").prop('disabled', true);

  // construct the widget code
  function build_widget() {

    var id = $("#widget_library").val();
    var consortium = $("#widget_consortium").val();
    var city = $("#widget_city").val();
    var filters = $("#widget_filter").val().split(',');
    var type = $("#widget_type").val();
    var uuid = get_uuid();
    var code = "";
    var widget_lang = $("#widget_lang").val();
    var lang = "";
    var size = $("input[name='radioAdjustNumberOfLibs']:checked").val();

    // var size = numberOfLibsOnPage;

    // apply default css for iframe-widget
    if (type=="1" || type=="2" || type=="3") {
      if ($("#widget_style").val() == "") $("#widget_style").val("width: 550px;\nheight: 550px;")
    }
    var style = $("#widget_style").val().replace(/\n+/g," ");

    //if (widget_lang != "") lang = '?lang=' + widget_lang;
    if (widget_lang != "") lang = widget_lang;


    switch(type) {
      // 1-3 iframe widgets
      case "1":
        if (lang != '') lang+="/";
        var code =  '<iframe src="' + url + lang + 'widget1';

        for (var i = filters.length - 1; i >= 0; i--) {
          if(filters[i] === 'city') {
            optionsArr.push(filters[i] + "=" + city);
          }
          if(filters[i] === 'area') {
            optionsArr.push(filters[i] + "=" + consortium);
          }
        };

        if (size) optionsArr.push('size='+size);

        for(var x=0;x<optionsArr.length;x++){
          if (x === 0) code+= '?'
          code += optionsArr[x];
          if (x!==optionsArr.length-1) code+= '&'
        }

        code+='"';
        optionsArr = [];

        if (style != '') code += ' style="' + style + '"';
        code += '></iframe>';
        break;

      case "2":
        if (lang != '') lang+="/";
        var code =  '<iframe src="' + url + lang;
        code += 'widget2?id='  + id + '"';
        if (style != '') code += ' style="' + style + '"';
        code += '></iframe>';
        break;

      case "3":
        if (lang != '') lang+="/";
        var code =  '<iframe src="' + url + lang;
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
        code += 'src="' + url + 'js/widget.js' + '" ';
        code += 'type="text/javascript"></script>';
        code += '<div class="libdir_widget_' + type + '" ';
        if (style!="") code += 'style="' + style + '" ';
        code += 'id="libdir_widget-' + uuid + '"' + '></div>';
        break;
    }

    $("#widget_code").val(code);

    // update preview for jsonp-widgets
    if (type=="4" || type=="5") {
      var code = "";
      code += '<div class="libdir_widget_' + type + '" ';
      if (style!="") code += 'style="' + style + '" ';
      code += 'id="libdir_widget-' + uuid + '"' + '></div>';

      $("#widget_preview").html(code);

      var jsonp_url = "";
      if (lang != "") {
        jsonp_url = url + lang + "/loadwidget?id="+id+"&type="+type+"&callback=?";
      } else {
        jsonp_url = url + "loadwidget?id="+id+"&type="+type+"&callback=?";
      }

      $.getJSON(jsonp_url, function(data) { $('#libdir_widget-' + uuid).html(data.html); });
    }
    // update preview for iframe-widgets
    else {
      $("#widget_preview").html(code);
    }
  }

  // generate unique identifier for jsonp-widget to avoid namespace collisions
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
    build_widget();
  });

  $(".typeselector").bind('click', function(event) {
    event.preventDefault();
    var value = $(this).attr('value');
    $("#widget_type").val(value);
    if (value==1) $(".filter").show();
    else $(".filter").hide();
    build_widget();
  });


  $(".filterselector").bind('click', function(event) {
    $($(this)).button('toggle')
    var filtersWidgetArr = []; 
    event.preventDefault();
    $('.filterselector').each(function() {
        if($(this).hasClass('active')){
          filtersWidgetArr.push($(this).attr('value'));
        }
    });

    $("#widget_filter").val(filtersWidgetArr);
    build_widget();
  
  });

  // submit on each key press if interval>800 ms
  $('#widget_style').keyup(function() {
    typewatch(function () {
      build_widget();
    }, 800);
  });

  $("input[name='radioAdjustNumberOfLibs']").change(function(event){
    event.preventDefault();
    build_widget();
  });


  $(document).bind('search', function(event, data) {
    // handle ssl-proxy
    var proto = 'http';
    if (window.location.protocol == 'https:') {
      proto = 'https';
    }
    var url = proto + "://localhost:8888/testink/organisation/_search";
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


    var showerror = function(msg) {
      if (!msg){ msg = _("Error: unspecified"); }
      $('.search_results').html('<div id="errormsg" class="alert alert-error"><i class="icon-warning-sign"></i> <strong>' + _("Error") + ':</strong> '+msg+'</div>');
    }

    var searchTimer = window.setTimeout(function() { showerror(_("Could not connect to database. Please try again later.")) }, 5000);
    $.ajax({
      url: url,
      data: { source: query },
      dataType: "jsonp",
      success: function(data) {
        window.clearTimeout(searchTimer);
        results = new Object();
        results["records"] = new Array();
        var index=1;

        for(var item=0;item<data.hits.hits.length;item++) {
          data.hits.hits[item]._source["id"] = data.hits.hits[item]._id;
          data.hits.hits[item]._source["count"] = index;
          results["records"].push(data.hits.hits[item]._source);
          index++;
        }
        results.hits = data.hits.total;
        var template =
          '{{#records}}' +
            '<div style="width: 35%;" class="alert alert-info searchresults" data-id="{{id}}" data-consortium="{{consortium}}" '+
            'data-city="' + '{{contact.street_address.municipality_' + _("locale") + '}}' + '">' +
            '<strong>' +
            '{{#name_' + _("locale") + '}}' +
              '{{name_' + _("locale") + '}}' +
            '{{/name_' + _("locale") + '}}' +
            '{{^name_' + _("locale") + '}}' +
              '{{name_fi}}' +
            '{{/name_' + _("locale") + '}}' +
            '</strong>' +
            '<br>' +
            '{{#contact.street_address.street_' + _("locale") + '}}' +
              '{{contact.street_address.street_' + _("locale") + '}}' +
            '{{/contact.street_address.street_' + _("locale") + '}}' +
            '{{^contact.street_address.street_' + _("locale") + '}}' +
              '{{contact.street_address.street_fi}}' +
            '{{/contact.street_address.street_' + _("locale") + '}}' +
            ', ' +
            '{{#contact.street_address.municipality_' + _("locale") + '}}' +
              '{{contact.street_address.municipality_' + _("locale") + '}}' +
            '{{/contact.street_address.municipality_' + _("locale") + '}}' +
            '{{^contact.street_address.municipality_' + _("locale") + '}}' +
              '{{contact.street_address.municipality_fi}}' +
            '{{/contact.street_address.municipality_' + _("locale") + '}}' +
            '</div>' +
          '{{/records}}';

        $('.search_results').empty();
        if (results.hits>0) {
          if (results.hits>10) $('#hits').html(_("Too many search results, showing first 10"));
          else $('#hits').html("");
          $('.search_results').html(Mustache.render(template, results));
          $('.searchresults').bind('click', function(event) {
            event.preventDefault();
            $(this).siblings().remove();
            $(this).removeClass("alert-info");
            $(this).addClass("alert-success");
            $(this).unbind('click');

            $('#widget_library').val($(this).attr("data-id"));
            $('#widget_consortium').val($(this).attr("data-consortium"));
            $('#widget_city').val($(this).attr("data-city"));

            $('.typeselector').first().button('toggle').trigger('click');
            $('.langselector').first().button('toggle').trigger('click');
            
            // $('.filterselector').first().button('toggle').trigger('click');

            $(".langselector").removeProp('disabled');
            $(".typeselector").removeProp('disabled');
            $("#widget_style").removeProp('disabled');

            });
        } else {
          $('.search_results').html("");
          $('#hits').html(_("No search results"));
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

/*
Fix IOS scaling bug
http://stackoverflow.com/questions/5434656/ipad-layout-scales-up-when-rotating-from-portrait-to-landcape
*/
if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)) {
    var viewportmeta = document.querySelector('meta[name="viewport"]');
    if (viewportmeta) {
        viewportmeta.content = 'width=device-width, minimum-scale=1.0, maximum-scale=1.0, initial-scale=1.0';
        document.body.addEventListener('gesturestart', function () {
            viewportmeta.content = 'width=device-width, minimum-scale=0.25, maximum-scale=1.6';
        }, false);
    }
}


/* personnel search as ajax get */
var ajaxIsRunning = false;

function ld_personnel_search(data) {

    $('#personnel-search-go').attr('disabled', 'disabled');

    if(ajaxIsRunning) return;

    if(!data) return;

    ajaxIsRunning = true;

    $.ajax({
      url: "/personnel-search",
      cache: false,
      type: 'POST',
      data: { sstr: data },
      success: function(html) {
        $('#personnel-search-go').removeAttr('disabled');
        $("#personnel-search-results").html(html);
      },
      complete: function(){
        ajaxIsRunning = false;
      },
      error: function(jqXHR, status){
        // console.dir(jqXHR);
        // console.dir(status);
      }
    });
}

$('#personnel-search-go').bind('click', function(e) {
  if($('#personnel-sstr').val().length > 0){
    ld_personnel_search($('#personnel-sstr').val());
  } else {
    $('.searchForm').addClass('error');
  }
});

$('#personnel-sstr').bind('keypress', function(e) {
  $('.searchForm').removeClass('error');
  if (e.which == 13) {
      if($(this).val().length ){
        e.preventDefault();
        ld_personnel_search($(this).val());
      } else {
        $('.searchForm').addClass('error');
      }
    }
});


// Change calendar week on /{library-name}/ page
$(document).on("click", "button.change-week", function(){
    var id = $('div#opentimes_large').attr('for');
    var mondayDate = $(this).attr('monday');

    $.ajax({
      type: 'POST',
      url: '/openTimeChangeWeek',
      data: {
        id: id,
        value: this.value,
        mondayDate : mondayDate
      }
    }).fail(function (jqXHR, textStatus) {

    }).done(function (data) {

      var html;
      var calendarTitle;

      if(!data._source.opening_hours.has_opening_hours){
        html = "<p>" + _("No results found") + "</p>";
        calendarTitle = _("Opening hours") + " " + mondayDate;
      } else {
        var days = data._source.opening_hours.open_hours_week;
        html = '<table>';
        // for(var x in days){
        for (var x=0;x<days.length;x++) {
          if(days[x].today && data._source.opening_hours.this_week){
            html += '<tr class="opentimes_strong">';
          } else {
            html += '<tr>';
          }

          html += '<td>'+days[x].day+'<td>&nbsp;<td>'+days[x].time+
            '<span class="hidden">, </span></tr>'
        }

        html += '</table><button class="btn change-week"' +
         'monday="'+data._source.opening_hours.mondaydate+'"' +
         'value="prev">' + _("Previous week") + '</button> ' +
         '<button class="btn change-week"' +
         'monday="'+data._source.opening_hours.mondaydate+'"' +
         'value="next">' + _("Next week") + '</button>';

        if(!data._source.opening_hours.this_week){
          date = data._source.opening_hours.mondaydate
          calendarTitle = _("Opening hours") + " " + date;
        } else {
          calendarTitle = _("Opening hours this week");
        }

      }

      $('h3.week-label').text(calendarTitle);
      $('time[itemprop="openingHours"]').children().remove();
      $('time[itemprop="openingHours"]').append(html);

   });

});

// Show certain tab by url
var hash = document.location.hash;
if (hash) {
    $('.nav-tabs a[href="'+hash+'"]').tab('show');
}

// Array.indexOf for IE8 (and others if missing)
if (!('indexOf' in Array.prototype)) {
  Array.prototype.indexOf = function(find, i) {
    if (i === undefined) i = 0;
    if (i<0) i+= this.length;
    if (i<0) i = 0;
    for (var n = this.length; i<n; i++)
      if (i in this && this[i] ===find)
        return i;
    return -1;
  };
}

// toggle introtext
$('#toggle_help').bind('click', function(event) {
  event.preventDefault();
  $('#introtext').slideToggle();
});

function library_details_map() {
  var coordinates = $('#mapcontainer').data('coordinates');

  if (coordinates == undefined || coordinates == "") {
    return true;
  } else {
    ld_mapcontrol_init(coordinates, "");
  }
}



