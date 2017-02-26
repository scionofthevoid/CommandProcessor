/* Command parser
 */
// Split an input string into parts as follows: {argc: <numberOfArguments>, argv: {"cmd": <nameOfCommand>, [<parameterName>: {type: <"-" or "--">[, value: <value>]}] ...}}
module.exports = function(input) {
	if (input.length == 0)
		return {err: "Nothing to parse"};
	
	var parsed = {argc: 0, argv: {}},
		buffer = "",
		symbols = [],
		arg = undefined,
		lastArg = "";
	
	for (var i = 0; i < input.length; i++) {
		switch(input.charAt(i)) {
			case '\\':
				if (i + 1 < input.length) {
					buffer += convertEscaped(input.substring(i, i + 2));
					i += 1;
				} else
					return unexpectedToken('\\', i);
				
				break;
			
			// End of a Command or Parameter
			case ' ':
				if (arg)
					return unexpectedToken(' ', i);
				
				if (symbols.length > 0) {
					// Part of some other Value
					buffer += ' ';
				} else if (!("cmd" in parsed.argv)) {
					if (symbols.length > 0)
						return unexpectedToken(' ', i);
					
					if (buffer.length == 0)
						return missingCommand(i);
					
					// Set command
					parsed.argv["cmd"] = buffer;
					buffer = "";
					parsed.argc += 1;
				} else if (buffer.length > 0) {
					// Ensure that Value binds to a Parameter
					if (lastArg.length == 0)
						return unexpectedToken(' ', i);
					
					// Ensure that the Value is syntactically correct
					if (symbols.length > 0)
						return syntaxError(symbols[symbols.length - 1], i);
					
					parsed.argv[lastArg].value = buffer;
					buffer = "";
					lastArg = "";
				}
				
				break;
			
			case '=':
				// Part of a value if symbol stack has content
				if (symbols.length > 0)
					buffer += '=';
				// Start of value if symbol stack is empty
				else {
					if (buffer in parsed.argv)
						return {err: `Duplicate parameter ${buffer} at ${i}`};
					
					parsed.argv[buffer] = arg;
					lastArg = buffer;
					buffer = "";
					parsed.argc += 1;
					arg = undefined;
				}
				
				break;
			
			// Open/close quotes
			case "'": case '"': case '`':
				if (lastArg.length == 0)
					return unexpectedToken(input.charAt(i), i);
				
				if (symbols.length == 0) {
					// Mark the start of a Value
					symbols.push(input.charAt(i));
				} else if (closes[input.charAt(i)] != symbols[symbols.length - 1]) {
					// Treat differing quotes as literals
					if (isQuote(symbols[symbols.length - 1]))
						buffer += input.charAt(i);
					else
						symbols.push(input.charAt(i));
				} else {
					if (closes[input.charAt(i)] != symbols[symbols.length - 1])
						return unexpectedToken(input.charAt(i), i);
					
					symbols.pop();
					
					// Treat the buffer as a Value and save in parsed.argv
					parsed.argv[lastArg].value = buffer;
					lastArg = "";
					buffer = "";
				}
				
				break;
			
			// Open parentheses
			case '(': case '[': case '{':
				// Push onto symbol stack
				symbols.push(input.charAt(i));
				break;
			
			// Closing parentheses
			case ')': case ']': case '}':
				if (closes[input.charAt(i)] != symbols[symbols.length - 1])
					return unexpectedToken(input.charAt(i), i);
				
				symbols.pop();
				break;
			
			// Beginning of a Flag or Parameter
			case '-':
				if (i + 1 >= input.length)
					return unexpectedToken('-', i);
				
				if (input.charAt(i + 1) == '-') {
					// Parameter
					arg = {type: "--"};
					buffer = "";
					i += 1;
				} else {
					// Flag
					insertFlag(parsed, input.charAt(i + 1));
					buffer = "";
					
					// Get any and all Flags after the first
					i += 2;
					while (input.charAt(i) != ' ' && i < input.length) {
						insertFlag(parsed, input.charAt(i));
						i += 1;
					}
				}
				
				break;
			
			default:
				buffer += input.charAt(i);
				break;
		}
	}
	
	// One-word command
	if (!("cmd" in parsed.argv)) {
		parsed.argv["cmd"] = input;
		
		parsed.argc += 1;
		buffer = "";
	}
	
	// Clean up any remaining tokens in the buffer
	if (buffer.length > 0) {
		if (symbols.length > 0)
			return syntaxError(symbols[symbols.length - 1], buffer.length - 1);
		
		if (lastArg.length > 0)
			parsed.argv[lastArg].value = buffer;
		else 
			parsed.argv[buffer] = arg;
	}
	
	return parsed;
};

// Matches close parentheses and quotes to their counterparts
var closes = {
	"'": "'",
	'"': '"',
	'`': '`',
	')': '(',
	']': '[',
	'}': '{'
};


/* Helper functions
 */
// Insert a Flag
var insertFlag = function(parsed, flagName) {
	parsed.argc += 1;
	parsed.argv[flagName] = {type: "-"};
};


/* Parser-specific utilities
 */
// Check if the symbol is a quote type
var isQuote = function(symbol) {
	return symbol == "'" || symbol == '"' || symbol == '`';
};

// Check if the symbol is a parenthetical type
var isParentheical = function (symbol) {
	return symbol == '(' || symbol == ')' ||
		symbol == '[' || symbol == ']' ||
		symbol == '{' || symbol == '}';
};

// Converts an escaped character to its character literal
var convertEscaped = function(escaped) {
	switch(escaped) {
		case "\\b":
			return "\b";
		
		case "\\f":
			return "\f";
		
		case "\\n":
			return "\n";
		
		case "\\r":
			return "\r";
		
		case "\\t":
			return "\v";
		
		case "\\\\":
			return "\\";
		
		default:
			return escaped.charAt(1);
	}
};


/* Errors
 */
// Unexpected token
var unexpectedToken = function(token, position) {
	return {err: `Unexpected token '${token}' at position ${position}`};
};

// Syntax error
var syntaxError = function(symbol, position) {
	switch(symbol) {
		case "'":
			return {err: `Unclosed single quote before position ${position}`};
		
		case '"':
			return {err: `Unclosed double quote before position ${position}`};
		
		case '`':
			return {err: `Unclosed backtick before position ${position}`};
		
		case '(':
			return {err: `Unclosed parenthesis before position ${position}`};
		
		case '[':
			return {err: `Unclosed square bracket before position ${position}`};
		
		case '{':
			return {err: `Unclosed curly brace before position ${position}`};
		
		default:
			return {err: `Syntax error: position ${postiion}`};
	}
};

// Missing command
var missingCommand = function(position) {
	return {err: `Missing command at ${position}`};
}