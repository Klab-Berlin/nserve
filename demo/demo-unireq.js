// our server module
var nserve = require('../lib/nserve');
// some pretty logging
var Lg = require('lg');
var log = new Lg({log2console:true, logLevel:1});
// defining the general http-request middleWare we want to use.
var responseTime = require('response-time');
var compression  = require('compression');
var middleWare = [
	compression(), 
	responseTime(),
	function(req, res, next) {
		next();
	}
];
// bind nserve events
nserve.events.on(
	'listening',
	function(srv) {
		log.add('listening on http' + ((srv._config.ssl)?'s':'') + '://' + srv._config.host + '.' + srv._config.port, 'green', 'httpTest', 2);
		if (srv._config.websocket === true) {
			log.add('listening on ws' + ((srv._config.ssl)?'s':'') + '://' + srv._config.host + '.' + srv._config.port, 'green', 'httpTest', 2);
		}
	}
);
nserve.events.on(
	'request',
	function(srv, req, res) {
		log.add('handling request to ' + req.url, 'yellow', 'httpTest', 2);
	}
);
nserve.events.on(
	'fileserver.result',
	function(resultCode, srv, reqUrl) {
		log.add(reqUrl, (resultCode === 200) ? 'green' : 'red',  'httpTest.fileServer.' + resultCode, 2);
	}
);
// nserve itself will not log stuff, but trigger a log event, so you can use whatever logging system you prefer
nserve.events.on(
	'log',
	function(params) {
		log.add.apply(log, params);
	}
);
// nserve offers a special event to log json data. this is it... 
nserve.events.on(
	'njson',
	function(obj, id) {
		var url = log.njson(obj, id);
		return url;
	}
);
log.add('init', 'yellow', 'httpTest', 2);


// START THE SERVER
var server = nserve.listen({host: 'itsatony.com', port 8180, websocket: true}); 
// HANDLE A INCOMING (unified) REQUEST
server.on(
	'unifyRequestDone',
	function(req, res, uniReq) {
		// allows easier answering and handling
		res.uniReq = uniReq;
		// if this was a websocket message, we answer it (the answerUnireq will simply send the uniReq object.. it's a demo afterall)
		if (uniReq.requestType === 'websocket') {
			return answerUniReq(req, res, function() {});
		}
		// if this was a standard http request, we route it
		return server.router(
			req, 
			res, 
			function(err) {
				if (err) {
					console.error(err.stack || err.toString());
				} else if (!req.handled) {
					// a request reached nserver, no routes reported handling the request.
					// hence, try serving a file
					server._fileServer(req, res);
				}
				return;
			}
		);
	}
);


// just a demo route
server.router.all(
	'/api',
	middleWare,
	function(req, res, next) {
		// if we handled the request via the router, we flag it, so the fileServer does not take over
		req.handled = true;
		log.add('route /api ', 'yellow', 'httpTest', 2);
		next();
	},
	answerUniReq
);


// answer any incoming request by sending back the uniReq object
function answerUniReq(req, res, next) {
	res.uniReq.done = true;
	res.json(200, res.uniReq);
	next();
};

