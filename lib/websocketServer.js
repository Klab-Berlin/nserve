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
var Lg = require('lg');
var log = new Lg({log2console:true, logLevel:1});

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
	wsServer.log('MOUNTED WS', 'green', 'wsServer.listen', 1);
	return wsServer;
};


function handleRequest(request) {  // wsServer scope
	// DEBUG
	console.log('************************************************');
	// console.log(request);
	log.njson(request, 'nservewsreq');
	console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
	if (
		originIsAllowed.apply(this, [ request ]) !== true
	) {
		// Make sure we only accept requests from an allowed origin
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
	log.njson(connection, 'nservewscon');
	// try {
	// } catch(err) {
		// console.trace(err);
	// }
	// console.log(connection);
	var now = Date.now();
	// -----[[[ building compatibility with the whole http api handling 
	// connection.request = request.webSocketRequest;
	// connection.request.protocol = 'nprotocol';
	// connection.request.connection = connection;
	// connection.headers = request.webSocketRequest.httpRequest.headers;
	// connection.cookies = request.webSocketRequest.cookies;
	// connection.request.headers = connection.headers;
	// connection.request.cookies = connection.cookies;
	// connection.clientId = request.resourceURL.query.clientId;
	// connection.log = this.log;
	this.log(
		'connection accepted from origin {' 
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
		logger: console.log
	};
	return settings;
};

function originIsAllowed(request) {
	// put logic here to detect whether the specified origin is allowed.
	if (typeof request.resourceURL.query.clientId !== 'string') {
		return false;
	}
	return true;
};	



function handleClose(reasonCode, description) { // connection scope
	this.log(
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
	// todo: message.id needs to be middleware
	// if (typeof message.id === 'undefined') {
		// message.id = vws.plugins.api.makeRequestId();
	// }
	this.lastMessageTimestamp = Date.now();
	if (message.type === 'utf8') {
		this.log(
			'received MESSAGE '
				+ ' [' + message.id + '] in UTF8 {' 
				+ message.utf8Data.length 
				+ 'bytes} from [' 
				+ this.clientId 
				+ '@' + this.thisId 
				+ ']', 
			'green', 
			'wsServer.listen.message',
			1
		);
	}
	else if (message.type === 'binary') {
		this.log(
			'received MESSAGE '
				+ ' [' + message.id + '] in BINARY {' 
				+ message.binaryData.length 
				+ 'bytes} from [' 
				+ this.clientId 
				+ '@' + this.thisId 
				+ ']'
				+ ' ' + message.id, 
			'green', 
			'wsServer.listen.message',
			1
		);
	}
};


