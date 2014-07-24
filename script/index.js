/*global require*/
require(["route-ui"], function (RouteUI) {
	var syncRouteUI = new RouteUI("sync");
	document.getElementById("syncSection").appendChild(syncRouteUI.form);
	var asyncRouteUI = new RouteUI("async");
	document.getElementById("asyncSection").appendChild(asyncRouteUI.form);
});