var socket = io.connect('http://127.0.0.1:3000');
performance.now = performance.now || performance.webkitNow; // hack added by SD!
startbtn.disabled = false;
callbtn.disabled = true;
stoptransbtn.disabled = true;
stopreceivebtn.disabled = true;

var localstream; //the stream of audio/video coming from this browser
var outgoing; // peer connection for data out
var incoming; // peer connection for data in
var debug = true; // true to log messages
var currentUser = null;

var pcs = {};

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

// socket.on('successfulSignin', function(email) {
//   currentUser = email;
//   if(email) signin.innerHTML = "<span>Logout of " + email + "</span>";
// });

// socket.on('successfulSignout', function() {
//   currentUser = null;
//   window.location.reload();
// });

// socket.on('failedSignout', function(err) {
//   // alert("Signout failure: " + err);
// });

// socket.on('failedSignin', function(err) {
//   currentUser = null;
//   navigator.id.logout();
//   // alert("Signin failure: " + err);
// });

// function gotStream(stream){
//   // if(debug) trace("Received local stream");

//   // callbtn.disabled = false;
// }

function start() {
  // trace("Requesting local stream");
  // startbtn.disabled = true;
  navigator.getUserMedia(
    { audio:true, video:true },
    function gotStream(stream) {
      outgoingvid.src = window.URL.createObjectURL(stream); // add preview
      localstream = stream;
    },
    function failure(error) {
      trace('Failed to get stream: ' + error);
    }
  );
}

submitcontact.onsubmit = function(e) {
  e.preventDefault();
  e.stopPropagation();
  var contactemail = document.getElementById('contactemail');
  contactemail.checkValidity();
  if(contactemail.validity.valid && contactemail.value !== "") {
    socket.emit('addContact', contactemail.value);
  }
};

function call(email) {
  // callbtn.disabled = true;
  // stoptransbtn.disabled = false;

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

  // if (localstream.getVideoTracks().length > 0)
  //   if(debug) trace('Using Video device: ' + localstream.getVideoTracks()[0].label);
  // if (localstream.getAudioTracks().length > 0)
  //   if(debug) trace('Using Audio device: ' + localstream.getAudioTracks()[0].label);

  outgoing = new RTCPeerConnection(null);
  // if(debug) trace("Created local peer connection object outgoing");
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
        // socket.emit('sendOfferDescription', JSON.stringify({ email: email, 'desc' : desc }));
      },
      null,
      null
    );
  }, 1000);
}

// function gotDescription2(desc) {

// }

// function stopTransmitting() {
//   // if(outgoing) {
//   //   outgoing.close();
//   //   outgoing = null;
//   //   // outgoingvid.src = "";
//   //   stoptransbtn.disabled = true;
//   //   callbtn.disabled = false;
//   //   socket.emit('IStoppedTransmitting');
//   // }
// }

// function stopReceiving() {
//   // if(incoming) {
//   //   incoming.close();
//   //   incoming = null;
//   //   stopreceivebtn.disabled = true;
//   //   incomingvid.src = "";
//   //   socket.emit('IStoppedReceiving');
//   // }
// }

// function gotRemoteStream(e) {

// }

// function iceCallback1(event) {
//   if(debug) trace("running ice callback 1");
//   if (event.candidate) {
//     socket.emit('ice_in', event.candidate);
//   }
// }

// function iceCallback2(event){
//   if(debug) trace("running ice callback 2");
//   if (event.candidate) {
//     socket.emit('ice_out', event.candidate);
//   }
// }

// socket.on('OtherUserConnected', function(socketid) {
//   document.getElementById('incomingstatus').innerHTML = "Your Friend Connected!";
// });

// socket.on('YouConnected', function(socketid) {
//   document.getElementById('outgoingstatus').innerHTML = "You're Connected!";
// });

socket.on('offer', function(email, offer) {
  if(!localstream) {
    navigator.getUserMedia(
      { audio:true, video:true },
      function gotStream(stream) {
        outgoingvid.src = window.URL.createObjectURL(stream); // add preview
        localstream = stream;
      },
      function failure(error) {
        trace('Failed to get stream: ' + error);
      }
    );
  }

  if(confirm("Incoming call from " + email + "! Answer?")) {
    incoming = new RTCPeerConnection(null);

    incoming.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit('ice_out', email, event.candidate);
      }
    };

    // got remote stream
    incoming.onaddstream = function(e) {
      if(debug) trace(e.stream);
      incomingvid.src = window.URL.createObjectURL(e.stream);
    };

    //if the answerer has video on... they wanna chat!
    if(localstream) {
      outgoing = new RTCPeerConnection(null);
      // if(debug) trace("Created local peer connection object outgoing");
      outgoing.addStream(localstream);

      outgoing.onicecandidate = function(event) {
        if (event.candidate) {
          socket.emit('ice_in', email, event.candidate);
        }
      };

      if(debug) trace("Adding Local Stream to peer connection");
      setTimeout(function() {
        outgoing.createOffer(
          function (counteroffer) {
            outgoing.setLocalDescription(new RTCSessionDescription(counteroffer));
            // if(debug) trace("Offer from outgoing \n" + desc.sdp);
            incoming.setRemoteDescription(new RTCSessionDescription(offer), function() {
              incoming.createAnswer(function(ans) {
                incoming.setLocalDescription(new RTCSessionDescription(ans));
                // if(debug) trace("Answer from incoming \n" + ans.sdp);
                //send back!
                socket.emit('answer', email, ans, counteroffer);
              }, null, null);
              // stopreceivebtn.disabled = false;
            }, function(){
              if(debug) trace('offer FAILED set as remote description');
            });
            // socket.emit('sendOfferDescription', JSON.stringify({ email: email, 'desc' : desc }));
          },
          null,
          null
        );
      }, 1000);
    }
    //no video on :(
    else {
      incoming.setRemoteDescription(new RTCSessionDescription(offer), function() {
        incoming.createAnswer(function(ans) {
          incoming.setLocalDescription(new RTCSessionDescription(ans));
          // if(debug) trace("Answer from incoming \n" + ans.sdp);
          //send back!
          socket.emit('answer', email, ans);
        }, null, null);
        // stopreceivebtn.disabled = false;
      }, function(){
        if(debug) trace('offer FAILED set as remote description');
      });
    }
  }
  else {
    trace("Called denied");
  }
});

// socket.on('callerStoppedTransmitting', function() {
//   stopReceiving();
// });

// socket.on('calleeStoppedReceiving', function() {
//   stopTransmitting();
// });

// socket.on('incomingCall', function(email) {
//   if(confirm("Answer incoming call from " + email + " ?")) {

//   }
//   else {
//     alert('denied');
//   }
// });

socket.on('allContacts', function(arr) {
  for(var i =  0; i < arr.length; i++) {
    document.getElementById('emails').innerHTML += "<div class='clickable contactemail'>" + arr[i] + "</div>";
  }
});

socket.on('contactAdded', function(email) {
  document.getElementById('contactlist').innerHTML += "<div class='clickable contactemail'>" + email + "<button style='float:right;' onclick='call(\"" + email + "\");'>Call</button></div>";
  document.getElementById('contactemail').value = "";
});

// socket.on('offerComingThru', function(){
//   if(debug) trace("offerComingThru");

//   if(debug) trace("Created remote peer connection object incoming");

// });

// socket.on('incomingOfferDescription', function(obj) {
//   var desc = (JSON.parse(obj)).desc;
//   if(debug) trace('got offer desc ' + desc.sdp);
//   if(debug) trace("Setting Remote Description for incoming");
//   incoming.setRemoteDescription(new RTCSessionDescription(desc), function() {
//     if(debug) trace('incomingOfferDescription SUCCEEDED to be set as remote description');
//     incoming.createAnswer(gotDescription2, null, null);
//     stopreceivebtn.disabled = false;
//   }, function(){
//     if(debug) trace('incomingOfferDescription FAILED set as remote description');
//   });
// });

socket.on('answer', function(email, answer, offer) {
  // var desc = (JSON.parse(obj)).desc;
  trace('Got answer: ' + answer.sdp);
  outgoing.setRemoteDescription(new RTCSessionDescription(answer),
    function() {},
    function() {
      if(debug) trace('answer FAILED set as remote description');
    }
  );

  if(offer) {
    incoming = new RTCPeerConnection(null);

    incoming.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit('ice_out', email, event.candidate);
      }
    };

    // got remote stream
    incoming.onaddstream = function(e) {
      if(debug) trace(e.stream);
      incomingvid.src = window.URL.createObjectURL(e.stream);
    };

    incoming.setRemoteDescription(new RTCSessionDescription(offer), function() {
      incoming.createAnswer(function(ans) {
        incoming.setLocalDescription(new RTCSessionDescription(ans));
        // if(debug) trace("Answer from incoming \n" + ans.sdp);
        //send back!
        socket.emit('answer', email, ans);
      }, null, null);
      // stopreceivebtn.disabled = false;
    }, function(){
      if(debug) trace('offer FAILED set as remote description');
    });
  }
  // stoptransbtn.disabled = false;
});

// socket.on('incomingAnswerDescription', function(obj) {

// });

socket.on('ice_in', function(email, cand) {
  // if(debug) trace("Adding ICE candidate to incoming from " + email);
  incoming.addIceCandidate(new RTCIceCandidate(cand));
  if(debug) trace("Local ICE candidate: \n" + cand.candidate);
});

socket.on('ice_out', function(email, cand) {
  // if(debug) trace("Adding ICE candidate to outgoing from " + email);
  outgoing.addIceCandidate(new RTCIceCandidate(cand));
  if(debug) trace("Remote ICE candidate: \n" + cand.candidate);
});

// socket.on('incomingIceCandidate1', function(obj) {

//   incoming.addIceCandidate(new RTCIceCandidate(JSON.parse(obj).cand));
//   if(debug) trace("Local ICE candidate: \n" + JSON.parse(obj).cand.candidate);
// });

// socket.on('incomingIceCandidate2', function(obj) {
//   if(debug) trace("Adding ICE candidate to outgoing");
//   outgoing.addIceCandidate(new RTCIceCandidate(JSON.parse(obj).cand));
//   if(debug) trace("Remote ICE candidate: \n" + JSON.parse(obj).cand.candidate);
// });

start();
