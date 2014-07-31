/*global require*/
require([
	"esri/map", "esri/dijit/Geocoder", "route-ui", "esri/graphic", "esri/tasks/RouteTask", "esri/tasks/RouteParameters"
], function (Map, Geocoder, RouteUI, Graphic, RouteTask, RouteParameters) {
	var map, routeUI, geocoder, routeTask;
	map = new Map("map", {
		basemap: "gray",
		center: [-120.80566406246835, 47.41322033015946],
		zoom: 7
	});
	routeUI = new RouteUI();
	routeTask = new RouteTask("http://route.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/");
	document.getElementById("toolsPane").appendChild(routeUI.form);

	routeUI.on("route-params-submit", function (e) {
		console.log("route-parameters-submitted", e);
	});
	/** Shows an info window for the current feature and also centers the map at that location.
	 * @param {Event} e
	 * @param {Object} e.feature - A regular object that can be used to construct a Graphic;
	 */
	routeUI.on("stop-goto-link-click", function (e) {
		var feature = e.feature;
		feature = new Graphic(feature);
		feature.setInfoTemplate({content: "${*}", title: "${name}"});
		map.infoWindow.setFeatures([feature]);
		map.infoWindow.show(feature.geometry);
		map.centerAt(feature.geometry);
	});

	map.on("load", function () {


		geocoder = new Geocoder({
			map: map,
			arcgisGeocoder: {
				placeholder: "Add stop",
				sourceCountry: "US",
				searchExtent: map.extent
			},
			autoComplete: true
		}, "geocoder");

		/**
		 * @typedef GeocodeResult
		 * @property {Extent} extent
		 * @property {Graphic} feature
		 * @property {string} name
		 */

		/**
		 * @typedef SelectResult
		 * @property {GeocodeResult} result
		 */

		/**
		 * @typedef FindResult
		 * @property {GeocodeResult[]} results
		 * @property {string} value
		 */

		/**
		 * @param {(SelectResult|FindResult)} result
		 */
		function onResult(result) {
			var results = result.results ? result.results.results : result.result ? [result.result] : null;
			if (results) {
				results.forEach(function (result) {
					routeUI.addStop(result);
				});
			}
		}

		geocoder.on("find-results", onResult);
		geocoder.on("select", onResult);
	});


});