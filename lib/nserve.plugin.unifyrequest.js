var ids = require('nids');
var Minions = require('minions');
minions = new Minions(['node']);
var bodyParser = require('body-parser');
var xmlparser = require('express-xml-bodyparser');
var Qs  = require('qs');
var Q  = require('q');
var Promise = Q.Promise;
	
function unifyRequestData(config, req, callback) {
	// req = ensureNserveNamespace(req);
	// console.log('..unireq start ' + Date.now());
	// console.log('----------- SOURCE: ', req);
	var data = {};
	data.headers = getHeaders(req);
	data.body = null;
	data.query = null;
	data.cookies = getCookies(req);
	data.input = {}; // getInput(req), // this is what has been parsed from body and url-query-parameters merged together
	data.requestType = getRequestType(req); // http || websocket
	data.session = getSession(req);
	data.sessionID = getSessionID(req);
	data.timestamp = Date.now();
	data.url = getUrl(req);
	data.ip = getIP(req);
	data.userAgent = getUserAgent(req);
	data.connectionId = getConnectionId(req);
	getInput(
		config,
		req, 
		function(err, results) {
			data.body = results; 
			data.query = results; 
			data.input = results; 
			data.queryId = getQueryId(req, data.input); // every single query gets an id
			data.requestId = getRequestId(req, data.input); // this is the requestId for http or the connectionId for websocket
			data.method = getMethod(req, data.input);
			data.clientId = getClientId(req, data.input);
			// console.log('..unireq end ' + Date.now());
			callback(err, data);
			return true;
		}
	);
	return data;
};


module.exports = unifyRequestData;


function getMethod(req, input) {
	var method = 'none';
	if (typeof input.method === 'string')  {
		method = input.method;
		return method;
	}
	if (req._source !== 'websocket' && method === 'none') {
		method = req.method;
	}
	method = method.toLowerCase();
	return method;
};


function getClientId(req, input) {
	var data = 'unknown';
	if (typeof req._source === 'string' && req._source === 'websocket') {
		var cid = input.clientId || req._connection.nserve.clientId;
		req._connection.nserve.clientId = ids.ClientId.ensure(cid);
		data = req._connection.nserve.clientId;
	} else {
		var cid = input.clientId;
		req.nserve.clientId = ids.ClientId.ensure(cid);
		data = req.nserve.clientId;
	}
	// console.log(data);
	// console.log('getClientId', data);
	return data;
};


function getCookies(req) {
	var data = {};
	if (req._source === 'websocket') {
	} else {
	}
	return data;
};


function getInput(config, req, callback) {
	var data = {};
	var adata = {};
	var msg = null;
	var error = null;
	if (req._source === 'websocket') {
		try {
			msg = JSON.parse(req._message.utf8Data);
		} catch(err) {
			msg = null;
			error = err;
		}
		data = msg.data;
		callback(error, data);
		return data;
	}
		// console.log('-> getInput.HTTP');
	// log.njson(req, 'ajaxreq');
	req.query = Qs.parse(req.url.split('?')[1]);
	// todo: make parser options configurable!
	return Q(true)
		.then(
			function() {
				return Promise(
					function(resolve, reject) {
						try {
							bodyParser.urlencoded({ limit: config.requestLimit, extended: false })(req, null, resolve);
						} catch (err) {
							reject(err);
						}
					}
				);
			}
		)	
		.then(
			function() {
				return Promise(
					function(resolve, reject) {
						try {
							bodyParser.json()(req, null, resolve);
						} catch (err) {
							reject(err);
						}
					}
				)
			}
		)
		.then(
			function() {
				return Promise(
					function(resolve, reject) {
						try {
							xmlparser({trim: false, explicitArray: false})(req, null, resolve);
						} catch (err) {
							reject(err);
						}
					}
				)
			}
		)
		.then(
			function() {
				if (typeof req.query === 'object' && req.query !== null) {
					// console.log('QUERY----------------', req.query);
					adata = minions.extendDeep(false, adata, req.query);
				}
				if (typeof req.body === 'object' && req.body !== null) {
					// console.log('body----------------', req.body);
					adata = minions.extendDeep(false, adata, req.body);
				}
				if (!('document' in adata)) {
					// wrap with document
					adata = {
						document : adata
					}
				}
				callback(null, adata);
				return adata;
			}
		)
		.catch(
			function(err) {
				console.log('--- request decode error ------');
				console.log(err.stack);
				return callback(err, adata);
			}
		)
	;
};


function promisify(name, middleware, parameters) {
	var deferred = Q.defer();
	deferred.n=name;
	var callback = function(err, data) {
		if (err) {
			deferred.reject(err);
		}	else {
			deferred.resolve(true);
		}
	};
	parameters.push(callback);
	var bla = middleware.apply(middleware, parameters);
	return deferred.promise;
};


function getIP(req) {
	var data = '0.0.0.0';
	if (typeof req._source === 'string' && req._source === 'websocket') {
		data = req._connection.remoteAddresses[0];
	} else {
		var clientIp = req.headers['x-client-ip'];
		var forwardedIpsStr = req.headers['x-forwarded-for'];
		var altForwardedIp = req.headers['x-real-ip'];
		if (clientIp) {
			data = clientIp;
		} else if (forwardedIpsStr) {
			var forwardedIps = forwardedIpsStr.split(',');
			data = forwardedIps[0];
		} else if (altForwardedIp) {
			data = altForwardedIp;
		}
		if (!data || data === '0.0.0.0') {
			data = req.socket.remoteAddress;
		}
	}
	return data;
};


function getQueryId(req, input) {
	var data = 'unknown';
	req.nserve.queryId = ids.QueryId.ensure(input.queryId);
	data = req.nserve.queryId;
	return data;
};


function getRequestId(req, input) {
	var data = 'unknown';
	var rid = input.requestId || req.nserve.requestId;
	req.nserve.requestId = ids.RequestId.ensure(rid);
	data = req.nserve.requestId;
	return data;
};


function getRequestType(req) {
	return req._source;
};


function getSession(req) {
	var data = req.session || {};
	if (req._source === 'websocket') {
	} else {
	}
	return data;
};
function getSessionID(req) {
	var data = 'noSessionID';
	if (req._source === 'websocket') {
		if (typeof req._connection.originalRequest.httpRequest.sessionID !== 'undefined') {
			data = req._connection.originalRequest.httpRequest.sessionID;
		}
	} else {
		if (typeof req.sessionID !== 'undefined') {
			data = req.sessionID;
		}
	}	
	return data;
};


function getUserAgent(req) {
	var data = 'unknown';
	if (req._source === 'websocket') {
		data = req._connection.originalRequest.httpRequest.headers['user-agent'];
	} else {
		data = req.headers['user-agent'];
	}
	return data;
};


function getUrl(req) {
	var data = '';
	if (req._source === 'websocket') {
		data = req._connection.originalRequest.httpRequest.url;
	} else {
		data = req.url;
	}
	return data;
};



function getHeaders(req) {
	var data = {};
	if (req._source === 'websocket') {
		data = req._connection.originalRequest.httpRequest.headers;
	} else {
		data = req.headers;
	}
	return data;
};


function ensureNserveNamespace(req) {
	if (typeof req.nserve !== 'object' || req.nserver === null) {
		req.nserve = {};
	}
	return req;
};


function getConnectionId(req) {
	var data = data = ids.ConnectionId.create();
	if (req._source === 'websocket') {
		data = req._connection.id;
	}
	return data;
};