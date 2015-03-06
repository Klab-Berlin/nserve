
codeTest = {
	config: {
		server: '127.0.0.1:8080',
		clientId: '1391787352270T09x2PatW8ua-tst'
	},
	nickName: 'person1',
	channel: 'defaultChannel',
	client: null
};

jQuery(document).ready(init);


function init() {
	jQuery('#send').on(
		'click',
		function() {
			send(jQuery('#url').val(),jQuery('#content').val());
		}
	);
	jQuery('#connect').on(
		'click',
		function(e) {
			if (typeof codeTest.client !== null) {
				delete codeTest.client;
			}
			codeTest.config.server = jQuery('#serverUrl').val();
			codeTest.client = setupSocket();
		}
	);
	jQuery('#closeWS').on(
		'click',
		function(e) {
			if (typeof codeTest.client !== null) {
				delete codeTest.client;
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
	jQuery('#content').text(JSON.stringify(demoReq));
	drawMessage('system', { text: 'welcome to the test', timestamp: new Date().toLocaleTimeString() });
};


function send(url, data) {
	drawMessage('user', { url:url, text: data.text, timestamp: new Date().toLocaleTimeString() });
	return send2server(url, data);
};


function send2server(url, data) {
	data.clientId = codeTest.config.clientId;
	if (codeTest.client === null) {
		jQuery.ajax(
			{
				type:'POST',
				dataType:'json',
				url: url,
				data:data,
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
	return codeTest.client.send(
		{
			command: command,
			data: [
				{
					author: codeTest.nickName,
					channel: codeTest.channel,
					text: data.text
				}
			]
		}
	);
};


function handleMessageFromServer(msg) {
	console.log(msg);
	drawMessage('server', msg);
};



function drawMessage(origin, data) {
	var msgString = '<span>{ ---[' + origin + ']--- ' + '@' + Date.now() + '  ----- }</span></br><pre>' + JSON.stringify(data) + '</pre><br/>';
	jQuery('#messages').append(msgString);
};


function setupSocket() {
	try {
		var testSocket = new Socket(codeTest.config.server, { autoReconnect: true });
		testSocket.on('reconnect', function(msg, e) {
			console.log('reconnected');
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
			jQuery('#wsstatus').text(Date.now() + ' connection open');
			console.log('[open]');
			testSocket.on('message', function(msg, e) {
				console.log('[message]');
				console.log(msg);
				handleMessageFromServer(msg);
			});
		});
		jQuery('#wsstatus').text(Date.now() + ' connecting to [' + codeTest.config.server + ']');
	} catch(err) {
		jQuery('#wsstatus').text(Date.now() + ' connection failed: ' + err);
	}
	return testSocket;
};

