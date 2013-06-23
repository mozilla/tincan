var request = require('request');
// var BROWSERID_VERIFY_URL = "https://verifier.login.persona.org/verify";
var BROWSERID_VERIFY_URL = "http://127.0.0.1:10000/verify";

exports.call = function(req, res){
  if(!req.session.email) {
    res.render('index', { title: 'WebRTC and Persona', email: null });
  }
  else {
    res.render('call', { title: 'WebRTC and Persona', email: req.session.email });
  }
};

exports.index = function(req, res){
  if(!req.session.email) {
    console.log('no email');
    res.render('index', { title: 'WebRTC and Persona', email: null });
  }
  else {
    console.log('redirecting...');
    res.redirect('/call');
  }
};

exports.login = function(req, res) {
  // console.log(req);
  request.post(
      BROWSERID_VERIFY_URL, {
        form: {
          assertion: req.body.assertion,
          audience: "http://localhost:3000"
        }
      },
      function (error, response, body) {
        if (!error && response.statusCode == 200) {
          // console.log(body);
          var email = JSON.parse(body).email;
          req.session.email = email;
          res.send(JSON.stringify({location:"/call"}));
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
