/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    socket = require('socket.io'),
    request = require('request');

var app = module.exports = express.createServer();
var io = socket.listen(app);

io.set('log level', 1); // reduce logging

var BROWSERID_URL = "http://127.0.0.1:10002";
var BROWSERID_VERIFY_URL = "http://127.0.0.1:10000/verify";

// Configuration
app.configure(function(){
  app.set('view engine', 'html');
  app.set('views', __dirname + '/views');
  app.set("view options", {layout: false});

  // make a custom html template
  app.register('.html', {
    compile: function(str, options){
      return function(locals){
        return str;
      };
    }
  });

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

var first_pc = null;
var second_pc = null;
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
    console.log('disconnecting');
    if(first_pc == client.id) {
      first_pc = second_pc;
      second_pc = null;
    }
    else if(second_pc == client.id){
      second_pc = null;
    }
  });

  client.on('offer', function(){
    if(first_pc == client.id) {
      io.sockets.socket(second_pc).emit('offerComingThru');
    }
    else if(second_pc == client.id){
      io.sockets.socket(first_pc).emit('offerComingThru');
    }
  });

  client.on('sendOfferDescription', function(obj) {
    if(first_pc == client.id) {
      io.sockets.socket(second_pc).emit('incomingOfferDescription', obj);
    }
    else if(second_pc == client.id){
      io.sockets.socket(first_pc).emit('incomingOfferDescription', obj);
    }
  });

  client.on('sendIceCandidate1', function(obj) {
    if(first_pc == client.id) {
      io.sockets.socket(second_pc).emit('incomingIceCandidate1', obj);
    }
    else if(second_pc == client.id){
      io.sockets.socket(first_pc).emit('incomingIceCandidate1', obj);
    }
  });

  client.on('sendIceCandidate2', function(obj) {
    if(first_pc == client.id) {
      io.sockets.socket(second_pc).emit('incomingIceCandidate2', obj);
    }
    else if(second_pc == client.id){
      io.sockets.socket(first_pc).emit('incomingIceCandidate2', obj);
    }
  });

  client.on('sendAnswerDescription', function(obj) {
    if(first_pc == client.id) {
      io.sockets.socket(second_pc).emit('incomingAnswerDescription', obj);
    }
    else if(second_pc == client.id){
      io.sockets.socket(first_pc).emit('incomingAnswerDescription', obj);
    }
  });

  client.on('IStoppedTransmitting', function() {
    if(first_pc == client.id) {
      io.sockets.socket(second_pc).emit('callerStoppedTransmitting');
    }
    else if(second_pc == client.id){
      io.sockets.socket(first_pc).emit('callerStoppedTransmitting');
    }
  });

  client.on('IStoppedReceiving', function() {
    if(first_pc == client.id) {
      io.sockets.socket(second_pc).emit('calleeStoppedReceiving');
    }
    else if(second_pc == client.id){
      io.sockets.socket(first_pc).emit('calleeStoppedReceiving');
    }
  });

  client.on('signin', function(obj) {
    var assertion = obj.assertion;
    request.post(
      BROWSERID_VERIFY_URL,
        { form: {
            assertion: assertion,
            audience: "http://localhost:3000"
          }
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
              console.log(body);
              io.sockets.socket(client.id).emit('successfulSignin', JSON.parse(body).email);
            }
            else {
              console.log(error);
              console.log(response);
            }
        }
    );
  });

  client.on('signout', function() {
    io.sockets.socket(client.id).emit('successfulSignout');
  });
});

app.listen(process.env.PORT || 3000, function() {
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
