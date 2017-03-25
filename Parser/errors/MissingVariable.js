var util = require('util');


/* Bind constructor to module.exports
 */
module.exports = MissingVariable;


/* MissingVariable Error
 */
function MissingVariable(index) {
	this.message = `Reached index ${index} but found no Variable after '--'`;
	Error.call(this);
	
	/* Identification
	 */
	// Name of the error
	this.getErrorName = function() {
		return this.constructor.name;
	};
}

util.inherits(MissingVariable, Error);