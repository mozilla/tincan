var localstream = null; //the stream of audio/video coming from this browser
var cfg = null;//{"iceServers":[{"url":"stun:23.21.150.121"}]};
var current_call = null;
var callTimeoutID = null;
var debug = true; // true to log messages
var callRequestDialog = null;
var pc = new RTCPeerConnection(PCCONFIG, PCCONSTRAINTS);

alertify.set({ buttonFocus: "cancel" });

var LOCALCONTRAINTS = {
  "audio":true,
  "video": {
    "mandatory": {
    },
    "optional": [
    ]
  }
};

var OFFERCONTRAINTS = {
  "optional": [],
  "mandatory": {
    "OfferToReceiveAudio": true,
    "OfferToReceiveVideo": true
  }
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

// if the user is leaving the page
window.onbeforeunload = function() {
  endCurrentCall();
};

function selectEmail() {
  var range = document.createRange();
  range.selectNode(document.getElementById('selectemail'));
  window.getSelection().addRange(range);
}

function endCurrentCall() {
  if(current_call) {
    socket.emit('endCall', current_call);
    endCall(current_call);
  }
}

function resetUIState() {
  document.getElementById("outgoingvid").src = "";
  document.getElementById("incomingvid").src = "";
  document.getElementById("outgoingvid").style.display = "none";
  document.getElementById("incomingvid").style.display = "none";

  $(".callbox").addClass('hidden');
  $(".callform").removeClass('hidden');
  contactemail.value = "";
  addcontactbtn.innerHTML = "Call";
  addcontactbtn.disabled = false;
}


function endCall(email) {
  // console.log('Checking if currently in call with ' + email);
  if(current_call == email) {
    current_call = null;
    pc.close();
    pc = new RTCPeerConnection(PCCONFIG, PCCONSTRAINTS);
    localstream.stop();
    localstream = null;
    alertify.success("The call was ended!");
    resetUIState();
  }
}

function noAnswer() {
  pc.close();
  pc = new RTCPeerConnection(PCCONFIG, PCCONSTRAINTS);

  if(localstream) {
    localstream.stop();
    localstream = null;
  }
  alertify.error("There was no answer!");
  resetUIState();
}

function trace(text) {
  console.log(text);
}

function logout() {
  endCurrentCall();
  navigator.id.logout();
}

function getMedia(callback, args) {
  navigator.getUserMedia(
    LOCALCONTRAINTS,
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
};

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
    pc.createOffer(
      function (offer) {
        pc.setLocalDescription(new RTCSessionDescription(offer));
        if(debug) trace("Created offer \n" + offer.sdp);
        socket.emit('offer', email, offer);
        // update UI
        addcontactbtn.innerHTML = "Calling " + email + "...";
        addcontactbtn.disabled = true;
        callTimeoutID = setTimeout(function() {
          noAnswer();
        }, 10000); // 10 seconds to answer
      },
      function(err) {
        console.log('Error creating offer: ' + err);
      }, OFFERCONTRAINTS);
    console.log('tried to create offer');
  }
}

function gotRemoteStream(e) {
  if(debug) trace(e.stream);
  document.getElementById("incomingvid").src = window.URL.createObjectURL(e.stream);
  document.getElementById("incomingvid").style.display = "block"; // not hidden anymore
  $(".callform").addClass("hidden");
  $(".callbox").removeClass('hidden');
}

function gotLocalStream(stream) {
  pc.addStream(stream);
  document.getElementById("outgoingvid").style.display = "block"; // not hidden anymore
  document.getElementById("outgoingvid").src = window.URL.createObjectURL(stream); // add preview

  localstream = stream;
}

function sendAnswerFromOffer(offer, email) {
  pc.setRemoteDescription(new RTCSessionDescription(offer), function() {
    pc.createAnswer(function(ans) {
      pc.setLocalDescription(new RTCSessionDescription(ans));
      socket.emit('answer', email, ans);
      current_call = email;
    }, null, null);
  }, function(err){
    if(debug) trace('offer FAILED set as remote description');
    console.log(err);
  });
}

socket.on('offer', function(email, offer) {
  trace('Received offer: ' + offer.sdp);
  if(!current_call) {
    alertify.confirm("Incoming call from " + email + "! Answer?", function (e) {
      if (e) {
        clearTimeout(callRequestDialog);
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
      } else {
        clearTimeout(callRequestDialog);
        // user clicked "cancel"
        alertify.error("You denied the call!");
      }
    });
    callRequestDialog = setTimeout(function() {
      alertify.closeOpen();
    }, 10000); // 10 seconds
  }
});

socket.on('endCall', function(email) {
  endCall(email);
});

socket.on('answer', function(email, answer) {
  trace('Received answer: ' + answer.sdp);
  pc.setRemoteDescription(new RTCSessionDescription(answer),
    function(e) {
      clearTimeout(callTimeoutID);
      current_call = email;
    },
    function() {
      if(debug) trace('answer FAILED set as remote description');
    }
  );
});

socket.on('iceCandidate', function(email, cand) {
  console.log("got candidate from email: " + email);
  console.log(JSON.stringify(cand));
  pc.addIceCandidate(new RTCIceCandidate(cand));
});
