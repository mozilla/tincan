var express = require('express'),
    routes = require('./routes'),
    socket = require('socket.io'),
    store = require('./store'),
    config = require('./config');

var app = module.exports = express.createServer();
var io = socket.listen(app);

// io.set('log level', 1); // reduce logging

// Configuration
app.configure(function(){
  app.set('view engine', 'jade');
  app.set('views', __dirname + '/views');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.logger('dev'));
  app.use(express.session({ secret: 'your secret here' }));
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);
// app.get('/call', routes.call);
app.post('/login', routes.login);
app.get('/logout', routes.logout);

function send_to_socket(id, args) {
  var to = io.sockets.socket(id);
  to.emit.apply(to, args);
}

/**
* This function is used to parse a variable value from a cookie string.
* @param {String} cookie_string The cookie to parse.
* @param {String} c_var The variable to extract from the cookie.
* @return {String} The value of the variable extracted.
*/
function getCookie(cookie_string, c_var) {
  if(cookie_string) {
    var i,x,y,ARRcookies=cookie_string.split(";");
    for (i=0;i<ARRcookies.length;i++) {
      x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
      y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
      x=x.replace(/^\s+|\s+$/g,"");
      if (x==c_var) {
        return unescape(y);
      }
    }
  }
  else {
    console.log("Invalid cookie");
    return "";
  }
}

io.sockets.on('connection', function(client) {
  var cookie = getCookie(client.manager.handshaken[client.id].headers.cookie, "connect.sid");
  store.mapSocketIDToCookie(client.id, cookie); //is this used?
  store.mapEmailToSocketID(store.getEmailFromCookie(cookie), client.id);

  client.on('disconnect', function() {
    store.mapSocketIDToCookie(client.id, null);
  });

  client.on('addContact', function(email) {
    io.sockets.socket(client.id).emit('contactAdded', email);
  });

  client.on('offer', function(email, offer) {
    var to_socket = store.getSocketIDFromEmail(email);
    var from_email = store.getEmailFromCookie(store.getCookieFromSocketID(client.id));
    send_to_socket(to_socket, ['offer', from_email, offer]);
  });

  client.on('answer', function(email, answer, offer) {
    var to_socket = store.getSocketIDFromEmail(email);
    var from_email = store.getEmailFromCookie(store.getCookieFromSocketID(client.id));
    send_to_socket(to_socket, ['answer', from_email, answer, offer]);
  });

  client.on('iceCandidate', function(email, cand) {
    var to_socket = store.getSocketIDFromEmail(email);
    var from_email = store.getEmailFromCookie(store.getCookieFromSocketID(client.id));
    send_to_socket(to_socket, ['iceCandidate', from_email, answer]);
  });
});

app.listen(config.port, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
