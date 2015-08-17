// our server module
var nserve = require('../lib/nserve');


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
// printing basic info upon listening
nserve.events.on(
	'listening',
	function(srv) {
		console.log('listening on http' + ((srv._config.ssl)?'s':'') + '://' + srv._config.host + '.' + srv._config.port);
		if (srv._config.websocket === true) {
			console.log('listening on ws' + ((srv._config.ssl)?'s':'') + '://' + srv._config.host + '.' + srv._config.port);
		}
	}
);
// this event is triggered for any incoming request before unifying the data. you can handle here, but i wouldn't...
nserve.events.on(
	'request',
	function(srv, req, res) {
		console.log('incoming request to ' + req.url);
	}
);
// the event triggered by the fileserver module upon it answering a request.
nserve.events.on(
	'fileserver.result',
	function(resultCode, srv, reqUrl) {
		console.log(reqUrl, resultCode);
	}
);
// nserve itself will not log stuff, but trigger a log event, so you can use whatever logging system you prefer
nserve.events.on(
	'log',
	function(params) {
		console.log.apply(console.log, params);
	}
);
// nserve offers a special event to log json data. this is it... 
nserve.events.on(
	'njson',
	function(obj, id) {
		var url = console.log(obj, id);
		return url;
	}
);


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


// just a demo route - this is a link to the default router module we use: https://github.com/pillarjs/router
server.router.all(
	'/api',
	middleWare,
	function(req, res, next) {
		// if we handled the request via the router, we flag it, so the fileServer does not take over
		req.handled = true;
		console.log('route /api ');
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


// hello world
console.log('init');

