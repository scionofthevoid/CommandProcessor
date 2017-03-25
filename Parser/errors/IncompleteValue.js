var util = require('util');


/* Bind constructor to module.exports
 */
module.exports = IncompleteValue;


/* IncompleteValue Error
 */
function IncompleteValue(symbol, index) {
	this.message = `Input terminated at index ${index} without completing value starting with '${symbol}'`;
	Error.call(this);
	
	/* Identification
	 */
	// Name of the error
	this.getErrorName = function() {
		return this.constructor.name;
	};
}

util.inherits(IncompleteValue, Error);