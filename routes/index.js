var request = require('request');
var config = require('../config');
var store = require('../store');

exports.call = function(req, res){
  if(!req.session.email) {
    res.render('index', { title: 'WebRTC and Persona' });
  }
  else {
    res.render('call', { title: 'WebRTC and Persona', email: req.session.email });
  }
};

exports.index = function(req, res){
  if(!req.session.email) {
    res.render('index',
        { title: 'WebRTC and Persona',
          persona_uri: config.persona_uri });
  }
  else {
    res.render('call',
      { title: 'WebRTC and Persona',
        persona_uri: config.persona_uri,
        email: req.session.email
      });
  }
};

exports.logout = function(req, res) {
  req.session.destroy();
  req.session = null;
  res.cookie('id', null); //clear cookie
  res.redirect('/');
};

exports.login = function(req, res) {
  request.post(
    config.persona_verifier_uri, {
      form: {
        assertion: req.body.assertion,
        audience: config.host + ':' + config.port
      }
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        // console.log(body);
        body = JSON.parse(body);
        var status = body.status;
        if(status === 'failure') {
          res.send(status);
        }
        else {
          // sessions[body.email] = req.sessionID;
          req.session.email = body.email;
          // console.log(req.sessionID);
          store.mapCookieToEmail(req.sessionID, body.email);
          // res.cookie('id', req.sessionID);
          res.send(status);
        }

        // sessions[client.id] = email; // set socket to email
        // io.sockets.socket(client.id).emit('successfulSignin', email);
        // io.sockets.socket(client.id).emit('allContacts', contacts[email] || []);
      }
      else {
        console.log(error);
        console.log(response);
      }
    }
  );
};
