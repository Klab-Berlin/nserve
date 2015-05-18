var ids = require('nids');
var Minions = require('minions');
minions = new Minions(['node']);
var bodyParser = require('body-parser');
var Qs  = require('qs');
var Q  = require('q');
	
function unifyRequestData(req, callback) {
	req = ensureNserveNamespace(req);
	var data = {
		headers: getHeaders(req),
		cookies: getCookies(req),
		input: {}, // getInput(req), // this is what has been parsed from body and url-query-parameters merged together
		ip: getIP(req),
		requestId: getRequestId(req), // this is the requestId for http or the connectionId for websocket
		requestType: getRequestType(req), // http || websocket
		session: getSession(req),
		timestamp: Date.now(),
		userAgent: getUserAgent(req),
		url: getUrl(req)
	};
	getInput(
		req, 
		function(err, results) { 
			data.input = results; 
			data.queryId = getQueryId(req, data.input); // every single query gets an id
			data.method = getMethod(data, req);
			data.clientId = getClientId(data, req);
	// log.njson(data, 'unireq');
			callback(null, data);
			return true;
		}
	);
	return data;
};


module.exports = unifyRequestData;


function getMethod(data, req) {
	var method = 'none';
	if (typeof data.input.method === 'string')  {
		method = data.input.method;
		return method;
	}
	if (req._source !== 'websocket' && method === 'none') {
		method = req.method;
	}
	method = method.toLowerCase();
	data.input.method = method;
	return method;
};


function getClientId(data, req) {
	// console.log('getClientId', data);
	var data = 'unknown';
	if (typeof req._source === 'string' && req._source === 'websocket') {
		req._connection.nserve.clientId = ids.ClientId.ensure(req._connection.nserve.clientId);
		data = req._connection.nserve.clientId;
	} else {
		req.nserve.clientId = ids.ClientId.ensure(data.clientId);
		data = req.nserve.clientId;
	}
	// console.log(data);
	return data;
};


function getCookies(req) {
	var data = {};
	if (req._source === 'websocket') {
	} else {
	}
	return data;
};


function getInput(req, callback) {
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
		callback(null, data);
		return data;
	}
	// log.njson(req, 'ajaxreq');
	req.query = Qs.parse(req.url.split('?')[1]);
	// todo: make parser options configurable!
	promisify(
		'urlencoded', bodyParser.urlencoded({ limit: '100mb', extended: false }), [req, null]
	)
	.then(
		function() {
			return promisify(
				'json', bodyParser.json(), [req, null]
			)
		}
	).catch(
		function(err) {
			console.log('--- request decode error ------');
			console.log(err.stack);
			return callback(err, adata);
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
			callback(null, adata);
			return adata;
		}
	);
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
	if (req._source === 'websocket') {
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


function getRequestId(req) {
	var data = 'unknown';
	req.nserve.requestId = ids.RequestId.ensure(req.nserve.requestId);
	data = req.nserve.requestId;
	return data;
};


function getRequestType(req) {
	return req._source;
};


function getSession(req) {
	var data = {};
	if (req._source === 'websocket') {
	} else {
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


function ensureNserveNamespace(object) {
	if (typeof object.nserve !== 'object' || object.nserver === null) {
		object.nserve = {};
	}
	return object;
};
