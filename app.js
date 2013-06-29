var express = require('express'),
    routes = require('./routes'),
    socket = require('socket.io'),
    store = require('./store'),
    config = require('./config');

var app = module.exports = express.createServer();
var io = socket.listen(app);

io.set('log level', 1); // reduce logging

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

var first_pc = null;
var second_pc = null;

// //TODO: make this use apply
// function socketsend(id, message, obj) {
//   if(obj) {
//     if(first_pc == id) {
//       io.sockets.socket(second_pc).emit(message, obj);
//     }
//     else if(second_pc == id) {
//       io.sockets.socket(first_pc).emit(message, obj);
//     }
//   }
//   else {
//     if(first_pc == id) {
//       io.sockets.socket(second_pc).emit(message);
//     }
//     else if(second_pc == id) {
//       io.sockets.socket(first_pc).emit(message);
//     }
//   }
// }

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

  // if(!first_pc && !second_pc) first_pc = client.id;
  // else if(first_pc && !second_pc) {
  //   second_pc = client.id;
  //   client.broadcast.emit('OtherUserConnected', client.id);
  //   io.sockets.socket(client.id).emit('OtherUserConnected', first_pc);
  // }
  // else if(!first_pc && second_pc) {
  //   first_pc = second_pc;
  //   second_pc = client.id;
  //   client.broadcast.emit('OtherUserConnected', client.id);
  //   io.sockets.socket(client.id).emit('OtherUserConnected', first_pc);
  // }
  // else {
  //   console.log('too many clients');
  // }

  // io.sockets.socket(client.id).emit('YouConnected', client.id);

  client.on('disconnect', function() {
    store.mapSocketIDToCookie(client.id, null);
    // delete sessions[client.id]; // delete from sessions
    // if(first_pc == client.id) {
    //   first_pc = second_pc;
    //   second_pc = null;
    // }
    // else if(second_pc == client.id){
    //   second_pc = null;
    // }
  });

  client.on('addContact', function(email) {
    // if(!sessions[client.id]) {
    //   console.log('Not signed in!');
    // }
    // else if(contacts[sessions[client.id]]) {
    //   contacts[sessions[client.id]].push(email);
    // }
    // else {
    //   contacts[sessions[client.id]] = [email];
    // }
    io.sockets.socket(client.id).emit('contactAdded', email);
  });

  // client.on('call', function(email, offer) {
  //   var to_socket = store.getSocketIDFromEmail(email);
  //   var from_email = store.getEmailFromCookie(store.getCookieFromSocketID(client.id));
  //   send_to_socket(to_socket, ['incomingCall', from_email]);
  // });

  client.on('offer', function(email, offer) {
    var to_socket = store.getSocketIDFromEmail(email);
    var from_email = store.getEmailFromCookie(store.getCookieFromSocketID(client.id));
    send_to_socket(to_socket, ['offer', from_email, offer]);
  });

  client.on('answer', function(email, answer) {
    var to_socket = store.getSocketIDFromEmail(email);
    var from_email = store.getEmailFromCookie(store.getCookieFromSocketID(client.id));
    send_to_socket(to_socket, ['answer', from_email, answer]);
  });

  client.on('ice_in', function(email, cand) {
    var to_socket = store.getSocketIDFromEmail(email);
    var from_email = store.getEmailFromCookie(store.getCookieFromSocketID(client.id));
    send_to_socket(to_socket, ['ice_in', from_email, answer]);
  });

  client.on('ice_out', function(email, cand) {
    var to_socket = store.getSocketIDFromEmail(email);
    var from_email = store.getEmailFromCookie(store.getCookieFromSocketID(client.id));
    send_to_socket(to_socket, ['ice_out', from_email, answer]);
  });

  // client.on('sendIceCandidate1', function(obj) {
  //   socketsend(client.id, 'incomingIceCandidate1', obj);
  // });

  // client.on('sendIceCandidate2', function(obj) {
  //   socketsend(client.id, 'incomingIceCandidate2', obj);
  // });

  // client.on('sendAnswerDescription', function(obj) {
  //   socketsend(client.id, 'incomingAnswerDescription', obj);
  // });

  // client.on('IStoppedTransmitting', function() {
  //   socketsend(client.id, 'callerStoppedTransmitting');
  // });

  // client.on('IStoppedReceiving', function() {
  //   socketsend(client.id, 'calleeStoppedReceiving');
  // });

  // client.on('signout', function() {
  //   io.sockets.socket(client.id).emit('successfulSignout');
  // });
});

app.listen(config.port, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
