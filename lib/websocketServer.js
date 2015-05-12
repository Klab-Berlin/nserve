var WebSocketServer = require('websocket').server;
var WebSocketClient = require('websocket').client;
var WebSocketFrame  = require('websocket').frame;
var WebSocketRouter = require('websocket').router;
var ids = require('nids');
var unifyrequest = require(__dirname + '/nserve.plugin.unifyrequest');
var EventEmitter = require('events').EventEmitter;
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
	wsServer.settings = serverOptions;
	wsServer.log = serverOptions.logger;
	wsServer.on(
		'request',
		handleRequest.bind(wsServer)
	);
	wsServer.getChannels = function(clientId) {
		for (var i=0; i<wsServer.connections.length; i+=1) {
			if (wsServer.connections[i].nserve.clientId === clientId) {
				return wsServer.connections[i].nserve.channels.get();
			}
		}
		return [];
	};
	wsServer.joinChannel =	function(clientId, channelName) {
		for (var i=0; i<wsServer.connections.length; i+=1) {
			if (wsServer.connections[i].nserve.clientId === clientId) {
				wsServer.connections[i].nserve.channels.join(channelName);
				return true;
			}
		}
		return false;
	};
	wsServer.leaveChannel =function(clientId, channelName) {
		for (var i=0; i<wsServer.connections.length; i+=1) {
			if (wsServer.connections[i].nserve.clientId === clientId) {
				wsServer.connections[i].nserve.channels.leave(channelName);
				return true;
			}
		}
		return false;
	};
	wsServer.sendMessageToChannel = function(channelName, message) {
		var data = JSON.stringify(message);
		var count = 0;
		for (var i=0; i<wsServer.connections.length; i+=1) {
			if (wsServer.connections[i].nserve.channels.isMemberOf(channelName) === true) {
				wsServer.connections[i].sendUTF(data);
				count+=1;
			}
		}
		return count;
	};
	wsServer.events = serverOptions.emitter;
	wsServer.log('MOUNTED WS', 'green', 'wsServer.listen', 1);
	return wsServer;
};


function Channels() {
	this._list = {};
};
Channels.prototype.join = function(name) {
	this._list[name] = true;
	return this._list;
};
Channels.prototype.leave = function(name) {
	delete this._list[name];
	return this._list;
};
Channels.prototype.isMemberOf = function(name) {
	return (typeof this._list[name] !== 'undefined');
};
Channels.prototype.get = function() {
	return (Object.keys(this._list));
};


function handleRequest(request) {  // wsServer scope
	request.nserve = {};
	// DEBUG
	// log.njson(request, 'nservewsreq');
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
	var connection = request.accept(this.settings.protocol, request.origin, []); // request.cookies
	connection.id = ids.ConnectionId.create();
	connection.originalRequest = request;
	connection.nserve = {};
	connection.nserve.wsServer = this;
	connection.nserve.clientId = request.nserve.clientId;
	connection.nserve.channels = new Channels();
	// log.njson(connection, 'nservewscon');
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
		// console.log('--> end');
	},
	write: function(data) {
		// console.log('--> write');
	},
	setHeaders: function(data) {
		// console.log('--> setHeaders');
	}
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
		emitter: new EventEmitter(),
		protocol: 'nprotocol'
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
		// console.log('+++ sent utf8 ' + data.length);
	} else {
		sender = this.sendBinary(data);
	}
	return sender;
};

