/* Bind constructor to module.exports
 */
module.exports = Arguments;


/* Arguments
 */
function Arguments() {
	this.argc = 0;
	this.argv = [];
	this.args = {};
	
	
	/* Define the name of the command
	 * This always goes at the beginning of argv
	 */
	this.setCommand = function(cmd) {
		this.argc += 1;
		this.argv.push(cmd);
	};
	
	
	/* Single arguments in argv
	 */
	function Arg(type, value) {
		this.type = type;
		this.value = value;
		
		/* Identification
		 */
		// Name of the instance
		this.getInstanceName = function() {
			return this.constructor.name;
		};
		
		// Argument type as a String
		this.getTypeName = function() {
			return (this.type == '-' ? "Flag" : "Variable");
		};
	};
	
	// Add a Flag
	this.addFlag = function(name, value) {
		var arg = new Arg('-', value);
		
		if (name)
			this.args[name] = arg;
		this.argv.push(arg);
		this.argc += 1;
	};
	
	// Add a Variable
	this.addVariable = function(name, value) {
		var arg = new Arg('--', value);
		
		if (name)
			this.args[name] = arg;
		this.argv.push(arg);
		this.argc += 1;
	};
	
	
	/* Identification
	 */
	// Name of the instance
	this.getInstanceName = function() {
		return this.constructor.name;
	};
	
	// Checks if a Flag already exists
	this.hasFlag = function(flag) {
		return flag in this.args;
	};
	
	// Checks if a Variable already exists
	this.hasVariable = function(variable) {
		return variable in this.args;
	};
};