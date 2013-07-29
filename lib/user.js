var User = function() {
  var mongoose = require('mongoose');
  var relationship = require('./relationship');

  var _schema = new mongoose.Schema({
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
    contacts: {
      type: [mongoose.Schema.ObjectId],
      ref: 'User'
    }
  });

  var _model = mongoose.model('User', _schema);

  var _findByEmail = function(email, callback) {
    _model.findOne({email: email}, callback);
  };

  var _getContacts = function(email, callback) {
    _model.findOne({email: email})
    .populate('contacts')
    .exec(function(err, user) {
      if(!err) callback(null, user.contacts);
      else callback(err, null);
    });
  };

  var _create = function(email, callback) {
    u = new _model({ email: email });
    u.save(callback);
  };

  /**
   * Gets or Creates a user and returns its ObjectId
   * @param  {String}   email    email of the user to get or create
   * @param  {Function} callback callback function(err, uid)
   * @return {undefined}         undefined
   */
  var _getOrCreate = function(email, callback) {
    _findByEmail(email, function(err, u1) {
      if(u1) {
        callback(err, u1._id);
      }
      else {
        _create(email, function(err, u2) {
          if(u2) {
            callback(err, u2._id);
          }
          else {
            callback(err, null);
          }
        });
      }
    });
  };

  var _addContact = function(user_email, contact_email, callback) {
    _getOrCreate(contact_email, function(err, uid) {
      _model.update({ email: user_email },
        { $addToSet: { contacts: uid } }, callback); // add to set, ensures no dupes
    });
  };

  var _hasContact = function(user_email, contact_email, callback) {
    _findByEmail(user_email, function(err, u1) {
      _findByEmail(contact_email, function(err, u2) {
        if(err || !u2 || !u1) callback(err, false);
        else if(u1.contacts.indexOf(u2._id) != -1) {
          callback(null, true);
        }
        else {
          callback(null, false);
        }
      });
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
    getContacts: _getContacts,
    findByEmail : _findByEmail,
    hasContact : _hasContact,
    schema : _schema,
    model : _model
  };
}();

module.exports = User;
