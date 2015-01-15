var nserve = require('../lib/nserve');
var bodyParser = require('body-parser');
var responseTime = require('response-time');
var compression  = require('compression');
var Qs  = require('qs');
var middleWare = [
	compression(), 
	responseTime(),
	bodyParser.urlencoded({ extended: false }),
	bodyParser.json(),
	function(req, res, next) {
		req.query = Qs.parse(req.url.split('?')[1]);
		console.log('----------------------!!!!!************************');
		next();
	}
];

server = nserve.listen({host: 'itsatony.com'}); 

console.log('############# init');
console.log(server);
console.log('--------------------');
server.router.all(
	'/api',
	middleWare,
	function(req, res, next) {
		req.handled = true;
		console.log('############# /api [body]');
		console.log(req.body);
		console.log('--------------------');
		console.log('############# /api [query]');
		console.log(req.query);
		console.log('--------------------');
		res.json(200, {done: 'true'});
		next();
	}
);


