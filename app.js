var express = require('express'),
    routes = require('./routes'),
    socket = require('socket.io');

var app = module.exports = express.createServer();
var io = socket.listen(app);

io.set('log level', 1); // reduce logging

var sessions = {};
var contacts = {}; // { email : [email1, email2, ...] }

// var BROWSERID_URL = "https://login.persona.org";
var BROWSERID_URL = "http://127.0.0.1:10002";

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
app.get('/call', routes.call);
app.post('/login', routes.login);

var first_pc = null;
var second_pc = null;

//TODO: make this use apply
function socketsend(id, message, obj) {
  if(obj) {
    if(first_pc == id) {
      io.sockets.socket(second_pc).emit(message, obj);
    }
    else if(second_pc == id) {
      io.sockets.socket(first_pc).emit(message, obj);
    }
  }
  else {
    if(first_pc == id) {
      io.sockets.socket(second_pc).emit(message);
    }
    else if(second_pc == id) {
      io.sockets.socket(first_pc).emit(message);
    }
  }
}

io.sockets.on('connection', function(client) {

  if(!first_pc && !second_pc) first_pc = client.id;
  else if(first_pc && !second_pc) {
    second_pc = client.id;
    client.broadcast.emit('OtherUserConnected', client.id);
    io.sockets.socket(client.id).emit('OtherUserConnected', first_pc);
  }
  else if(!first_pc && second_pc) {
    first_pc = second_pc;
    second_pc = client.id;
    client.broadcast.emit('OtherUserConnected', client.id);
    io.sockets.socket(client.id).emit('OtherUserConnected', first_pc);
  }
  else {
    console.log('too many clients');
  }

  io.sockets.socket(client.id).emit('YouConnected', client.id);

  client.on('disconnect', function() {
    delete sessions[client.id]; // delete from sessions
    if(first_pc == client.id) {
      first_pc = second_pc;
      second_pc = null;
    }
    else if(second_pc == client.id){
      second_pc = null;
    }
  });

  client.on('addContact', function(email) {
    if(!sessions[client.id]) {
      console.log('Not signed in!');
    }
    else if(contacts[sessions[client.id]]) {
      contacts[sessions[client.id]].push(email);
    }
    else {
      contacts[sessions[client.id]] = [email];
    }
    io.sockets.socket(client.id).emit('contactAdded', email);
  });

  client.on('offer', function(){
    socketsend(client.id, 'offerComingThru');
  });

  client.on('sendOfferDescription', function(obj) {
    socketsend(client.id, 'incomingOfferDescription', obj);
  });

  client.on('sendIceCandidate1', function(obj) {
    socketsend(client.id, 'incomingIceCandidate1', obj);
  });

  client.on('sendIceCandidate2', function(obj) {
    socketsend(client.id, 'incomingIceCandidate2', obj);
  });

  client.on('sendAnswerDescription', function(obj) {
    socketsend(client.id, 'incomingAnswerDescription', obj);
  });

  client.on('IStoppedTransmitting', function() {
    socketsend(client.id, 'callerStoppedTransmitting');
  });

  client.on('IStoppedReceiving', function() {
    socketsend(client.id, 'calleeStoppedReceiving');
  });

  client.on('signout', function() {
    io.sockets.socket(client.id).emit('successfulSignout');
  });
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
