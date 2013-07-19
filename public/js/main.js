performance.now = performance.now || performance.webkitNow; // hack added by SD!

var localstream; //the stream of audio/video coming from this browser
var debug = true; // true to log messages

var pc = new RTCPeerConnection(null);

window.onbeforeunload = function() {

};

if(navigator.id) {
  navigator.id.watch({
    onlogin: function() {
      //we don't handle login on this page
    },
    onlogout: function() {
      window.location = "/logout";
    }
  });
}

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] == '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function logout() {
  navigator.id.logout();
}

function getMedia(callback, args) {
  navigator.getUserMedia(
    { audio:true, video:true },
    function onStream(stream) {
      gotLocalStream(stream);
      args = args ? args : [];
      //run the callback with args
      if(callback) callback.apply(callback, args);
    },
    function failure(error) {
      alert('Error: To call you need to allow video and/or mic');
      trace('Failed to get stream: ' + error);
    }
  );
}

function start() {
  getMedia();
}

/**
 * On the add of a contact
 * @param  {Event} e    event fired
 * @return {undefined}  undefined
 */
submitcontact.onsubmit = function(e) {
  e.preventDefault();
  e.stopPropagation();
  var contactemail = document.getElementById('contactemail');
  contactemail.checkValidity();
  if(contactemail.validity.valid && contactemail.value !== "") {
    // callEmail(contactemail.value);
    addContact(contactemail.value);
    contactemail.value = "";
  }
};

function addContact(email) {
  socket.emit('addContact', email);
}

function callEmail(email) {
  if(!localstream) {
    getMedia(callEmail, [email]);
  }
  else {
    // temporary hacks to cope with API change
    if (!!localstream.videoTracks && !localstream.getVideoTracks) {
      localstream.getVideoTracks = function(){
        return this.videoTracks;
      };
    }
    if (!!localstream.audioTracks && !localstream.getAudioTracks) {
      localstream.getAudioTracks = function() {
        return this.audioTracks;
      };
    }

    pc.onaddstream = gotRemoteStream;

    pc.onicecandidate = function(event) {
      if (event.candidate) {
        socket.emit('iceCandidate', email, event.candidate);
      }
    };

    if(debug) trace("Adding Local Stream to peer connection");
    var options = null;
    pc.createOffer(
      function (offer) {
        pc.setLocalDescription(new RTCSessionDescription(offer));
        if(debug) trace("Offer from outgoing \n" + offer.sdp);
        socket.emit('offer', email, offer);
      },
      function() { console.log('offer failed'); }, options);
  }
}

function gotRemoteStream(e) {
  if(debug) trace(e.stream);
  incomingvid.src = window.URL.createObjectURL(e.stream);
  $('#incomingvid').removeClass('hidden');
}

function gotLocalStream(stream) {
  pc.addStream(stream);
  outgoingvid.src = window.URL.createObjectURL(stream); // add preview
  localstream = stream;
  $('#outgoingvid').removeClass('hidden');
}

function sendAnswerFromOffer(offer, email) {
  pc.setRemoteDescription(new RTCSessionDescription(offer), function() {
    pc.createAnswer(function(ans) {
      pc.setLocalDescription(new RTCSessionDescription(ans));
      socket.emit('answer', email, ans);
    }, null, null);
  }, function(){
    if(debug) trace('offer FAILED set as remote description');
  });
}

socket.on('offer', function(email, offer) {
  if(confirm("Incoming call from " + email + "! Answer?")) {

    pc.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit('iceCandidate', email, event.candidate);
      }
    };

    pc.onaddstream = gotRemoteStream;

    if(!localstream) {
      getMedia(sendAnswerFromOffer, [offer, email]);
    }
    else {
      sendAnswerFromOffer(offer, email);
    }
  }
  else {
    trace("Call denied");
  }
});

socket.on('allContacts', function(arr) {
  for(var i =  0; i < arr.length; i++) {
    document.getElementById('emails').innerHTML += "<div class='clickable contactemail'>" + arr[i] + "</div>";
  }
});

socket.on('contactAdded', function(email) {
  var c = new Contact({email : email});
  Contacts.add(c);
});

socket.on('answer', function(email, answer) {
  trace('Got answer: ' + answer.sdp);
  pc.setRemoteDescription(new RTCSessionDescription(answer),
    function(e) {console.log(e);},
    function() {
      if(debug) trace('answer FAILED set as remote description');
    }
  );
});

socket.on('iceCandidate', function(email, cand) {
  pc.addIceCandidate(new RTCIceCandidate(cand));
});

//start();

/**
 * Backbone.js Models and Views
 */

var Contact = Backbone.Model.extend({
  defaults: {
    email : "example@example.com",
    name: "First Last",
    status: "Pending...",
    fav: false
  },

  toTableArray : function() {
    attrs = this.attributes;
    return [attrs.email, attrs.name, attrs.status, attrs.fav];
  },

  callContact : function(obj) {
    obj.modal.showModal(this.get('email'));
  }
});

var ContactList = Backbone.Collection.extend({
  model: Contact
});

var Contacts = new ContactList();

var CallModalView = Backbone.View.extend({

  tagName: "div",

  showModal: function(email) {
    $("#modalEmail").html(email); // set modal text to display email
    $('#callModal').modal('show'); // show the email
  }
});

var ContactView = Backbone.View.extend({

  tagName: "tr",

  events: {
    'click td':  'call'
  },

  template: _.template($('#contact-template').html()),

  initialize: function() {
    this.listenTo(this.model, 'change', this.render);
    this.listenTo(this.model, 'destroy', this.remove);
  },

  call: function() {
    this.model.callContact({ modal: this.options.modal });
  },

  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  }
});

var AppView = Backbone.View.extend({

  el: $("#contacts"),

  initialize: function() {
    this.listenTo(Contacts, 'add', this.addContact);
  },

  addContact: function(todo) {
    var view = new ContactView({model : todo, modal: this.options.modal });
    this.$el.append(view.render().el);
  }
});

var Modal = new CallModalView();
var App = new AppView({ modal: Modal });
