var util = require('util');
var http = require('http');
var https = require('https');
var responseSend = require('response-send');
var responseRedirect = require('response-redirect');
var Router = require('router'); // https://github.com/pillarjs/router
// var async = require('async'); // https://github.com/caolan/async
var websocketServer = require(__dirname + '/websocketServer');
var ids = require(__dirname + '/nserve.plugin.ids');
var unifyrequest = require(__dirname + '/nserve.plugin.unifyrequest');
var static = require('node-static'); // https://github.com/cloudhead/node-static
var EventEmitter = require('events').EventEmitter;
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
		srv = https.createServer(config.ssl).listen(config.port, config.host);
	} else {
		srv = http.createServer().listen(config.port, config.host);
	}
	srv.on('request', requestHandler.bind(srv));
	srv._config = config;
	if (config.websocket === true) {
		websocketServer(srv, { logger: function() { nserve.events.emit('log', arguments); } });
	}
	if (typeof config.fileServer === 'object') {
		srv._fileServer = fileServer(srv);
	}
	srv.router = Router();
	nserve.servers.push(srv);
	nserve.events.emit('listening', srv);
	return srv;
};


nserve._defaultConfig = function() {
	var defaults = {
		id: 'someServer',
		port: 8180,
		host: '127.0.0.1',
		ssl: false,
		websocket: true,
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
	http.ServerResponse.prototype.__defineGetter__('req', function(){
		return this.socket.parser.incoming;
	});
	http.ServerResponse.prototype.redirect = responseRedirect;
	http.ServerResponse.prototype.send = responseSend;
	http.ServerResponse.prototype.json = responseSend.json({
		spaces: 2
	});
	return true;
};


function requestHandler(req, res) { // in server scope
	nserve.events.emit('request', this, req, res);
	var thisServer = this;
	// req.addListener('end', function () {
		// thisServer._fileServer
	// }).resume();
	return this.router(
		req, 
		res, 
		function(err) {
			if (err) {
				console.error(err.stack || err.toString());
			} else if (!req.handled) {
				thisServer._fileServer(req, res);
			}
			return;
		}
	);
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

