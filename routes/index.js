var request = require('request');
var config = require('../config');

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
          email: req.session.email });
  }
};

exports.logout = function(req, res) {
  req.session.destroy();
  req.session = null;
  res.redirect('/');
};

exports.login = function(req, res) {
  // console.log(req);
  request.post(
      config.persona_verifier_uri, {
        form: {
          assertion: req.body.assertion,
          audience: config.host + ':' + config.port
        }
      },
      function (error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log(body);
          body = JSON.parse(body);
          var status = body.status;
          if(status === 'failure') {
            res.send(status);
          }
          req.session.email = body.email;
          res.send(status);
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
