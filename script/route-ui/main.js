/*global define*/
define([
	"dojo/Evented", 
	"dojo/_base/declare",
	"dojo/text!./data/sync/Attribute Parameter Values.txt",
	"dojo/text!./data/async/Attribute Parameter Values.txt",
	"dojo/text!./data/sync/Attribute Names.txt",
	"dojo/text!./data/async/Restrictions.txt"
], function (Evented, declare, syncValues, asyncValues, syncDescriptions, asyncDescriptions) {
	var usedIds = [], supportsCustomEventConstructor = true, geocodeResultDataAttributeName = "data-feature";

	// These should be checked by default.
	var defaultRestrictionAttributeNamesRe = /^(?:(?:Avoid Carpool Roads)|(?:Avoid Express Lanes)|(?:Avoid Gates)|(?:Avoid Private Roads)|(?:Avoid Unpaved Roads)|(?:Driving an Automobile)|(?:Roads Under Construction Prohibited)|(?:Through Traffic Prohibited))$/;

	/**
	 * A feature (a.k.a. graphic) object returned from the ArcGIS REST API. Contains `geometry` and `attributes` properties.
	 * @external Feature
	 * {@link http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Feature_object/02r3000000n8000000/ ArcGIS REST API Feature}
	 */

	/**
	 * A set of {external:Feature} objects.
	 * @external Feature
	 * {@link http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/featureSet/02r300000047000000/ ArcGIS REST API FeatureSet}
	 */

	/**
	 * @external AttributeParameterValue
	 * {@link https://developers.arcgis.com/javascript/jsapi/routeparameters-amd.html#attributeparametervalues RouteParameters#attributeParameterValues}
	 */

	/**
	 * @typedef {Object} RestrictionInfo
	 * @property {string[]} restrictionAttributes
	 * @property {(external:FeatureSet|Array.<external:AttributeParameterValue>)} attributeParameterValues
	 */


	/**
	 * @typedef {Object} CustomEventInit
	 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent#CustomEventInit CustomEventInit}
	 * @param {boolean} bubbles - A boolean indicating whether the event bubbles up through the DOM or not. (default: false)
	 * @param {boolean} cancelable - A boolean indicating whether the event is cancelable. (default: false)
	 * @param {*} detail - The data passed when initializing the event.
	 */

	/**
	 * @param {string} eventType
	 * @param {CustomEventInit} params
	 */
	function createCustomEvent(eventType, params) {
		var customEvent;

		params = params || {};

		if (supportsCustomEventConstructor) {
			// Try to create a native event. Not all browsers support this, however.
			try {
				customEvent = new CustomEvent(eventType, params);
			} catch (e) {
				console.error("failed to create custom event using CustomEvent constructor", e);
				// Set a flag so we know not to attempt this again.
				supportsCustomEventConstructor = false;
			}
		}

		// Try to create the custom event using the alternate method.
		if (!customEvent) {
			try {
				customEvent = document.createEvent("CustomEvent");
				customEvent.initCustomEvent(eventType, params.bubbles, params.cancelable, params.detail);
			} catch (e) {
				console.error("failed to create custom event using alt. method.", e);
			}
		}

		return customEvent;
	}



	// Add an Array.contains function if it does not already exist.
	if (!Array.prototype.contains) {
		/**
		 * Determines if the array contains the given item
		 * @param {string} item
		 * @returns {Array}
		 */
		Array.prototype.contains = function (item) {
			var output = false;
			for (var i = 0, l = this.length; i < l; i += 1) {
				if (this[i] === item) {
					output = true;
					break;
				}
			}
			return output;
		};
	}

	/**
	 * Generates a unique ID based on an input string.
	 * @param {string} base
	 * @returns {string}
	 */
	function createId(base) {
		var output, i = 0;
		base = base || "id_";
		if (/^[^a-z_]/i.test(base)) {
			base = "id_" + base;
		}

		base = base.replace(/\W+/g, "_");

		output = base;

		while (usedIds.contains(output) || document.getElementById(output)) {
			output = [base, i].join("_");
			i += 1;
		}

		usedIds.push();
		return output;
	}

	var restrictionParameters = {
		/** @member {number} Travel on the roads using the restriction is completely prohibited.*/
		Prohibited: -1,
		/** @member {number} It is very unlikely for the service to include in the route the roads that are associated with the restriction.*/
		Avoid_High: 5,
		/** @member {number} It is unlikely for the service to include in the route the roads that are associated with the restriction.*/
		Avoid_Medium: 2,
		/** @member {number} It is somewhat unlikely for the service to include in the route the roads that are associated with the restriction.*/
		Avoid_Low: 1.3,
		/** @member {number} It is somewhat likely for the service to include in the route the roads that are associated with the restriction.*/
		Prefer_Low: 0.8,
		/** @member {number} It is likely for the service to include in the route the roads that are associated with the restriction.*/
		Prefer_Medium: 0.5,
		/** @member {number} It is very likely for the service to include in the route the roads that are associated with the restriction. */
		Prefer_High: 0.2,
	};

	/**
	 * Creates a restriction parameter value select element.
	 * @param {string} defaultValue
	 * @returns {HTMLSelectElement}
	 */
	function createSelect(defaultValue) {
		var select, option, re, selected, avoidGroup, preferGroup, avoidRe = /^Avoid/i, preferRe = /^Prefer/;
		re = new RegExp(defaultValue, "i");
		select = document.createElement("select");
		avoidGroup = document.createElement("optgroup");
		avoidGroup.label = "Avoid";
		select.appendChild(avoidGroup);
		preferGroup = document.createElement("optgroup");
		preferGroup.label = "Prefer";
		select.appendChild(preferGroup);
		for (var name in restrictionParameters) {
			if (restrictionParameters.hasOwnProperty(name)) {
				option = document.createElement("option");
				option.value = restrictionParameters[name];
				option.label = name;
				option.textContent = name;
				if (name.match(re)) {
					selected = document.createAttribute("selected");
					option.setAttributeNode(selected);
					option.classList.add("default");
				}
				(avoidRe.test(name) ? avoidGroup : preferRe.test(name) ? preferGroup : select).appendChild(option);
			}
		}
		return select;
	}

	/**
	 * @param {*} value
	 * @param {string} propertyName
	 * @param {string} restrictionName
	 * @returns {HTMLDivElement} <div><label />(<select />|<input />)</div>
	 */
	function createParameterValueControlDiv(value, propertyName, restrictionName) {
		var div, label, control;

		div = document.createElement("div");
		div.classList.add("form-group");

		label = document.createElement("label");
		label.textContent = propertyName;
		div.appendChild(label);

		if (propertyName === "Restriction Usage") {
			control = createSelect(value);
		} else {
			control = document.createElement("input");
			control.type = "number";
			control.defaultValue = value;
			control.value = value;
		}
		control.id = createId(propertyName);
		control.setAttribute("data-restriction-name", restrictionName);
		control.setAttribute("data-property-name", propertyName);
		label.htmlFor = control.id;
		control.classList.add("form-control");
		div.appendChild(control);

		return div;
	}

	/**
	 * @param {Object} obj
	 * @param {string} restrictionParameterName
	 * @returns {HTMLDivElement}
	 */
	function createRestrictionControlsDiv(obj, restrictionParameterName) {
		var div, checkbox, label, innerDiv, controlContainer;
		div = document.createElement("div");
		label = document.createElement("label");
		checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.id = createId(restrictionParameterName);
		checkbox.setAttribute("data-restriction-name", restrictionParameterName);
		checkbox.classList.add("default-restriction");
		if (defaultRestrictionAttributeNamesRe.test(restrictionParameterName)) {
			//checkbox.checked = true; // doesn't set default for form reset.
			checkbox.setAttributeNode(document.createAttribute("checked"));

		}
		label.htmlFor = checkbox.id;
		label.appendChild(document.createTextNode(restrictionParameterName));
		div.appendChild(checkbox);
		div.appendChild(label);
		controlContainer = document.createElement("div");
		controlContainer.setAttribute("class", "restriction-container well well-sm");
		div.appendChild(controlContainer);
		for (var propName in obj) {
			if (obj.hasOwnProperty(propName)) {
				innerDiv = createParameterValueControlDiv(obj[propName], propName, restrictionParameterName);
				controlContainer.appendChild(innerDiv);
			}
		}
		return div;
	}

	/**
	 * Creates a form based on the object generated by the parseTabSeparatedData function.
	 * @param {Object} obj
	 * @return {HTMLFormElement}
	 */
	function createFormFromObjectProperties(obj) {
		var form, innerObj, div, submitButton, resetButton, stopList, btnGroup, innerBtnGroup;

		function createPanel(headingText) {
			var panel, panelHeading, panelBody;
			panel = document.createElement("div");
			panel.id = createId(headingText);
			panel.setAttribute("class", "panel panel-default");

			panelHeading = document.createElement("div");
			panelHeading.setAttribute("class", "panel-heading");
			panelHeading.textContent = headingText;
			panel.appendChild(panelHeading);

			panelBody = document.createElement("div");
			panelBody.setAttribute("class", "panel-body");
			panel.appendChild(panelBody);
			return panel;
		}

		form = document.createElement("form");
		form.setAttribute("role", "form");
		form.action = "#";

		// Create stop list
		stopList = document.createElement("ol");
		stopList.classList.add("stop-list");
		stopList.classList.add("list-group");
		(function () {
			var panel = createPanel("Stops");
			panel.querySelector(".panel-body").appendChild(stopList);
			form.appendChild(panel);
		}());

		// Create restrictions panel
		(function () {
			var panel = createPanel("Restrictions");
			var panelBody = panel.querySelector(".panel-body");

			for (var propName in obj) {
				if (obj.hasOwnProperty(propName)) {
					innerObj = obj[propName];
					div = createRestrictionControlsDiv(innerObj, propName);
					panelBody.appendChild(div);
				}
			}
			form.appendChild(panel);
		}());

		btnGroup = document.createElement("div");
		btnGroup.setAttribute("class", "btn-group btn-group-justified");

		innerBtnGroup = document.createElement("div");
		innerBtnGroup.setAttribute("class", "btn-group");
		btnGroup.appendChild(innerBtnGroup);

		submitButton = document.createElement("button");
		submitButton.type = "submit";
		submitButton.disabled = true;
		submitButton.textContent = "Submit";
		submitButton.setAttribute("class", "btn btn-primary");
		innerBtnGroup.appendChild(submitButton);

		innerBtnGroup = document.createElement("div");
		innerBtnGroup.setAttribute("class", "btn-group");
		btnGroup.appendChild(innerBtnGroup);

		resetButton = document.createElement("button");
		resetButton.type = "reset";
		resetButton.textContent = "Reset";
		resetButton.setAttribute("class", "btn btn-danger");
		innerBtnGroup.appendChild(resetButton);

		form.appendChild(btnGroup);


		return form;
	}

	/**
	 * Converts the data from a text table into an object.
	 * The values from the first column become the property names.
	 * Each of these properties is an object with one or more properties.
	 * The names of these inner properties come from the second column,
	 * and the values come from the third column.
	 * @param {string} text - text from a tab-separated table.
	 * @returns {Object}
	 */
	function parseTabSeparatedData(text) {
		var re = /^([^\t\n\r]+)\t([^\t\r\n]+)\t([^\t\r\n]+)$/gm; // Matches ["restriction name", "parameter name", "default value"]
		var match;
		var output = {};
		match = re.exec(text);
		// Skip first row: column headings.
		match = re.exec(text);
		while (match) {
			// Remove the first element: the complete match.
			match = match.slice(1);

			if (!output.hasOwnProperty(match[0])) {
				output[match[0]] = {};
			}
			output[match[0]][match[1]] = match[2];

			match = re.exec(text);
		}
		return output;
	}

	/**
	 * @typedef {RestrictionInfo}
	 * @propery {string} description - A description of the restriction.
	 * @property {string} availability - The availability of the restriction.
	 */

	/**
	 * Parses the descriptions text table.
	 * @param {string} text
	 * @returns {Object.<string, RestrictionInfo>}
	 */
	function parseDescriptions(text) {
		var re = /^([^\t\n\r]+)\t([^\t\r\n]+)\t([^\t\r\n]+)$/gm; // Matches ["restriction name", "description", "availability"]
		var match;
		var output = {};
		match = re.exec(text);
		// Skip first row: column headings.
		match = re.exec(text);
		while (match) {
			// Remove the first element: the complete match.
			match = match.slice(1);

			output[match[0]] = {
				description: match[1],
				availability: match[2]
			};

			match = re.exec(text);
		}
		return output;
	}

	/**
	 * Removes a list item from a list.
	 * Called from a link that is the child of
	 * a list item.
	 * @param {Event} e
	 * @param {HTMLAnchorElement} e.currentTarget
	 */
	function removeItemFromList(e) {
		var link = e.currentTarget;
		var div = link.parentElement;
		var listItem = div.parentElement;
		var list = listItem.parentElement;
		list.removeChild(listItem);

		return false;
	}

	/**
	 * Create a list item representing a geocode result.
	 * @param {Object} stop
	 * @returns {HTMLLIElement} - The <li> element with have a data-feature attribute.
	 */
	function createStopListItem(stop) {
		var li, removeLink, feature, gotoLink, span, btnGroup;
		if (stop.feature) {
			if (stop.feature.toJson) {
				feature = stop.feature.toJson();
			} else {
				feature = stop.feature;
			}
			feature.attributes.Name = stop.name;
			li = document.createElement("li");
			li.id = createId("stop_" + stop.name);
			feature.attributes.id = li.id;
			li.classList.add("stop");
			li.classList.add("list-group-item");

			btnGroup = document.createElement("div");
			btnGroup.setAttribute("class", "btn-group btn-group-xs badge");

			li.appendChild(btnGroup);

			li.appendChild(document.createTextNode(stop.name || "STOP"));

			removeLink = document.createElement("a");
			removeLink.href = "#";
			removeLink.setAttribute("class", "remove-link btn btn-danger");
			//removeLink.classList.add("remove-link");
			//removeLink.classList.add("text-danger");
			span = document.createElement("span");
			span.setAttribute("class", "glyphicon glyphicon-remove");
			removeLink.appendChild(span);

			btnGroup.appendChild(removeLink);

			gotoLink = document.createElement("a");
			gotoLink.href = "#";
			gotoLink.setAttribute("class", "goto-link btn btn-default");
			span = document.createElement("span");
			span.setAttribute("class", "glyphicon glyphicon-screenshot");
			gotoLink.appendChild(span);

			btnGroup.appendChild(gotoLink);

			li.setAttribute(geocodeResultDataAttributeName, JSON.stringify(feature));

			//removeLink.addEventListener("click", removeItemFromList);
			removeLink.onclick =removeItemFromList;
		}
		return li;
	}



	/**
	 * A user interface for the 
	 * {@link http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Route_service_with_synchronous_execution/02r300000036000000/ sync}
	 * and
	 * {@link http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Route_service_with_asynchronous_execution/02r300000275000000/ async}
	 * ArcGIS REST API route services.
	 * @property {HTMLFormElement} form
	 * @property {Object} properties
	 * @property {Object.<string, RestrictionInfo>} descriptions
	 */
	var ArcGisRouteUI = declare([Evented], {
		form: null,
		properties: null,
		descriptions: null,
		stopList: null,
		disableSubmitIfNotEnoughStops: function() {
			var stopListItems = this.stopList.querySelectorAll("li.stop");
			var submitButton = this.form.querySelector("button[type=submit]");
			if (stopListItems.length < 2) {
				submitButton.disabled = true;
			} else {
				submitButton.disabled = false;
			}
		},
		/**
		 * Adds or removes the 'only-has-one-stop' class from the stop list.
		 */
		_setStopListClass: function() {
			var stopListItems = this.stopList.querySelectorAll("li");
			if (stopListItems.length === 1) {
				this.stopList.classList.add("only-has-one-stop");
			} else {
				this.stopList.classList.remove("only-has-one-stop");
			}
		},
		/**
		 * Gets an array of stop features.
		 * @returns {Array.<external:Feature>}
		 */
		getStopFeatures: function() {
			var stopListItems, stops, li, feature;

			stopListItems = this.stopList.querySelectorAll("li.stop");
			stops = [];

			for (var i = 0, l = stopListItems.length; i < l; i += 1) {
				li = stopListItems[i];
				feature = li.getAttribute(geocodeResultDataAttributeName);
				feature = JSON.parse(feature);
				stops.push(feature);
			}

			return stops;
		},
		/**
		 * Gets a set of restriction features for the currently selected restrictions.
		 * @returns {RestrictionInfo}
		 */
		getRestrictions: function (asFeatureSet) {
			var checkedBoxes, controls, features = [], restrictionAttributes = [];

			/**
			 * Creates a feature from a control.
			 * @param {(HTMLSelectElement|HTMLInputElement)} control
			 * @returns {external:Feature}
			 */
			function controlToFeature(control) {
				return {
					attributes: {
						AttributeName: control.getAttribute("data-restriction-name"),
						ParameterName: control.getAttribute("data-property-name"),
						ParameterValue: Number(control.value)
					}
				};
			}

			/**
			 * Creates an restriction object.
			 * @returns {external:AttributeParameterValue}
			 */
			function controlToObject(control) {
				return {
					attributeName: control.getAttribute("data-restriction-name"),
					parameterName: control.getAttribute("data-property-name"),
					parameterValue: Number(control.value)
				};
			}

			// Get all of the checked checkboxes.
			checkedBoxes = this.form.querySelectorAll("input[type='checkbox']:checked");

			for (var cbi = 0, cbl = checkedBoxes.length; cbi < cbl; cbi += 1) {
				restrictionAttributes.push(checkedBoxes[cbi].getAttribute("data-restriction-name"));
				// Get all controls representing a restriction parameter.
				controls = checkedBoxes[cbi].parentElement.querySelector(".restriction-container").querySelectorAll("[data-restriction-name]");
				for (var controlI = 0, controlL = controls.length; controlI < controlL; controlI += 1) {
					if (asFeatureSet) {
						features.push(controlToFeature(controls[controlI]));
					} else {
						features.push(controlToObject(controls[controlI]));
					}
				}
			}

			return {
				restrictionAttributes: restrictionAttributes,
				attributeParameterValues: asFeatureSet ? { features: features } : features
			};
		},
		/**
		 * Adds a stop to the list of stops displayed in the UI.
		 * @param {external:Feature} stop
		 */
		addStop: function (stop) {
			var li, self = this, gotoLink, removeLink;

			/**
			 * Emits an event that indicates one of the stops' "goto" links have been clicked.
			 * @param {Event} e - The current target is an <a>. <li> > <div> > <a>.
			 * @returns {boolean} Returns false so link is not followed when clicked if this is its event handler.
			 */
			function emitGotoEvent(e) {
				var link = e.currentTarget;
				var div = link.parentElement;
				var listItem = div.parentElement;
				var feature = listItem.getAttribute(geocodeResultDataAttributeName);
				feature = JSON.parse(feature);
				self.emit("stop-goto-link-click", { feature: feature });

				return false;
			}

			if (!stop) {
				throw new TypeError("No stop was provided.");
			} else if (stop.feature) {
				li = createStopListItem(stop);
				this.stopList.appendChild(li);
				this._setStopListClass();
				gotoLink = li.querySelector(".goto-link");
				gotoLink.onclick = emitGotoEvent;
				self.emit("stop-add", {
					stop: stop,
					feature: JSON.parse(li.getAttribute(geocodeResultDataAttributeName)),
					id: li.id
				});

				removeLink = li.querySelector(".remove-link");
				removeLink.addEventListener("click", function (e) {
					self.emit("stop-remove", { stopId: e.currentTarget.parentElement.parentElement.id });
					self._setStopListClass();
					// TODO: Emit equivalent native custom event.
					self.disableSubmitIfNotEnoughStops();
				});

				self.disableSubmitIfNotEnoughStops();
			}
		},
		/**
		 * Creates a new instance of this class.
		 * @param {boolean} async - Set to true for async routing service, false for sync.
		 * @constructs
		 */
		constructor: function (async) {
			var self = this, form, properties, descriptions;

			function onFormSubmit() {
				var customEvent, detail;

				detail = self.getRestrictions(false);
				detail.stops = self.getStopFeatures();

				customEvent = createCustomEvent("route-params-submit", {
					detail: detail
				});

				if (customEvent) {
					self.form.dispatchEvent(customEvent);
				}

				// Emit the parameters that the user submitted.
				self.emit("route-params-submit", detail);

				return false;
			}

			if (async) {
				properties = parseTabSeparatedData(asyncValues);
				descriptions = parseDescriptions(asyncDescriptions);
			} else {
				properties = parseTabSeparatedData(syncValues);
				descriptions = parseDescriptions(syncDescriptions);
			}
			form = createFormFromObjectProperties(properties);
			form.onsubmit = onFormSubmit;
			this.form = form;
			this.stopList = form.querySelector(".stop-list");
			this.properties = properties;
			this.descriptions = descriptions;
		}
	});



	return ArcGisRouteUI;
});