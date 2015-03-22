/*
	add this to config...
	// TODO ... 
	websocket: {
	}
*/
var WebSocketServer = require('websocket').server;
var WebSocketClient = require('websocket').client;
var WebSocketFrame  = require('websocket').frame;
var WebSocketRouter = require('websocket').router;
var ids = require(__dirname + '/nserve.plugin.ids');
var unifyrequest = require(__dirname + '/nserve.plugin.unifyrequest');
var EventEmitter = require('events').EventEmitter;
var Lg = require('lg');
var log = new Lg({log2console:true, logLevel:1});
var Minions = require('minions');
minions = new Minions(['node']);

// ------------------------- [[[ export
module.exports = attachWebsocketServerTo;


function attachWebsocketServerTo(server, settings) {
	var serverOptions = minions.extendShallow(
		false, 
		{},
		[
			defaultSettings(),
			settings
		]
	);
	serverOptions.httpServer = server;
	var wsServer = new WebSocketServer(serverOptions);
	wsServer.log = serverOptions.logger;
	wsServer.on(
		'request',
		handleRequest.bind(wsServer)
	);
	wsServer.events = serverOptions.emitter;
	wsServer.log('MOUNTED WS', 'green', 'wsServer.listen', 1);
	return wsServer;
};


function handleRequest(request) {  // wsServer scope
	request.nserve = {};
	// DEBUG
	log.njson(request, 'nservewsreq');
	if (
		originIsAllowed.apply(this, [ request ]) !== true
	) {
		request.reject();
		this.log(
			'connection rejected from origin {' 
				+ request.origin + '}', 
			'red', 
			'wsServer.listen.request',
			3
		);
		return;
	}
	var connection = request.accept('nprotocol', request.origin, request.cookies);
	connection.id = ids.ConnectionId.create();
	connection.originalRequest = request;
	connection.nserve = {};
	connection.nserve.wsServer = this;
	connection.nserve.clientId = request.nserve.clientId;
	log.njson(connection, 'nservewscon');
	var now = Date.now();
	this.log(
		'connection '
		+ ' [' + connection.id +'] '
		+ 'accepted from origin {' 
		+ request.origin + '}', 
		'green', 
		'wsServer.listen.request', 
		1
	);
	connection.on(
		'message', 
		handleMessage.bind(connection)
	);
	connection.on(
		'close', 
		handleClose.bind(connection)
	);
	return connection;
};


var wsResponse = {
	end: function(data) {
		console.log('--> end');
	},
	write: function(data) {
		console.log('--> write');
	},
	setHeaders: function(data) {
		console.log('--> setHeaders');
	}
};

function buildMessageBridge() {
	// vws.bubPubSub.subscribe(
		// '/wsServer/receivedMessage/utf8/',
		// function(data) {	
			// var httpRequest = minions.cloneObject(data.request.webSocketRequest.httpRequest);
			// var pubData = JSON.parse(data.message.utf8Data);
			// var branches = pubData.data.topic.split('/');
			// if (branches[1] !== 'commToServer') {
				// return false;
			// }
			// var routerUrl = '/' + branches[2] + '/' + branches[3] + '/' + branches[4];
			// var returnTopic = '/commToClient' + returnTopic;
			// httpRequest.originalUrl = routerUrl;
			// httpRequest.originalTopic = pubData.data.topic;
			// // ------[[[ do the routing now .. this is where all paths converge ;)
			// var con = vws.connections[data.connection.connectionId];
			// if (typeof pubData.data.headers === 'object') {
				// minions.extendShallow(false, con.headers, pubData.data.headers);
			// }
			// // -- attempting to make the unifying of websocket and httpReq work 
			// httpRequest.query = pubData.data;
			// httpRequest.headers = data.request.webSocketRequest.headers;
			// httpRequest.body = pubData.data;
			// httpRequest.protocol = 'vw-protocol';
			// httpRequest.type = 'websocket';
			// httpRequest.connectionId = data.connection.connectionId;
			// httpRequest.cookies = data.request.webSocketRequest.cookies;
			// httpRequest.session = con.session;
			// httpRequest.remoteAddress = con.request.remoteAddress;
			// httpRequest.origin = con.request.origin;
			// vws.plugins.apiHandler(httpRequest, wsResponse, function() {});
		// },
		// {
			// scope: process
		// },
		// 'wsServer.messageBridge.incoming'
	// );
};


function defaultSettings() {
	var settings = {
		maxReceivedMessageSize: 1073741824,  // 1gb
		maxReceivedFrameSize: 1048576, // 1mb
		fragmentOutgoingMessages: true,
		fragmentationThreshold: 16348,
		assembleFragments: true,
		keepalive: true,
		dropConnectionOnKeepaliveTimeout: true,
		keepaliveGracePeriod: 10000,
		autoAcceptConnections: false,
		closeTimeout: 5000,
		disableNagleAlgorithm: true,
		logger: console.log,
		emitter: new EventEmitter()
	};
	return settings;
};

function originIsAllowed(request) {
	// put logic here to detect whether the specified origin is allowed.
	if (typeof request.resourceURL.query.clientId !== 'string') {
		return false;
	}
	request.nserve.clientId = request.resourceURL.query.clientId;
	return true;
};	



function handleClose(reasonCode, description) { // connection scope
	this.nserve.wsServer.log(
		'connection closed from {' 
			+ this.connectionId 
			+ '@' + this.remoteAddress + '}', 
		'green', 
		'wsServer.listen.close',
		1
	);
	return true;
};


function handleMessage(message) { // this is in the connection scope
	message.id = ids.RequestId.create();
	this.lastMessageTimestamp = Date.now();
	if (message.type === 'utf8') {
		this.nserve.wsServer.log(
			'received MESSAGE '
				+ ' [' + message.id + '] in UTF8 {' 
				+ message.utf8Data.length 
				+ 'bytes} from [' 
				+ this.nserve.clientId 
				+ '@' + this.id 
				+ ']', 
			'green', 
			'wsServer.listen.message',
			1
		);
	}	else if (message.type === 'binary') {
		this.nserve.wsServer.log(
			'received MESSAGE '
				+ ' [' + message.id + '] in BINARY {' 
				+ message.binaryData.length 
				+ 'bytes} from [' 
				+ this.nserve.clientId 
				+ '@' + this.id 
				+ ']'
				+ ' ' + message.id, 
			'green', 
			'wsServer.listen.message',
			1
		);
	}	
	var wsReq = createWsReq(message, this, this.nserve.wsServer);
	var wsRes = createWsRes(message, this, this.nserve.wsServer);	
	this.nserve.wsServer.events.emit('newRequest', this.nserve.wsServer, wsReq, wsRes);	
};


function createWsReq(message, connection, wsServer) {
	var wsReq = {
		_source: 'websocket',
		_message: message,
		_connection: connection,
		_wsServer: wsServer,
		nserve: {}
	};
	return wsReq;
};


function createWsRes(message, connection, wsServer) {
	var wsRes = {
		_source: 'websocket',
		_message: message,
		_connection: connection,
		_wsServer: wsServer
	};
	wsRes.send = function() {		
		// remove the return code
		var parameters = [];
		for (var n in arguments) {
			parameters.push(arguments[n]);
		}
		if (typeof parameters[0] === 'number' && typeof parameters[1] !== 'undefined') {
			parameters.shift();
		}
		if (typeof parameters[1] === 'undefined') {
			parameters[1] = 'json';
		}
		sendWs.apply(wsRes._connection, parameters);
	};
	wsRes.end = wsRes.send;
	wsRes.json = wsRes.send;
	return wsRes;
};


function sendWs(data, format) { // connection scope needed!
	var sender = null;
	if (format !== 'binary') {
		if (format === 'json') {
			data = JSON.stringify(data);
		}
		sender = this.sendUTF(data);
	} else {
		sender = this.sendBinary(data);
	}
	return sender;
};

