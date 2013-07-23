var Relationship = function() {
  var mongoose = require('mongoose');

  const _STATUS_PENDING = 0;
  const _STATUS_ACCEPTED = 1;
  const _STATUS_DENIED = -1;

  var _schema = new mongoose.Schema({
    initiator: {
      type: mongoose.Schema.ObjectId,
      required: true
    },

    recipient: {
      type: mongoose.Schema.ObjectId,
      required: true
    },

    status: {
      type: Number,
      "default" : _STATUS_PENDING,
      required : true
    }
  });

  var _model = mongoose.model('Relationship', _schema);

  return {
    schema : _schema,
    model : _model,
    STATUS_PENDING : _STATUS_PENDING,
    STATUS_ACCEPTED : _STATUS_ACCEPTED,
    STATUS_DENIED : _STATUS_DENIED
  };
}();

module.exports = Relationship;

