/* Utilities
 */
// Type mapping
module.exports.typeName = {
	'-': "flag",
	'--': "variable"
};

// A Range of numbers from a string representation
module.exports.Range = function(str) {
	if (!str || str.length == 0)
		return {err: "No Range given"};
	
	if (typeof range != "string" || !(new RegExp("^[\\(\\[][0-9]+,( ?)[0-9]+[\\)\\]]$", "i").test(str)))
		return {err: "Invalid format"}
	
	var min = parseFloat(str.substring(1, str.indexOf(','))),
		// May or may not have a space after the comma
		max = parseFloat((str.indexOf(' ') > -1 ? str.substring(str.indexOf(' ') + 1, str.length - 1) : str.substring(str.indexOf(',') + 1, str.length - 1)));
	
	if (isNaN(min) || isNaN(max) || min >= max)
		return {err: "Invalid Range: Please specify valid lower and upper bounds"};
	
	return {
		min: min,
		max: max,
		inRange: function(number) {
			var n = parseFloat(number);
			
			// Parentheses means non-inclusive
			// Square brackets means inclusive
			return (!isNaN(n)) &&
				(str.charAt(0) == '(' ? (n > this.min) : (n >= this.min)) &&
				(str.charAt(str.length - 1) == ')' ? (n < this.max) : (n <= this.min))
		},
		toJSON: function() {
			return str;
		}
	};
};

// Check if string is non-empty and alphanumeric
module.exports.isAlphaNum = function(string) {
	return new RegExp("^[a-zA-Z0-9]+$", 'i').test(string);
};