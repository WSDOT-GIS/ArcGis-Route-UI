/*global require*/
require([
	"esri/urlUtils",
	"esri/map",
	"esri/dijit/Geocoder",
	"route-ui",
	"esri/graphic",
	"esri/tasks/RouteTask",
	"esri/tasks/RouteParameters",
	"esri/tasks/FeatureSet",
	"esri/layers/GraphicsLayer",
	"esri/renderers/SimpleRenderer",
	"esri/symbols/SimpleMarkerSymbol"
], function (urlUtils, Map, Geocoder, RouteUI, Graphic, RouteTask, RouteParameters, FeatureSet, GraphicsLayer, SimpleRenderer, SimpleMarkerSymbol) {
	var map, routeUI, geocoder, routeTask, stopsLayer, routesLayer;

	// Set up the proxy for the routing service.
	urlUtils.addProxyRule({
		urlPrefix: "route.arcgis.com",
		proxyUrl: "proxy/proxy.ashx"
	});

	function removeGraphicWithMatchingId(layer, id) {
		var graphic;
		for (var i = 0, l = layer.graphics.length; i < l; i += 1) {
			graphic = layer.graphics[i];
			if (graphic.attributes.id === id) {
				layer.remove(graphic);
				break;
			}
		}
	}

	/** Shows an info window for the current feature and also centers the map at that location.
	 * @param {Event} e
	 * @param {Object} e.feature - A regular object that can be used to construct a Graphic;
	 */
	function showInfoWindow(e) {
		var feature = e.feature;
		feature = new Graphic(feature);
		feature.setInfoTemplate({content: "${*}", title: "${name}"});
		map.infoWindow.setFeatures([feature]);
		map.infoWindow.show(feature.geometry);
		map.centerAt(feature.geometry);
	}

	/**
	 * Setup the geocoder widget.
	 */
	function setupGeocoder() {
		// Create the geocoder widget. 
		// Its searches will be limited to the map's initial extent.
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
	}


	map = new Map("map", {
		basemap: "gray",
		center: [-120.80566406246835, 47.41322033015946],
		zoom: 7
	});

	stopsLayer = new GraphicsLayer({
		id: "stops"
	});

	routesLayer = new GraphicsLayer({
		id: "routes",
		styling: false // Use CSS to style the lines.
	});

	// Setup styling for stops layer.
	(function () {
		var symbol = new SimpleMarkerSymbol();
		var renderer = new SimpleRenderer(symbol);
		stopsLayer.setRenderer(renderer);
	}());
	map.addLayer(stopsLayer);
	map.addLayer(routesLayer);

	routeUI = new RouteUI();
	routeTask = new RouteTask("http://route.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/");
	document.getElementById("toolsPane").appendChild(routeUI.form);

	/**
	 * @typedef {Object.<string, Array>} SolveCompleteResult
	 * @property {RouteResult[]} routeResults
	 * @property {Graphic[]} barriers
	 * @property {Graphic[]} polygonBarriers
	 * @property {Graphic[]} polylineBarriers
	 * @property {NAMessage[]} message
	 */

	/**
	 * @typedef {Object} RouteSubmitDetail
	 * @property {string[]} restrictionAttributes
	 * @property {Array.<Object.<string, (string,number)>>} attributeParameterValues
	 * @property {Object[]} stops - An array of objects that can be converted into Graphics.
	 */

	/**
	 * @param {RouteSubmitDetail} e
	 */
	routeUI.on("route-params-submit", function (e) {
		var routeParameters;
		console.log("dojo/Evented event - route-parameters-submitted", e);
		routeParameters = new RouteParameters();
		routeParameters.restrictionAttributes = e.restrictionAttributes;
		routeParameters.attributeParameterValues = e.attributeParameterValues;
		routeParameters.stops = new FeatureSet();
		routeParameters.doNotLocateOnRestrictedElements = true;
		e.stops.forEach(function (stop) {
			var graphic = new Graphic(stop);
			routeParameters.stops.features.push(graphic);
		});

		routeTask.solve(routeParameters, function (/**{SolveCompleteResult}*/ result) {
			var routeResult;
			console.log("Route solve complete", result);
			routesLayer.clear();
			for (var i = 0, l = result.routeResults.length; i < l; i += 1) {
				routeResult = result.routeResults[i];
				routesLayer.add(routeResult.route);
			}
		}, function (/**{Error}*/ error) {
			console.error("Route solve error", error);
		});
	});

	routeUI.form.addEventListener("route-params-submit", function (e) {
		console.log("Native event - route-params-submit", e.detail);
	});

	routeUI.on("stop-goto-link-click", showInfoWindow);

	routeUI.on("stop-add", function (e) {
		console.log("stop-add", e);
		var feature = e.feature;
		feature = new Graphic(feature);
		stopsLayer.add(feature);
	});

	routeUI.on("stop-remove", function (e) {
		console.log("stop-remove", e.stopId);
		removeGraphicWithMatchingId(stopsLayer, e.stopId);
	});

	map.on("load", setupGeocoder);

	$("#disclaimer").modal();

});