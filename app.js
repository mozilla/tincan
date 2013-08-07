var express = require('express'),
    routes = require('./routes'),
    socketio = require('socket.io'),
    config = require('./config'),
    store = new express.session.MemoryStore;

var app = module.exports = express.createServer();
var io = socketio.listen(app);

io.set('log level', 1); // reduce logging

// Configuration
app.configure(function(){
  app.set('view engine', 'jade');
  app.set('view options', {pretty:true});
  app.set('views', __dirname + '/views');
  app.set('view options', {pretty: true});
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.logger('dev'));
  app.use(express.session({ store: store, secret: config.secretsauce }));
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

io.sockets.on('connection', function(socket) {
  var cookie = getCookie(socket.manager.handshaken[socket.id].headers.cookie, "connect.sid");
  store.get(cookie, function(err, sess) {
    if(err) {
      console.log("Error: " + err);
    }
    else if(!sess) {
      return;
    }
    else {
      // socket joins room based on email
      var email = sess.email;
      socket.join(email);
      console.log('socket ' + socket.id + " joined room: " + email);
    }
  });

  socket.on('disconnect', function() {
    // we don't keep track of what calls are ongoing
    // so we cannot ad hoc alert the other party that they are leaving
  });

  socket.on('offer', function(email, offer) {
    var cookie = getCookie(socket.manager.handshaken[socket.id].headers.cookie, "connect.sid");
    store.get(cookie, function(err, sess) {
      if(err) {
        console.log("Error: " + err);
      }
      else {
        var from_email = sess.email;
        io.sockets.in(email).emit('offer', from_email, offer);
        console.log('sending offer from ' + from_email + " to " + email);
      }
    });
  });

  socket.on('endCall', function(email) {
    var cookie = getCookie(socket.manager.handshaken[socket.id].headers.cookie, "connect.sid");
    store.get(cookie, function(err, sess) {
      if(err) {
        console.log("Error: " + err);
      }
      else {
        var from_email = sess.email;
        io.sockets.in(email).emit('endCall', from_email);
        console.log('endCall from ' + from_email + " to " + email);
      }
    });
  });

  socket.on('answer', function(email, answer, offer) {
    var cookie = getCookie(socket.manager.handshaken[socket.id].headers.cookie, "connect.sid");
    store.get(cookie, function(err, sess) {
      if(err) {
        console.log("Error: " + err);
      }
      else {
        var from_email = sess.email;
        io.sockets.in(email).emit('answer', from_email, answer, offer);
        console.log('sending answer from ' + from_email + " to " + email);
      }
    });
  });

  socket.on('iceCandidate', function(email, cand) {
    var cookie = getCookie(socket.manager.handshaken[socket.id].headers.cookie, "connect.sid");
    store.get(cookie, function(err, sess) {
      if(err) {
        console.log("Error: " + err);
      }
      else {
        var from_email = sess.email;
        io.sockets.in(email).emit('iceCandidate', from_email, cand);
      }
    });
  });
});

app.listen(config.port, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
