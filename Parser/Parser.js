const Arguments = require('./Arguments.js');


/* Errors
 */
const IncompleteValue = require('./errors/IncompleteValue.js'),
	  MissingCommand = require('./errors/MissingCommand.js'),
	  MissingFlag = require('./errors/MissingFlag.js'),
	  MissingVariable = require('./errors/MissingVariable.js'),
	  UnexpectedToken = require('./errors/UnexpectedToken.js');


/* Bind constructor to module.exports
 */
module.exports = Parser;


/* Command parser components
 *
 * Splits an input string into parts and build an Arguments object
 */
function Parser() {
	this.input = "";
	this.buffer = "";
	this.stack = [];
	this.output;
	
	
	/* Parser function that starts at the beginning of the input
	 */
	// Keyword-based
	this.parseKW = function(input) {
		this.input = input;
		this.output = new Arguments();
		
		var i = 0;
		while (i < this.input.length) {
			switch(this.input.charAt(i)) {
				// End of a Command or Parameter
				case ' ':
					i = this[' '](i);
					break;
				
				// Beginning of a Flag or Variable
				case '-':
					i = this['-'](i);
					break;
				
				// All other characters get put on the buffer
				default:
					// Check for invalid tokens
					if (!isValid(this.input.charAt(i)))
						throw new UnexpectedToken(this.input.charAt(i), i);
					
					this.buffer += this.input.charAt(i);
					i += 1;
					break;
			}
		}
		
		// Treat the end of the input as ' '
		i = this[' '](i - 1);
		return i;
	};
	
	// Positional
	this.parsePos = function(input) {
		this.input = input;
		this.output = new Arguments();
		
		// When adding arguments, assume all variables
		var i = 0;
		while (i < this.input.length) {
			switch(this.input.charAt(i)) {
				// Escaped characters
				case '\\':
					i = this['\\'](i);
					break;
				
				// End of a Command or Parameter
				case ' ':
					// Interpret as input if buffer is of length 0
					if (this.stack.length > 0)
						this.buffer += ' ';
					else if (this.buffer.length > 0) {
						if (this.output.argc == 0)
							this.output.setCommand(this.buffer);
						else
							this.output.addVariable(undefined, this.buffer);
						
						this.buffer = "";
					}
					
					// Discard excess whitespace
					i += 1;
					break;
				
				// Open/close quotes
				case "'": case '"': case '`':
					var last = this.stack.pop();
					
					if (last && last == this.input.charAt(i)) {
						this.output.addVariable(undefined, this.buffer);
						this.buffer = "";
					} else {
						if (last)
							this.stack.push(last);
						this.stack.push(this.input.charAt(i));
					}
					
					i += 1;
					break;
				
				// All other characters get put on the buffer
				default:
					this.buffer += this.input.charAt(i);
					i += 1;
					break;
			}
		}
		
		if (this.stack.length > 0)
			throw new IncompleteValue(this.stack, i);
		
		if (this.buffer.length > 0) {
			this.output.addVariable(undefined, this.buffer);
			this.buffer = "";
		}
	};


	/* Handle each special character as it is observed
	 */
	// Escaped characters
	this['\\'] = function(i) {
		this.buffer += this.input.charAt(i + 1);
		return i + 2;
	};

	// Spaces
	this[' '] = function(i, varName) {
		// Ignore whitespace if it serves no function
		if (this.buffer.length == 0)
			return i + 1;
		
		if (this.stack.length > 0) {
			// While there's something on the stack, append to buffer
			this.buffer += ' ';
		} else {
			// This is the end of the previous argument
			if (this.output.argc == 0) {
				// If no command has been set yet, the buffer becomes the command
				if (this.buffer.length == 0)
					throw new MissingCommand(i);
				
				this.output.setCommand(this.buffer);
				this.buffer = "";
			} else {
				// Flush the buffer, assume variable
				if (!varName)
					throw new MissingVariable(i);
				
				this.output.addVariable(varName, this.buffer);
				this.buffer = "";
			}
		}
		
		return i + 1;
	};

	// A Flag or a Variable
	this['-'] = function(i) {
		i += 1;
		
		// Verify that the command has been set before the first Flag or Variable is introduced
		if (this.output.argc == 0)
			throw new MissingCommand(i);
		
		// End of string
		if (i >= this.input.length)
			throw new MissingFlag(i);
		
		if (this.input.charAt(i) == '-') {
			// Actually a variable
			return this['--'](i);
		} else {
			// Collect all flags
			while (this.input.charAt(i) != ' ' && i < this.input.length) {
				if (!isValid(this.input.charAt(i)))
					throw new UnexpectedToken(this.input.charAt(i), i);
				
				this.output.addFlag(this.input.charAt(i));
				i += 1;
			}
			
			return i + 1;
		}
	};

	// Go here if Variable
	this['--'] = function(i) {
		i += 1;
		var varName;
		
		// End of string
		if (i >= this.input.length)
			throw new MissingVariable(i - 2);
		
		while (i < this.input.length) {
			switch(this.input.charAt(i)) {
				// End of Boolean variable
				case ' ':
					if (this.buffer.length == 0)
						throw new UnexpectedToken(' ', i);
					
					this.output.addVariable(this.buffer);
					this.buffer = "";
					return i + 1;
				
				// Value found
				case '=':
					if (this.buffer.length == 0)
						throw new UnexpectedToken('=', i);
					
					varName = this.buffer;
					this.buffer = "";
					
					return this['='](i + 1, varName);
				
				default:
					// Check for invalid tokens
					if (!isValid(this.input.charAt(i)))
						throw new UnexpectedToken(this.input.charAt(i), i);
					
					this.buffer += this.input.charAt(i)
					i += 1;
					break;
			}
		}
		
		// Treat end of string like ' '
		if (this.buffer.length == 0 && this.input.charAt(i - 1) == '-')
			throw new MissingVariable(i);
		else if (this.buffer.length > 0) {
			this.output.addVariable(this.buffer);
			this.buffer = "";
		}
		
		return i;
	};

	// The value of a variable
	this['='] = function(i, varName) {
		// Find the value of the variable
		while (i < this.input.length) {
			switch(this.input.charAt(i)) {
				case ' ':
					i = this[' '](i, varName);
					
					// If there is nothing on the stack, end of value
					if (this.stack.length == 0)
						return i;
					
					break;
				
				case '\\':
					i = this['\\'](i);
					break;
				
				case '\'': case '"': case '`':
					i = this['quote'](i);
					
					if (this.stack.length == 0) {
						this.output.addVariable(varName, this.buffer);
						this.buffer = "";
						return i;
					}
					
					break;
				
				default:
					this.buffer += this.input.charAt(i);
					i += 1;
					break;
			}
		}
		
		// Reject values if the stack is not cleared properly
		if (this.stack.length > 0)
			throw new IncompleteValue(this.stack, i);
		
		// Flush buffer on reaching end of string
		if (this.buffer.length > 0) {
			this.output.addVariable(varName, this.buffer);
			this.buffer = "";
		}
		
		return i;
	};

	// All 3 quote types ('\'', '"', '`') mean the same thing
	// Each quote type can only be closed by itself; treat differing quotes as literals
	this['quote'] = function(i) {
		if (this.stack.length == 0) {
			this.stack.push(this.input.charAt(i));
		} else if (this.stack[this.stack.length - 1] != this.input.charAt(i)) {
			// Treat as a literal
			this.buffer += this.input.charAt(i);
		} else if (this.stack[this.stack.length - 1] == this.input.charAt(i)) {
			// Pop from the stack and move on
			this.stack.pop();
		}
		
		return i + 1;
	};
};


/* Utility functions
 */
// Check if something is a quote
var isQuote = function(q) {
	return q == '\'' || q == '"' || q == '`';
};

// Check if a symbol is appropriate
const VALID = '^[A-Za-z0-9\-_\.]+$';
var isValid = function(input) {
	return new RegExp(VALID, 'g').test(input);
};