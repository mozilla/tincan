performance.now = performance.now || performance.webkitNow; // hack added by SD!

var localstream; //the stream of audio/video coming from this browser
var debug = true; // true to log messages
var cfg = null;//{"iceServers":[{"url":"stun:23.21.150.121"}]};

var pc = new RTCPeerConnection(PCCONFIG, PCCONSTRAINTS);

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

function selectEmail() {
  var range = document.createRange();
  range.selectNode(document.getElementById('selectemail'));
  window.getSelection().addRange(range);
}

function endCall() {
  console.log('Ending call not yet implemented');
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
    callEmail(contactemail.value);
  }
};

submitcontact.oninput = function(e) {
  addcontactbtn.innerHTML = "Call " + contactemail.value;
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

    pc.onicecandidate = function (event) {
      console.log("ice cand: " + event.candidate);
      if (event.candidate) {
        socket.emit('iceCandidate', email, event.candidate);
      }
    };

    if(debug) trace("Adding Local Stream to peer connection");
    var constraints = null;
    pc.createOffer(
      function (offer) {
        console.log('got offer: ' + offer);
        pc.setLocalDescription(new RTCSessionDescription(offer));
        if(debug) trace("Offer from outgoing \n" + offer.sdp);
        socket.emit('offer', email, offer);

        contactemail.disabled = true;
        addcontactbtn.innerHTML = "Calling " + email + "...";
        addcontactbtn.disabled = true;
      },
      function(err) {
        console.log('Error creating offer: ' + err);
      }, constraints);
    console.log('tried to create offer');
  }
}

function gotRemoteStream(e) {
  if(debug) trace(e.stream);
  incomingvid.src = window.URL.createObjectURL(e.stream);

  incomingvid.className = ""; // not hidden anymore
  $(".callform").addClass("hidden");
  $(".callbox").removeClass('hidden');
}

function gotLocalStream(stream) {
  pc.addStream(stream);
  outgoingvid.src = window.URL.createObjectURL(stream); // add preview
  outgoingvid.className = ""; // not hidden anymore
  localstream = stream;
}

function sendAnswerFromOffer(offer, email) {
  pc.setRemoteDescription(new RTCSessionDescription(offer), function() {
    pc.createAnswer(function(ans) {
      pc.setLocalDescription(new RTCSessionDescription(ans));
      socket.emit('answer', email, ans);
    }, null, null);
  }, function(err){
    if(debug) trace('offer FAILED set as remote description');
    console.log(err);
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

// socket.on('allContacts', function(arr) {
//   for(var i =  0; i < arr.length; i++) {
//     document.getElementById('emails').innerHTML += "<div class='clickable contactemail'>" + arr[i] + "</div>";
//   }
// });

// socket.on('contactAdded', function(email) {
//   document.getElementById('contactlist').innerHTML += "<div class='clickable contactemail'>" + email + "<button style='float:right;' onclick='callEmail(\"" + email + "\");'>Call</button></div>";
//   document.getElementById('contactemail').value = "";
// });

socket.on('answer', function(email, answer) {
  trace('Got answer: ' + answer.sdp);
  pc.setRemoteDescription(new RTCSessionDescription(answer),
    function(e) {
    },
    function() {
      if(debug) trace('answer FAILED set as remote description');
    }
  );
});

socket.on('iceCandidate', function(email, cand) {
  console.log("got candidate from email: " + email);
  console.log("got candidate: " + cand);
  console.log(cand);
  pc.addIceCandidate(new RTCIceCandidate(cand));
});

//start();
