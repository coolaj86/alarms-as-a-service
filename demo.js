var http = require('http')
  , app = require('./app')
  ;

http.createServer(app).listen(8080, function () {
  console.log('started');
});
