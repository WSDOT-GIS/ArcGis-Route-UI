/*global require*/
require(["route-ui"], function (RouteUI) {
	var syncRouteUI = new RouteUI();
	document.getElementById("syncSection").appendChild(syncRouteUI.form);
	var asyncRouteUI = new RouteUI(true);
	document.getElementById("asyncSection").appendChild(asyncRouteUI.form);

	//syncRouteUI.form.addEventListener("route-params-submit", function (e) {
	//	console.log(e);
	//});
	syncRouteUI.on("route-params-submit", function (e) {
		console.log(e);
	});
});