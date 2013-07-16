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
    name: String,
    online: Boolean,
    contacts: [_schema]
  });

  var _model = mongoose.model('User', _schema);

  var _register = function(email, callback) {
    var u = new _model({ email: email });
    u.save(callback);
  };

  var _findByEmail = function(email, callback) {
    _model.findOne({email: email}, callback);
  };

  return {
    register : _register,
    schema : _schema,
    model : _model,
    findByEmail : _findByEmail
  };
}();

module.exports = User;
