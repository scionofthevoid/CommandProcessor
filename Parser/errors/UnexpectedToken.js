var util = require('util');


/* Bind constructor to module.exports
 */
module.exports = UnexpectedToken;


/* UnexpectedToken Error
 */
function UnexpectedToken(token, index) {
	this.message = `Unexpected Token '${token}' at index ${index}`;
	Error.call(this);
	
	/* Identification
	 */
	// Name of the error
	this.getErrorName = function() {
		return this.constructor.name;
	};
}

util.inherits(UnexpectedToken, Error);