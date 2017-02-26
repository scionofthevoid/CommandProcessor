var util = require('./util.js'),
	Parser = require('./Parser.js');


/* Processes command line arguments
 * 
 * Commands are of the form:
 * 		name [kwargs]
 * 	name is used to look up the command
 * 	kwargs are arguments to the command callback and are of one of the following forms:
 * 		-flag (single character, TRUE if set)
 * 		--kwarg (multiple-character arguments, TRUE if set)
 * 		--kwarg=value (variable set to value)
 *
 * Commands can also take positional arguments
 * 		name [arguments]
 * 	name is used to look up the command
 * 	arguments are all of the positional arguments that go into the command
 * 		No argument may be skipped
 * 		Must adhere to predefined order
 */
module.exports.Processor = {
	// Valid commands
	commands: {},
	
	/* Build commands from keywords
	 */
	// Add a command to the list of valid commands
	addCommand: function(name, callback) {
		this.commands[name] = Command({
			"name": name,
			"callback": callback,
			"params": []
		});
		
		// Load parameters
		for (var i = 2; i < arguments.length; i++){
			this.commands[name].addParam(arguments[i]);
		}
	},
	
	// Load a command from file
	loadCommand: function(filename, callback) {
		var data = require(filename);
		this[data["name"]] = Command({
			"name": data["name"],
			"callback": callback,
			"params": data["params"]
		});
	},
	
	
	/* Look up and run commands
	 */
	// Evaluate a command
	evaluate: function(input) {
		// Validate arguments
		var args = Parser(input);
		if (args.err)
			return args;
		
		// Find the Command and execute it
		var command = args.argv["cmd"];
		if (!(command in this.commands))
			return {err: `Command ${command} not found`};
		
		return this.commands[command].execute(args);
	}
};


/* Constructor for a Command
 */
var Command = function(data) {
	// Build any existing parameters; they should be objects
	var params = [];
	if (data["params"].length > 0) {
		for (var param in data["params"]) {
			params.push(Parameter(param));
		}
	}
	
	return {
		"name": data["name"],
		"callback": data["callback"],
		"params": params,
		
		
		/* Run the command and get its functional output
		 */
		// Runs the command for an input string
		execute: function(args) {
			// Verify that a callback has been defined
			if (!this["callback"])
				return {err: `No callback defined for ${this["name"]}`};
			
			// Validate the command's inputs
			var callback = this.validate(args);
			
			// Output the result
			if (callback.err)
				return callback;
			
			return callback();
		},
		
		// Generates a bound callback function for valid inputs
		validate: function(args) {
			var validated = [];
			
			// Keep parameters in order
			for (var index in this["params"]) {
				var found = "",
					param = this["params"][index];
				
				for (var alias in param["aliases"]) {
					if (alias in args.argv) {
						if (found.length > 0)
							return {err: `Ambiguous Argument: ${alias} refers to the same parameter as ${found}`};
						
						var data = param.validate(alias, args.argv[alias]);
						if (data.err)
							return data;
						if (data[1].err)
							return data[1];
						
						validated.push(data[1]);
						found = alias;
					} else
						validated.push(param.getDefault()[1]);
				}
			}
			
			validated = [args.argv["cmd"]].concat(validated);
			return this["callback"].bind(...validated);
		},
		
		
		/* Editing features of the command
		 */
		// Add a parameter to the command
		addParam: function(parameter) {
			switch (typeof parameter) {
				case 'string':
					// Parameters are expected as --variable[=value] or -flag
					if (parameter.indexOf("--") == 0) {
						// Extract type, name, and data type
						var nameEnd = parameter.indexOf("=");
						if (nameEnd == -1)
							nameEnd = parameter.length;
						
						var name = parameter.substring(2, nameEnd),
							aliases = {};
						aliases[name] = "--";
						
						this["params"].push(Parameter({
							"aliases": aliases,
							"position": this["params"].length,
							"dataType": (nameEnd == parameter.length ? "" : parameter.substring(nameEnd + 1)),
							"range": ""
						}));
					} else if (parameter.indexOf("-") == 0) {
						var name = parameter.charAt(1);
						this["params"].push(Parameter({
							"aliases": {
								name: "-"
							},
							"position": this["params"].length,
							// Flags are by default boolean
							"dataType": "boolean",
							"range": "",
							"format": "^(true|false){1}$"
						}));
					}
					
					// Do nothing if invalid
					break;
				
				case "object":
					this["params"].append(Parameter(parameter));
				
				default:
					break;
			}
		},
		
		// Add an alias to a parameter
		addAlias: function(alias, argNum) {
			if (argNum >= this["params"].length)
				return {err: `Parameter index ${argNum} out of range`};
			
			if (alias.indexOf("--") > -1) {
				var aliasName = alias.substring(2);
				if (aliasName.length == 0)
					return {err: 'Unnamed alias'};
				
				this["params"][argNum]["aliases"][aliasName] = "--";
				return true;
			} else if (alias.indexOf("-") > -1) {
				var aliasName = alias.substring(1);
				if (aliasName.length == 0)
					return {err: 'Unnamed alias'};
				
				this["params"][argNum]["aliases"][aliasName] = "-";
				return true;
			}
			
			return {err: 'Alias type not specified'};
		},
		
		
		/* Saving the Command data for easy access later
		 */
		// Get a JSON dump of the Command
		toJSON: function() {
			return JSON.stringify({
				"name": this["name"],
				"callback": this["callback"],
				"params": this["params"]
			});
		}
	};
};


/* Constructor for a Parameter of a Command 
 */
var Parameter = function(data) {
	data["range"] = ("range" in data ? util.Range(data["range"]) : undefined);
	if (data["range"].err) {
		//console.log(data["range"]);
		data["range"] = undefined
	}
	
	return {
		"aliases": data["aliases"], // Map alias name to flag ("-") or variable ("--")
		"position": data["position"],
		"default": data["default"],
		"dataType": data["dataType"],
		"range": data["range"],
		"format": data["format"],
		
		
		/* Set Parameter properties
		 */
		setDefault: function(defaultValue) {
			if (!this["dataType"])
				return {err: 'Data type not set'};
			
			if (this["format"] && !(new RegExp(this["format"]).test(defaultValue)))
				return {err: `${defaultValue} does not match the specified format`};
			
			if (this["dataType"] != typeof defaultValue)
				return {err: `Invalid data type for default value ${defaultValue}: Expected ${this["dataType"]}`};
			
			var value = this.convert(defaultValue);
			if (value.err)
				return value;
			
			this["default"] = value;
			return true;
		},
		
		setDataType: function(type) {
			switch(type) {
				case "boolean":
				case "string":
				case "number":
				case "object":
				case "undefined":
					this["dataType"] = type;
					return true;
				
				default:
					return {err: `${type} is not a valid data type`};
			}
		},
		
		setRange: function(rangeStr) {
			var range = util.Range(rangeStr);
			if (range.err)
				return range;
			
			this["range"] = range;
			return true;
		},
		
		setFormat: function(format) {
			if (typeof format != "string")
				return {err: `${format} is not convertible to RegExp`};
			
			this["format"] = format;
			return true;
		},
		
		
		/* Generate a [position, value] pair when given valid data
		 */
		// Performs verification of input(s)
		validate: function(name, data) {
			if (this["aliases"][name] != data.type)
				return {err: `'${name}' given as '${util.typeName[data.type]}' but expected '${util.typeName[this["aliases"][name]]}'`};
			
			switch(data.type) {
				case "-":
					data.value = this["default"];
					break;
				
				case "--":
					if (this["format"] && !(new RegExp(this["format"]).test(data.value)))
						return {err: `'${data.value}' not of expected format '${this["format"]}'`};
					
					if (this["range"] && !this["range"].inRange(data.value))
						return {err: `'${data.value}' is out of range`};
					
					break;
			}
			
			return [this["position"], this.convert(data.value)];
		},
		
		// Get a default input
		getDefault: function() {
			return [this["position"], this.convert(this["default"])];
		},
		
		// Converts input to valid data type (assuming that all inputs are strings)
		convert: function(input) {
			switch(this["dataType"]) {
				case "boolean":
					return input == "true";
				
				case "string":
					
					return input;
				
				case "number":
					var num = parseFloat(input);
					return (isNaN(num) ? {err: `Cannot convert ${num} to a ${this["dataType"]}`} : num);
				
				case "object":
					try {
						return JSON.parse(input);
					} catch (e) {
						return {err: e};
					}
				
				case "undefined":
					return undefined;
				
				default:
					return {err: `${this["dataType"]} is not a valid data type`};
			}
		},
		
		
		/* Saving the Parameter data for easy access later
		 */
		// Get a JSON dump of the Parameter
		toJSON: function() {
			return JSON.stringify({
				"aliases": this["aliases"],
				"position": this["position"],
				"default": this["default"],
				"range": this["range"] || "",
				"format": this["format"]
			});
		}
	};
};