'use strict';

var http = require('http')
  , app = require('./app').create()
  ;

http.createServer(app).listen(8080, function () {
  console.log('started');
});
