/*global require*/
require(["esri/map", "esri/dijit/Geocoder", "route-ui"], function (Map, Geocoder, RouteUI) {
	var map, routeUI, geocoder;
	map = new Map("map", {
		basemap: "gray"
	});
	routeUI = new RouteUI();
	document.getElementById("toolsPane").appendChild(routeUI.form);

	routeUI.on("route-params-submit", function (e) {
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