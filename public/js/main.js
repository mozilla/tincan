var socket = io.connect();
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

socket.on('successfulSignin', function(email) {
  currentUser = email;
  if(email) signin.innerHTML = "<span>Logout of " + email + "</span>";
});

socket.on('successfulSignout', function() {
  currentUser = null;
  window.location.reload();
});

socket.on('failedSignout', function(err) {
  // alert("Signout failure: " + err);
});

socket.on('failedSignin', function(err) {
  currentUser = null;
  navigator.id.logout();
  // alert("Signin failure: " + err);
});

function gotStream(stream){
  if(debug) trace("Received local stream");
  outgoingvid.src = window.URL.createObjectURL(stream); // add preview
  localstream = stream;
  callbtn.disabled = false;
}

function start() {
  trace("Requesting local stream");
  startbtn.disabled = true;
  navigator.getUserMedia({audio:true, video:true}, gotStream, function() {});
}

function addContact() {
  socket.emit('addContact', document.getElementById('contactemail').value);
}

function call() {
  callbtn.disabled = true;
  stoptransbtn.disabled = false;
  if(debug) trace("Starting call");

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

  if (localstream.getVideoTracks().length > 0)
    if(debug) trace('Using Video device: ' + localstream.getVideoTracks()[0].label);
  if (localstream.getAudioTracks().length > 0)
    if(debug) trace('Using Audio device: ' + localstream.getAudioTracks()[0].label);

  outgoing = new RTCPeerConnection(null);
  if(debug) trace("Created local peer connection object outgoing");
  outgoing.onicecandidate = iceCallback1;
  socket.emit('offer');
  outgoing.addStream(localstream);
  if(debug) trace("Adding Local Stream to peer connection");
  setTimeout(function() {
    outgoing.createOffer(gotDescription1, null, null);
  }, 1000);
}

function gotDescription1(desc) {
  outgoing.setLocalDescription(new RTCSessionDescription(desc));
  if(debug) trace("Offer from outgoing \n" + desc.sdp);
  //send offer!
  socket.emit('sendOfferDescription', JSON.stringify({ 'desc' : desc }));
}

function gotDescription2(desc) {
  incoming.setLocalDescription(new RTCSessionDescription(desc));
  if(debug) trace("Answer from incoming \n" + desc.sdp);
  //send back!
  socket.emit('sendAnswerDescription', JSON.stringify({ 'desc' : desc }));
}

function stopTransmitting() {
  if(outgoing) {
    outgoing.close();
    outgoing = null;
    // outgoingvid.src = "";
    stoptransbtn.disabled = true;
    callbtn.disabled = false;
    socket.emit('IStoppedTransmitting');
  }
}

function stopReceiving() {
  if(incoming) {
    incoming.close();
    incoming = null;
    stopreceivebtn.disabled = true;
    incomingvid.src = "";
    socket.emit('IStoppedReceiving');
  }
}

function gotRemoteStream(e) {
  if(debug) trace("got remote stream");
  if(debug) trace(e.stream);
  incomingvid.src = window.URL.createObjectURL(e.stream);
}

function iceCallback1(event) {
  if(debug) trace("running ice callback 1");
  if (event.candidate) {
    socket.emit('sendIceCandidate1', JSON.stringify({'cand' : event.candidate }));
  }
}

function iceCallback2(event){
  if(debug) trace("running ice callback 2");
  if (event.candidate) {
    socket.emit('sendIceCandidate2', JSON.stringify({'cand' : event.candidate }));
  }
}

socket.on('OtherUserConnected', function(socketid) {
  document.getElementById('incomingstatus').innerHTML = socketid + "'s Stream (Other Browser)";
});

socket.on('YouConnected', function(socketid) {
  document.getElementById('outgoingstatus').innerHTML = socketid + "'s Stream (Your Browser)";
});

socket.on('callerStoppedTransmitting', function() {
  stopReceiving();
});

socket.on('calleeStoppedReceiving', function() {
  stopTransmitting();
});

socket.on('allContacts', function(arr) {
  for(var i =  0; i < arr.length; i++) {
    document.getElementById('emails').innerHTML += "<div>" + arr[i] + "</div>";
  }
});

socket.on('contactAdded', function(email) {
  document.getElementById('emails').innerHTML += "<div>" + email + "</div>";
  document.getElementById('contactemail').value = "";
});

socket.on('offerComingThru', function(){
  if(debug) trace("offerComingThru");
  incoming = new RTCPeerConnection(null);
  if(debug) trace("Created remote peer connection object incoming");
  incoming.onicecandidate = iceCallback2;
  incoming.onaddstream = gotRemoteStream;
});

socket.on('incomingOfferDescription', function(obj) {
  var desc = (JSON.parse(obj)).desc;
  if(debug) trace('got offer desc ' + desc.sdp);
  if(debug) trace("Setting Remote Description for incoming");
  incoming.setRemoteDescription(new RTCSessionDescription(desc), function() {
    if(debug) trace('incomingOfferDescription SUCCEEDED to be set as remote description');
    incoming.createAnswer(gotDescription2, null, null);
    stopreceivebtn.disabled = false;
  }, function(){
    if(debug) trace('incomingOfferDescription FAILED set as remote description');
  });
});

socket.on('incomingAnswerDescription', function(obj) {
  var desc = (JSON.parse(obj)).desc;
  trace('got answer desc ' + desc.sdp);
  trace("Setting Remote Description for outgoing");
  outgoing.setRemoteDescription(new RTCSessionDescription(desc), function() {
    if(debug) trace('incomingAnswerDescription SUCCEEDED to be set as remote description');
  }, function(){
    if(debug) trace('incomingAnswerDescription FAILED set as remote description');
  });
  stoptransbtn.disabled = false;
});

socket.on('incomingIceCandidate1', function(obj) {
  if(debug) trace("Adding ICE candidate to incoming");
  incoming.addIceCandidate(new RTCIceCandidate(JSON.parse(obj).cand));
  if(debug) trace("Local ICE candidate: \n" + JSON.parse(obj).cand.candidate);
});

socket.on('incomingIceCandidate2', function(obj) {
  if(debug) trace("Adding ICE candidate to outgoing");
  outgoing.addIceCandidate(new RTCIceCandidate(JSON.parse(obj).cand));
  if(debug) trace("Remote ICE candidate: \n" + JSON.parse(obj).cand.candidate);
});
