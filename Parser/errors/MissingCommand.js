var util = require('util');


/* Bind constructor to module.exports
 */
module.exports = MissingCommand;


/* MissingCommand Error
 */
function MissingCommand(index) {
	this.message = `Reached index ${index} but found no Command`;
	Error.call(this);
	
	/* Identification
	 */
	// Name of the error
	this.getErrorName = function() {
		return this.constructor.name;
	};
}

util.inherits(MissingCommand, Error);