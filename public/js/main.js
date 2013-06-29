var socket = io.connect('http://localhost:3000');
performance.now = performance.now || performance.webkitNow; // hack added by SD!

var localstream; //the stream of audio/video coming from this browser
var outgoing; // peer connection for data out
var incoming; // peer connection for data in
var debug = true; // true to log messages
var currentUser = null;

function logout() {
  navigator.id.logout();
}

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

function start() {
  navigator.getUserMedia(
    { audio:true, video:true },
    function onStream(stream) {
      gotLocalStream(stream);
    },
    function failure(error) {
      alert('Error: To call you need to allow video and/or mic');
      trace('Failed to get stream: ' + error);
    }
  );
}

submitcontact.onsubmit = function(e) {
  alert('onsubmit');
  e.preventDefault();
  e.stopPropagation();
  var contactemail = document.getElementById('contactemail');
  contactemail.checkValidity();
  if(contactemail.validity.valid && contactemail.value !== "") {
    socket.emit('addContact', contactemail.value);
  }
};

function call(email) {
  alert('call');
  if(!localstream) {
    navigator.getUserMedia(
      { audio:true, video:true },
      function onStream(stream) {
        gotLocalStream(stream);
        call(email);
      },
      function failure(error) {
        alert('Error: To call you need to allow video and/or mic');
        trace('Failed to get stream: ' + error);
      }
    );
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

    outgoing = new RTCPeerConnection(null);
    outgoing.addStream(localstream);

    outgoing.onicecandidate = function(event) {
      if (event.candidate) {
        socket.emit('ice_in', email, event.candidate);
      }
    };

    if(debug) trace("Adding Local Stream to peer connection");
    setTimeout(function() {
      outgoing.createOffer(
        function (offer) {
          outgoing.setLocalDescription(new RTCSessionDescription(offer));
          if(debug) trace("Offer from outgoing \n" + offer.sdp);
          socket.emit('offer', email, offer);
        }, null, null);
    }, 1000);
  }
}

function gotRemoteStream(e) {
  if(debug) trace(e.stream);
  incomingvid.src = window.URL.createObjectURL(e.stream);
}

function gotLocalStream(stream) {
  outgoingvid.src = window.URL.createObjectURL(stream); // add preview
  localstream = stream;
}

function sendAnswerFromOffer(offer, email, stream) {
  alert('send answer from offer');

  incoming.setRemoteDescription(new RTCSessionDescription(offer), function() {
    incoming.createAnswer(function(ans) {
      incoming.setLocalDescription(new RTCSessionDescription(ans));
      if(debug) trace("Answer from incoming \n" + ans.sdp);
      outgoing = new RTCPeerConnection(null);
      outgoing.addStream(localstream);
      outgoing.onicecandidate = function(event) {
        if (event.candidate) {
          socket.emit('ice_in', email, event.candidate);
        }
      };
      setTimeout(function() {
        outgoing.createOffer(
          function (counteroffer) {
            outgoing.setLocalDescription(new RTCSessionDescription(counteroffer));
            if(debug) trace("Offer from outgoing \n" + counteroffer.sdp);
            socket.emit('answer', email, ans, counteroffer);
            // socket.emit('sendOfferDescription', JSON.stringify({ email: email, 'desc' : desc }));
          }, null, null);
      }, 1000);
    }, null, null);
  }, function(){
    if(debug) trace('offer FAILED set as remote description');
  });
}

socket.on('offer', function(email, offer) {
  alert('offer');
  if(confirm("Incoming call from " + email + "! Answer?")) {
    //prepare for stream
    incoming = new RTCPeerConnection(null);
    incoming.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit('ice_out', email, event.candidate);
      }
    };
    incoming.onaddstream = gotRemoteStream;

    if(!localstream) {
      navigator.getUserMedia(
        { audio:true, video:true },
        function onStream(stream) {
          gotLocalStream(stream);
          sendAnswerFromOffer(offer, email, stream);
        },
        function failure(error) {
          alert('Error: To call you need to allow video and/or mic');
          trace('Failed to get stream: ' + error);
        }
      );
    }
    else {
      sendAnswerFromOffer(offer, email, localstream);
    }
  }
  else {
    alert("Call denied");
  }
});

socket.on('allContacts', function(arr) {
  alert('all contacts');
  for(var i =  0; i < arr.length; i++) {
    document.getElementById('emails').innerHTML += "<div class='clickable contactemail'>" + arr[i] + "</div>";
  }
});

socket.on('contactAdded', function(email) {
  alert('contactAdded');
  document.getElementById('contactlist').innerHTML += "<div class='clickable contactemail'>" + email + "<button style='float:right;' onclick='call(\"" + email + "\");'>Call</button></div>";
  document.getElementById('contactemail').value = "";
});

socket.on('answer', function(email, answer, counteroffer) {
  alert('answer');
  trace('Got answer: ' + answer.sdp);
  outgoing.setRemoteDescription(new RTCSessionDescription(answer),
    function() {},
    function() {
      if(debug) trace('answer FAILED set as remote description');
    }
  );

  if(counteroffer) {
    incoming = new RTCPeerConnection(null);

    incoming.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit('ice_out', email, event.candidate);
      }
    };

    // got remote stream
    incoming.onaddstream = gotRemoteStream;

    incoming.setRemoteDescription(new RTCSessionDescription(counteroffer), function() {
      incoming.createAnswer(function(ans) {
        incoming.setLocalDescription(new RTCSessionDescription(ans));
        if(debug) trace("Answer from incoming \n" + ans.sdp);
        //send back!
        socket.emit('answer', email, ans);
      }, null, null);
    }, function(){
      if(debug) trace('offer FAILED set as remote description');
    });
  }
});

socket.on('ice_in', function(email, cand) {
  alert('ice in');
  incoming.addIceCandidate(new RTCIceCandidate(cand));
  if(debug) trace("Local ICE candidate: \n" + cand.candidate);
});

socket.on('ice_out', function(email, cand) {
  alert('ice out');
  outgoing.addIceCandidate(new RTCIceCandidate(cand));
  if(debug) trace("Remote ICE candidate: \n" + cand.candidate);
});

start();
