
var ids = require(__dirname + '/nserve.plugin.ids');

	
function unifyRequestData(req) {
	var connection = req._connection;
	var data = {
		clientId: getClientId(req, connection),
		cookies: getCookies(req, connection),
		input: getInput(req, connection), // this is what has been parsed from body and url-query-parameters merged together
		ip: getIP(req, connection),
		queryId: getQueryId(req, connection), // every single query gets an id
		requestId: getRequestId(req, connection), // this is the requestId for http or the connectionId for websocket
		requestType: getRequestType(req, connection), // http || websocket
		session: getSession(req, connection),
		timestamp: Date.now(),
		userAgent: getUserAgent(req, connection),
		url: getUrl(req, connection),
	};
	
	return data;
};


module.exports = unifyRequestData;


function getClientId(req, connection) {
	var data = 'unknown';
	if (typeof connection === 'object' && connection !== null) {
		connection.nserve.clientId = ids.ClientId.ensure(connection.clientId);
		data = connection.nserve.clientId;
	} else {
		req.nserve.clientId = ids.ClientId.ensure(req.clientId);
		data = req.nserve.clientId;
	}
	return data;
};


function getCookies(req, connection) {
	var data = {};
	if (typeof connection === 'object' && connection !== null) {
	} else {
	}
	return data;
};


function getInput(req, connection) {
	var data = {};
	if (typeof connection === 'object' && connection !== null) {
	} else {
	}
	return data;
};


function getIP(req, connection) {
	var data = '0.0.0.0';
	if (
		typeof req === 'object' 
		&& typeof req.headers === 'object' 
		&& typeof req.headers['x-forwarded-for'] === 'string'
	) {
		data = req.headers['x-forwarded-for'];
	} else if (
		typeof req === 'object'
		&& typeof req.remoteAddress === 'string'
	) {
		data = req.remoteAddress;
	}	else if (
		typeof req === 'object'
		&& typeof req._remoteAddress === 'string'
	) {
		data = req._remoteAddress;
	}	else if (
		typeof connection === 'object'
		&& connection !== null
		&& typeof connection.remoteAddress === 'string'
	) {
		data = connection.remoteAddress;
	}
	return data;
};


function getQueryId(req, connection) {
	var data = 'unknown';
	if (typeof connection === 'object' && connection !== null) {
		req.queryId = ids.QueryId.ensure(req.queryId);
		data = req.queryId;
	} else {
		req.queryId = ids.QueryId.ensure(req.queryId);
		data = req.queryId;
	}
	return data;
};


function getRequestId(req, connection) {
	var data = 'unknown';
	if (typeof connection === 'object' && connection !== null) {
		connection.requestId = ids.RequestId.ensure(connection.requestId);
		data = req.requestId;
	} else {
		req.requestId = ids.RequestId.ensure(req.requestId);
		data = req.requestId;
	}
	return data;
};


function getRequestType(req, connection) {
	return (typeof connection === 'object' && connection !== null) ? 'websocket' : 'http';
};


function getSession(req, connection) {
	var data = {};
	if (typeof connection === 'object' && connection !== null) {
	} else {
	}
	return data;
};


function getUserAgent(req, connection) {
	var data = 'unknown';
	if (typeof connection === 'object' && connection !== null) {
	} else {
	}
	return data;
};


function getUrl(req, connection) {
	var data = {};
	if (typeof connection === 'object' && connection !== null) {
	} else {
	}
	return data;
};

