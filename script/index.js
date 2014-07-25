/*global require*/
require(["esri/map", "esri/dijit/Geocoder", "route-ui"], function (Map, Geocoder, RouteUI) {
	var map, syncRouteUI, geocoder;
	map = new Map("map", {
		basemap: "gray"
	});
	syncRouteUI = new RouteUI();
	document.getElementById("toolsPane").appendChild(syncRouteUI.form);

	syncRouteUI.on("route-params-submit", function (e) {
		console.log(e);
	});

	geocoder = new Geocoder({
		map: map,
		arcgisGeocoder: {
			placeholder: "Add stop",
			sourceCountry: "US"
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
	 * @param {(SelectResult|Findresult)} result
	 */
	function onResult(result) {
		var results = result.results ? result.results.results : result.result ? [result.result] : null;
		if (results) {
			results.forEach(function (result) {
				syncRouteUI.addStop(result);
			});
		}
	}

	geocoder.on("find-results", onResult);
	geocoder.on("select", onResult);


});