var request = require('request');
var config = require('../config');
var store = require('../store');

/**
 * GET /
 * @param  {Object}     req request object
 * @param  {Object}     res response object
 * @return {undefined}      undefined
 */
exports.index = function(req, res){
  var uri = config.persona_uri;
  var email = req.session.email;
  if(!email) {
    res.render('index', { title: config.title, persona_uri: uri });
  }
  else {
    res.render('call', { title: config.title, persona_uri: uri, email: email, server: config.host + ":" + config.port });
  }
};

/**
 * GET /logout
 * @param  {Object}     req request object
 * @param  {Object}     res response object
 * @return {undefined}      undefined
 */
exports.logout = function(req, res) {
  req.session.destroy();
  req.session = null;
  res.cookie('id', null); //clear cookie
  res.redirect('/');
};

/**
 * POST /login
 * @param  {Object}     req request object
 * @param  {Object}     res response object
 * @return {undefined}      undefined
 */
exports.login = function(req, res) {
  request.post(
    config.persona_verifier_uri, {
      form: {
        assertion: req.body.assertion,
        audience: config.domain || config.host + ':' + config.port
      }
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        body = JSON.parse(body);
        var status = body.status;
        if(status === 'failure') {
          res.send(status);
        }
        else {
          req.session.email = body.email; // store email
          store.mapCookieToEmail(req.sessionID, body.email);
          res.send(status);
        }
      }
      else {
        console.log(error); console.log(response);
      }
    }
  );
};
