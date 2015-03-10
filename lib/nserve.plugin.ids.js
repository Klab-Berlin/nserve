 function randomString(length, numbers, alphabetLowerCase, timestamp, alphabetUpperCase, extraChars) {
  var charArray = new Array(length);
  var randomString = '';
  var idchars = [];  
	var lengthIdChars = 0;
	var randomString_chars_alphabet = [ 'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z' ];
	var randomString_chars_numbers = [ '1','2','3','4','5','6','7','8','9','0' ];
	var randomString_chars_alphabetUpper = [ 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z' ];

  numbers = (typeof numbers === 'boolean') ? numbers : true;
  alphabetLowerCase = (typeof alphabetLowerCase === 'boolean') ? alphabetLowerCase : false;
  alphabetUpperCase = (typeof alphabetUpperCase === 'boolean') ? alphabetUpperCase : false;
  timestamp = (typeof timestamp === 'boolean') ? timestamp : false;
  if (numbers === true) { 
		idchars = idchars.concat(randomString_chars_numbers); 
	}
  if (alphabetLowerCase === true) { 
		idchars = idchars.concat(randomString_chars_alphabet); 
	}
  if (alphabetUpperCase === true) { 
		idchars = idchars.concat(randomString_chars_alphabetUpper); 
	}
	if (typeof extraChars === 'object' && extraChars instanceof Array === true) {
		idchars = idchars.concat(extraChars); 
	}
  lengthIdChars = idchars.length;
  for (var i=0; i < length; i+=1) {
    charArray[i] = idchars[Math.floor(Math.random()*lengthIdChars)];
  }
	randomString = (timestamp === true) 
		? 
			Date.now() + charArray.join('') 
		: 
			charArray.join('')
	;
  return randomString;
};


var QueryId = {};
QueryId.is = function(input) {
	return (
		typeof input === 'string' 
		&& input.length === 32 
		&& input.indexOf('qid') === 0
	);
};
QueryId.create = function() {
	return 'qid' + randomString(16, true, true, true);
};
QueryId.ensure = function(input) {
	if (this.is(input) === false) {
		return this.create();
	}
	return input;
};


var RequestId = {};
RequestId.is = function(input) {
	return (
		typeof input === 'string' 
		&& input.length === 32 
		&& input.indexOf('rid') === 0
	);
};
RequestId.create = function() {
	return 'rid' + randomString(16, true, true, true);
};
RequestId.ensure = function(input) {
	if (this.is(input) === false) {
		return this.create();
	}
	return input;
};


var ConnectionId = {};
ConnectionId.is = function(input) {
	return (
		typeof input === 'string' 
		&& input.length === 32 
		&& input.indexOf('con') === 0
	);
};
ConnectionId.create = function() {
	return 'con' + randomString(16, true, true, true);
};
ConnectionId.ensure = function(input) {
	if (this.is(input) === false) {
		return this.create();
	}
	return input;
};


var ClientId = {};
ClientId.is = function(input) {
	return (
		typeof input === 'string' 
		&& input.length === 32 
		&& input.indexOf('cid') === 0
	);
};
ClientId.create = function() {
	return 'cid' + randomString(16, true, true, true);
};
ClientId.ensure = function(input) {
	if (this.is(input) === false) {
		return this.create();
	}
	return input;
};


module.exports = {
	ClientId: ClientId,
	ConnectionId: ConnectionId,
	RequestId: RequestId,
	QueryId: QueryId,
	randomString: randomString
};

