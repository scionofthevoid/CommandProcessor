var util = require('util');


/* Bind constructor to module.exports
 */
module.exports = MissingFlag;


/* MissingFlag Error
 */
function MissingFlag(index) {
	this.message = `Reached index ${index} but found no Flag after '-'`;
	Error.call(this);
	
	/* Identification
	 */
	// Name of the error
	this.getErrorName = function() {
		return this.constructor.name;
	};
}

util.inherits(MissingFlag, Error);