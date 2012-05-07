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
			new OpenLayers.Control.PanZoom(),
			new OpenLayers.Control.LayerSwitcher(),
			new OpenLayers.Control.Attribution() ]
	};

	/* convert wgs-84 coordinates into OSM spherical mercator projection */
	var fromProjection = new OpenLayers.Projection("EPSG:4326");
	var toProjection = new OpenLayers.Projection("EPSG:900913");
	var mapLocation = new OpenLayers.LonLat(lon, lat).transform(fromProjection,toProjection);

	/* add map layers */
	var osmLayer = new OpenLayers.Layer.OSM("OpenStreetMap");
	var gmapLayer = new OpenLayers.Layer.Google("Google Streets", { numZoomLevels: 22 });
	var gsatLayer = new OpenLayers.Layer.Google("Google Satellite", { type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22 });

	map = new OpenLayers.Map("basicmap", mapOptions);

	map.addLayers([osmLayer, gmapLayer, gsatLayer]);
	map.setCenter(mapLocation, 15);

	/* add marker layer with coordinate projection transform */
	var vectorLayer = new OpenLayers.Layer.Vector("Overlay");
	var marker = new OpenLayers.Feature.Vector(
		new OpenLayers.Geometry.Point(lon, lat).transform(fromProjection,toProjection),
		{ },
		{externalGraphic: 'img/mapmarker_red.png', graphicHeight: 30, graphicWidth: 18});

	popup = new OpenLayers.Popup.FramedCloud("popup", mapLocation, new OpenLayers.Size(200, 200), name+desc, null, true);

	map.addPopup(popup);
	vectorLayer.addFeatures(marker);
	map.addLayer(vectorLayer);

	$('#mapcontrol').append('<button class="btn btn-danger" onclick="ld_mapcontrol_close();">Hide map</button>');
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
