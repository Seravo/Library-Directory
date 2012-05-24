/* Author:

*/

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
		{externalGraphic: 'js/libs/openlayers/markers/marker-black.png', graphicHeight: 41, graphicWidth: 25});

	popup = new OpenLayers.Popup.FramedCloud("popup", mapLocation, new OpenLayers.Size(200, 200), name+desc, null, true);

	map.addPopup(popup);
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
