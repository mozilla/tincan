var User = function() {
  var mongoose = require('mongoose');

  var _schema = mongoose.Schema({
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true
    },
    name: {
      type: String,
      "default": "",
      trim: true
    },
    online: {
      type: Boolean,
      "default": false
    },
    contacts: [_schema]
  });

  var _model = mongoose.model('User', _schema);

  var _findByEmail = function(email, callback) {
    _model.findOne({email: email}, callback);
  };

  var _create = function(email, callback) {
    u = new _model({ email: email });
    u.save(callback);
  };

  var _getOrCreate = function(email, callback) {
    _findByEmail(email, function(err, u1) {
      if(u1) {
        callback(err, u1.id);
      }
      else {
        _create(email, function(err, u2) {
          if(u2) {
            callback(err, u2.id);
          }
          else {
            callback(err, null);
          }
        });
      }
    });
  };

  var _addContact = function(user_email, contact_email, callback) {
    _findByEmail(user_email, function(err, u) {
      if(u) {
        u.contacts.push();
        u.save(callback);
      }
      else if(err) {
        console.log('Error adding contact. Could not find user: ' + user_email);
      }
    });
  };

  var _login = function(email, callback) {
    _findByEmail(email, function(err, u) {
      if(err) console.log("User login failed: " + err);
      else if(!err && !u) {
        console.log("Creating user: " + email);
        _create(email, function(err, u) {
          u.online = true;
          callback(err, u);
        });
      }
      else {
        console.log("User already created. Setting user online: " + email);
        u.online = true;
        callback(err, u);
      }
    });
  };

  return {
    create : _create,
    login: _login,
    addContact: _addContact,
    schema : _schema,
    model : _model,
    findByEmail : _findByEmail
  };
}();

module.exports = User;
