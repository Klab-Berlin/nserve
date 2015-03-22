
nserveWeb = {
	config: {
		server: document.location.host,
		clientId: 'cid1426859972031fjv1omdt58ccxfdt',
		ssl: false,
		protocol: 'nprotocol'
	},
	nickName: 'person1',
	channel: 'defaultChannel',
	client: null
};

jQuery(document).ready(init);


function init() {
	jQuery('#serverUrl').val(nserveWeb.config.server);
	jQuery('#send').on(
		'click',
		function() {
			send(jQuery('#url').val(),nserveWeb.editor.getValue());
		}
	);
	jQuery('#connect').on(
		'click',
		function(e) {
			if (typeof nserveWeb.client !== null) {
				delete nserveWeb.client;
				nserveWeb.client = null;
			}
			nserveWeb.config.server = jQuery('#serverUrl').val();
			nserveWeb.client = setupSocket();
		}
	);
	jQuery('#closeWS').on(
		'click',
		function(e) {
			if (typeof nserveWeb.client !== null) {
				delete nserveWeb.client;
			}
			jQuery('#wsstatus').text(Date.now() + ' socket destroyed');
		}
	);
	var demoReq = {
		resourceVersion: '1.0.0',
		resource: 'users',
		method: 'GET',
		specifier: 'byEmail',
		document: {
      email: 'i@itsatony.com'
    }
	};
	jQuery('#content').text(JSON.stringify(demoReq, null, '  '));
	drawMessage('system', { text: 'welcome to the test', timestamp: new Date().toLocaleTimeString() });
	
	nserveWeb.answer = ace.edit("content2");
	nserveWeb.answer.setTheme("ace/theme/monokai");
	nserveWeb.answer.getSession().setMode("ace/mode/javascript");
	nserveWeb.answer.setReadOnly(true);
	nserveWeb.editor = ace.edit("content");
	nserveWeb.editor.setTheme("ace/theme/monokai");
	nserveWeb.editor.getSession().setMode("ace/mode/javascript");
	nserveWeb.editor.focus();
	
};


function send(url, data) {
	drawMessage('user', { url:url, text: data.text, timestamp: new Date().toLocaleTimeString() });
	return send2server(url, data);
};


function send2server(url, data) {
	data.clientId = nserveWeb.config.clientId;
	if (nserveWeb.client === null) {
		jQuery.ajax(
			{
				type:'POST',
				dataType:'json',
				url: url,
				data: data,
				headers: {
					'content-type': 'application/json;charset=UTF-8'
				},
				success: function(msg) {
					handleMessageFromServer(msg);
					if (typeof msg.results === 'object' && typeof msg.results[0].data[0].access_token === 'string') {
						window.accessToken = msg.results[0].data[0].access_token
					}
				}
			}
		);
		return;
	}
	return nserveWeb.client.send(
		url, JSON.parse(data)
	);
};


function handleMessageFromServer(msg) {
	drawMessage('server', msg);
	nserveWeb.answer.setValue(JSON.stringify(msg, null, '  '));
};


function now() {
	var d = new Date().toLocaleString(); 
	return d;
};


function drawMessage(origin, data) {	
	var msgString = '<span>{ ---[' + origin + ']--- ' + '@' + now() + '  ----- }</span></br><pre>' + JSON.stringify(data) + '</pre>';
	jQuery('#messages').append(msgString);
};


function setupSocket() {
	try {
		var testSocket = new Socket(
			{
				url: nserveWeb.config.server.split(':')[0],
				port: nserveWeb.config.server.split(':')[1],
				parameters: 'clientId=' + nserveWeb.config.clientId, //( + '&connectionId=' + this.socketConnectionId,
				protocol: nserveWeb.config.protocol,
				ssl: nserveWeb.config.ssl
			},
			{ autoReconnect: true }
		);
		testSocket.on('reconnect', function(msg, e) {
			console.log('reconnected');
			jQuery('#wsstatus').text(Date.now() + ' connection (re)open');
		});
		testSocket.on('close', function(e) {
			console.log('[close]');
			jQuery('#wsstatus').text(Date.now() + ' connection closed');
		});
		testSocket.on('error', function(e) {
			console.log('[error]');
			jQuery('#wsstatus').text(Date.now() + ' connection error');
		});
		testSocket.on('open', function(e) {
			console.log('[open]');
			jQuery('#wsstatus').text(Date.now() + ' connection open');
			testSocket.id = '1337socket';
		});		
		testSocket.on('message', function(msg, e) {
			console.log('[message]');
			handleMessageFromServer(msg);
		});
		jQuery('#wsstatus').text(Date.now() + ' connecting to [' + nserveWeb.config.server + ']');
	} catch(err) {
		jQuery('#wsstatus').text(Date.now() + ' connection failed: ' + err);
	}
	return testSocket;
};

