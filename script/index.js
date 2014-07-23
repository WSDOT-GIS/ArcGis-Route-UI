require(["dojo/text!route-ui/data/sync/Attribute Parameter Values.txt"], function (syncValues) {

	var usedIds = [];

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

		//output = [base, Date.now() + Math.random()].join("_");
		//output = output.replace(/\W/g, "_");
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

	function createParameterValueControlDiv(value, propertyName) {
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
		label.htmlFor = control.id;
		control.classList.add("form-control");
		div.appendChild(control);

		return div;
	}

	function createRestrictionControlsDiv(obj, restrictionParameterName) {
		var div, checkbox, label, innerDiv, controlContainer;
		div = document.createElement("div");
		label = document.createElement("label");
		checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.id = createId(restrictionParameterName);
		label.htmlFor = checkbox.id;
		label.appendChild(document.createTextNode(restrictionParameterName));
		div.appendChild(checkbox);
		div.appendChild(label);
		controlContainer = document.createElement("div");
		controlContainer.classList.add("container");
		div.appendChild(controlContainer);
		for (var propName in obj) {
			if (obj.hasOwnProperty(propName)) {
				innerDiv = createParameterValueControlDiv(obj[propName], propName);
				controlContainer.appendChild(innerDiv);
			}
		}
		return div;
	}

	function createFormFromObjectProperties(obj) {
		var form, innerObj, propName, div;

		form = document.createElement("form");
		form.setAttribute("role", "form");
		form.action = "#";

		for (propName in obj) {
			if (obj.hasOwnProperty(propName)) {
				innerObj = obj[propName];
				div = createRestrictionControlsDiv(innerObj, propName);
				form.appendChild(div);
			}
		}


		return form;
	}

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

	var form, properties;
	properties = parseTabSeparatedData(syncValues);
	form = createFormFromObjectProperties(properties);
	document.getElementById("syncSection").appendChild(form);
});