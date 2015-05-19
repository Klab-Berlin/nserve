var fs = require('fs');
var util = require('util');
var http = require('http');
var https = require('https');
var Q  = require('q');
var responseSend = require('response-send');
var responseRedirect = require('response-redirect');
// var async = require('async'); // https://github.com/caolan/async
var websocketServer = require(__dirname + '/websocketServer');
var ids = require('nids');
var unifyrequest = require(__dirname + '/nserve.plugin.unifyrequest');
var static = require('node-static'); // https://github.com/cloudhead/node-static
var EventEmitter = require('events').EventEmitter;
var unifyRequestData = require(__dirname + '/nserve.plugin.unifyrequest');
var Router = require('router'); // https://github.com/pillarjs/router
extendHttp();

var nserve = {
	servers: [],
	events: new EventEmitter
};
module.exports = nserve;


nserve.listen = function(settings) {
	var config = util._extend({}, nserve._defaultConfig());
	config = util._extend(config, settings);
	var srv = null;
	var useSSL = !(typeof config.ssl !== 'object' || config.ssl === null);
	if (useSSL === true) {
		var sslFiles = {};
		for (var n in config.ssl) {
			sslFiles[n] = (typeof config.ssl[n] === 'string') ? fs.readFileSync(config.ssl[n]) : config.ssl[n];
		}
		srv = https.createServer(sslFiles).listen(config.port, config.host);
	} else {
		srv = http.createServer().listen(config.port, config.host);
	}
	srv.on('request', requestHandler.bind(srv));
	srv._config = config;
	srv.router = Router();
	if (config.websocket === true) {
		srv._wsServer = websocketServer(
			srv, 
			{ 
				// enforcedCookies: settings.enforcedCookies || {}, 
				protocol: config.protocol, 
				logger: function() { nserve.events.emit('log', arguments); }, 
				emitter: nserve.events 
			}
		);
	}
	if (typeof config.fileServer === 'object') {
		srv._fileServer = fileServer(srv);
	}
	nserve.servers.push(srv);
	nserve.events.emit('listening', srv);
	nserve.events.on(
		'newRequest', 
		function(server, req, res) {
			try {
				unifyRequestData(
					config, 
					req,
					function(err, result) {
						var uniReq = result;
						// nserve.events.emit('njson', uniReq, 'nserveunireq');
						srv.emit('unifyRequestDone', req, res, uniReq,  'nserveunireq');
					}
				);
			} catch(err) {
				var input = '';
				if (req._source === 'websocket') {
					input = req._message.utf8Data;
				}
				var parseError = new Error('not able to parse your request');
				console.log('error unifying request', err);
				return res.json(
					{
						errors: [ parseError.toString(), err.toString() ],
						results: null,
						input: input
					}
				);
			}
		}
	);
	return srv;
};


nserve._defaultConfig = function() {
	var defaults = {
		id: 'someServer',
		port: 8180,
		host: '127.0.0.1',
		ssl: false,
		websocket: true,
		requestLimit: '100mb',
		fileServer: {
			basePath: process.cwd() + '/public',
			options: {
				gzip: true,
				serverInfo: 'nserve',
				cache: 30
			}
		}
	};
	return defaults;
};


function extendHttp() {
	http.ServerResponse.prototype.__defineGetter__(
		'req', 
		function(){
			if (this.socket.parser === null) {
				log.njson(this, 'brokenhttpsocket');
				console.log('--------------------------- SOCKET ------------------------ \n');
			}
			return this.socket.parser.incoming;
		}
	);
	http.ServerResponse.prototype.redirect = responseRedirect;
	http.ServerResponse.prototype.send = responseSend;
	http.ServerResponse.prototype.json = responseSend.json({
		spaces: 2
	});
	return true;
};


function requestHandler(req, res) { // in server scope
	var thisServer = this;
	req._source = 'http';
	req._message = null;
	req._connection = null;
	req._wsServer = null;
	req.nserve = {};
	nserve.events.emit('newRequest', this, req, res);
};


function fileServer(srv) {
	var myFileServer = new static.Server(srv._config.fileServer.basePath, srv._config.fileServer.options);
	return function(req, res, next) {
		nserve.events.emit('fileserver.attached', srv, myFileServer);
		return myFileServer.serve(
			req, 
			res, 
			function(err, result) {
				if (err && (err.status === 404)) {
					nserve.events.emit('fileserver.result', 404, srv, req.url);
					res.end('file not found', 404);
				}
				if (!err) {
					nserve.events.emit('fileserver.result', 200, srv, req.url);
				}
			}
		);
	}
};

