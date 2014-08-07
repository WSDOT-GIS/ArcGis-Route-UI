ArcGIS Routing UI
=================

Provides a user inteface for the following ArcGIS REST API services.

* [Route service with synchronous execution]
* [Route service with asynchronous execution]

## Why not just use Esri's [Directions dijit]? ##

While the [ArcGIS API for JavaScript] does have a [Directions dijit], this dijit does not provide the ability to use all of the different options on the route service.

## Resources used ##
* [Esri's resource-proxy]

## Documentation ##

### Events ###

#### `route-params-submit`####

This event is triggered when the form is submitted.

#### `stop-add` ####

This event is triggered when a stop is added to the list.

##### Example #####

```javascript
routeUI.on("stop-add", function (e) {
	var feature = e.feature;
	feature = new Graphic(feature);
	stopsLayer.add(feature);
});
```

#### `stop-remove` ####

This event is triggered when a stop is removed from the list.

##### Example #####

```javascript
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

routeUI.on("stop-remove", function (e) {
	removeGraphicWithMatchingId(stopsLayer, e.stopId);
});
```


#### `stop-goto-link-click` ####

This event is triggered when a stop's goto button is clicked.

##### Example #####

```javascript
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

routeUI.on("stop-goto-link-click", showInfoWindow);
```


[ArcGIS API for JavaScript]:https://developers.arcgis.com/javascript/jsapi/
[Directions dijit]:https://developers.arcgis.com/javascript/jsapi/directions-amd.html
[Route service with synchronous execution]:http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Route_service_with_synchronous_execution/02r300000036000000/
[Route service with asynchronous execution]:http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Route_service_with_asynchronous_execution/02r300000275000000/
[Esri's resource-proxy]:https://github.com/Esri/resource-proxy