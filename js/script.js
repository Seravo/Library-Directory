/* Author:

*/

function ld_mapcontrol_init(lon, lat, dummy) {
	/* initialize map canvas and set location for given coordinates */
	$(window).scrollTop(0);
	$('#basicmap').empty();
	$('#mapcontrol').empty();
	$('#basicmap').show();

	var mapOptions = {
		controls: [ new OpenLayers.Control.Navigation(),
			    new OpenLayers.Control.PanZoom(),
		            new OpenLayers.Control.Attribution() ]
	 };

	/* convert wgs-84 coordinates into OSM spherical mercator projection */
	var fromProjection = new OpenLayers.Projection("EPSG:4326");
	var toProjection = new OpenLayers.Projection("EPSG:900913");
	var mapLocation = new OpenLayers.LonLat(lon, lat).transform(fromProjection,toProjection);

	/* add map layer with zoom level 15 */
        map = new OpenLayers.Map("basicmap", mapOptions);
        map.addLayer(new OpenLayers.Layer.OSM());
	map.setCenter(mapLocation, 15);

	/* add marker layer with coordinate projection transform */
	var vectorLayer = new OpenLayers.Layer.Vector("Overlay");
	var feature = new OpenLayers.Feature.Vector(
	 new OpenLayers.Geometry.Point(lon, lat).transform(fromProjection,toProjection),
	 {some:'data'},
	 {externalGraphic: 'img/mapmarker_red.png', graphicHeight: 30, graphicWidth: 18});

	vectorLayer.addFeatures(feature);
	map.addLayer(vectorLayer);

	$('#mapcontrol').append('<button class="btn btn-danger" onclick="ld_mapcontrol_close();">Sulje kartta</button>');
      }


function ld_mapcontrol_close() {
	/* clear and hide the map elements */
	$('#basicmap').slideToggle();
	$('#basicmap').empty();
	$('#mapcontrol').empty();
}
