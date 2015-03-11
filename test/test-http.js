var Lg = require('lg');
var log = new Lg({log2console:true, logLevel:1});
var nserve = require('../lib/nserve');
var bodyParser = require('body-parser');
var responseTime = require('response-time');
var compression  = require('compression');
var Router = require('router'); // https://github.com/pillarjs/router
var Qs  = require('qs');
var middleWare = [
	compression(), 
	responseTime(),
	bodyParser.urlencoded({ extended: false }),
	bodyParser.json(),
	function(req, res, next) {
		req.query = Qs.parse(req.url.split('?')[1]);
		console.log('----------------------!!!!!**************Qs.parse**********');
		next();
	}
];

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
nserve.events.on(
	'log',
	function(params) {
		log.add.apply(log, params);
	}
);
nserve.events.on(
	'njson',
	function(params) {
		var url = log.njson.apply(log, params);
	}
);
log.add('init', 'yellow', 'httpTest', 2);

server = nserve.listen({host: 'itsatony.com'}); 
server.router = Router();



server.on(
	'unifyRequestDone',
	function(req, res, uniReq) {
		console.log('--->' , uniReq);
		if (uniReq.requestType === 'http') {
			return server.router(
				req, 
				res, 
				function(err) {
					if (err) {
						console.error(err.stack || err.toString());
					} else if (!req.handled) {
						server._fileServer(req, res);
					}
					return;
				}
			);
		} else {
			answer(req, res, function() {});
		}
	}
);


server.router.all(
	'/api',
	middleWare,
	function(req, res, next) {
		log.add('requestEnd', 'yellow', 'httpTest', 2);
		req.handled = true;
		console.log('############# /api [body]');
		console.log(req.body);
		console.log('--------------------');
		console.log('############# /api [query]');
		console.log(req.query);
		console.log('--------------------');
		next();
	},
	answer
);


function answer(req, res, next) {
	console.log('ANSWERING ~~~~~');
	res.json(200, {done: 'true'});
	next();
};

