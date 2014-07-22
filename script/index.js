(function () {

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
		var select, option, re, selected;
		re = new RegExp(defaultValue, "i");
		select = document.createElement("select");
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
				select.appendChild(option);
			}
		}
		return select;
	}

	function createTableFromObjectProperties(obj) {
		var table, row, cell1, cell2, cell3, rowSpan, innerObj, propName, innerPropName, checkbox, defaultValue, control, label;
		table = document.createElement("table");

		for (propName in obj) {
			if (obj.hasOwnProperty(propName)) {
				rowSpan = 0;
				innerObj = obj[propName];
				for (innerPropName in innerObj) {
					if (innerObj.hasOwnProperty(innerPropName)) {
						rowSpan += 1;
						row = table.insertRow(-1);
						if (rowSpan === 1) {
							cell1 = row.insertCell(-1);
							label = document.createElement("label");
							checkbox = document.createElement("input");
							checkbox.type = "checkbox";
							checkbox.dataset.restrictionName = propName;
							label.appendChild(checkbox);
							label.appendChild(document.createTextNode(propName));
							cell1.appendChild(label);
						} else {
							cell1.setAttribute("rowspan", rowSpan);
						}
						cell2 = row.insertCell(-1);
						cell2.textContent = innerPropName;
						cell3 = row.insertCell(-1);
						defaultValue = innerObj[innerPropName];
						if (innerPropName === "Restriction Usage") {
							control = createSelect(defaultValue);
						} else {
							control = document.createElement("input");
							control.type = "number";
							control.defaultValue = defaultValue;
							control.value = defaultValue;
						}
						control.dataset.restrictionName = propName;
						control.dataset.restrictionParameterName = innerPropName;
						control.dataset.restrictionParameterDefaultValue = defaultValue;
						cell3.appendChild(control);
					}
				}
			}
			row = null;
			cell1 = null;
			cell2 = null;
		}
		

		return table;
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

	function requestParameterValues(url, sectionId) {
		var section;
		if (!url) {
			throw new TypeError("The url parameter was not provided.");
		}
		section = document.getElementById(sectionId);
		if (!section) {
			throw new TypeError("The specified sectionId does not exist.");
		}
		var request = new XMLHttpRequest();
		request.open("get", url);
		request.onloadend = function () {
			var form, properties, table, submitButton, resetButton;
			properties = parseTabSeparatedData(this.response);
			table = createTableFromObjectProperties(properties);
			form = document.createElement("form");
			form.appendChild(table);
			submitButton = document.createElement("button");
			submitButton.type = "submit";
			submitButton.textContent = "Submit";
			form.appendChild(submitButton);
			resetButton = document.createElement("button");
			resetButton.type = "reset";
			resetButton.textContent = "Reset";
			form.appendChild(resetButton);
			document.getElementById(sectionId).appendChild(form);
		};
		request.send();
	}

	requestParameterValues("data/sync/Attribute Parameter Values.txt", "syncSection");
	requestParameterValues("data/async/Attribute Parameter Values.txt", "asyncSection");
}());