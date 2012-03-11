// export NODE_PATH="/usr/lib/node_modules/"
var connect = require('connect');

var app = connect()
  .use(connect.logger('dev'))
  .use(connect.directory('../'))
  .use(connect.static('../'))
 .listen(8080);
