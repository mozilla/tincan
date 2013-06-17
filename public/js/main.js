var socket = io.connect();
performance.now = performance.now || performance.webkitNow; // hack added by SD!

btn1.disabled = false;
btn2.disabled = true;
btn3.disabled = true;
btn4.disabled = true;
var localstream; //the stream of audio/video coming from this browser

var pc1; //this computer
var pc2; //remote computer
var debug = true; // true to log messages

var currentUser = null;

//signin and signout buttons
var signinLink = document.getElementById('signin');
if (signinLink) {
  signinLink.onclick = function() { if(navigator.id) navigator.id.request(); };
}

var signoutLink = document.getElementById('signout');
if (signoutLink) {
  signoutLink.onclick = function() { if(navigator.id) navigator.id.logout(); };
}

socket.on('successfulSignin', function(email) {
  currentUser = email;
  // window.location.reload();
});

socket.on('successfulSignout', function() {
  currentUser = null;
  window.location.reload();
});

socket.on('failedSignout', function(err) {
  alert("Signout failure: " + err);
});

socket.on('failedSignin', function(err) {
  currentUser = null;
  navigator.id.logout();
  alert("Signin failure: " + err);
});

if(navigator.id) {
  navigator.id.watch({
    loggedInUser: currentUser,
    onlogin: function(assertion) {
      socket.emit('signin', { assertion: assertion });
      // A user has logged in! Here you need to:
      // 1. Send the assertion to your backend for verification and to create a session.
      // 2. Update your UI.
    },
    onlogout: function() {
      socket.emit('signout');
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

function gotStream(stream){
  if(debug) trace("Received local stream");
  vid1.src = window.URL.createObjectURL(stream); // add preview
  localstream = stream;
  btn2.disabled = false;
}

function start() {
  trace("Requesting local stream");
  btn1.disabled = true;

  navigator.getUserMedia({audio:true, video:true}, gotStream, function() {});
}

function call() {
  btn2.disabled = true;
  btn3.disabled = false;
  if(debug) trace("Starting call");

  // temporary hacks to cope with API change
  if (!!localstream.videoTracks && !localstream.getVideoTracks) {
    localstream.getVideoTracks = function(){
      return this.videoTracks;
    }
  }
  if (!!localstream.audioTracks && !localstream.getAudioTracks) {
    localstream.getAudioTracks = function(){
      return this.audioTracks;
    }
  }

  if (localstream.getVideoTracks().length > 0)
    if(debug) trace('Using Video device: ' + localstream.getVideoTracks()[0].label);
  if (localstream.getAudioTracks().length > 0)
    if(debug) trace('Using Audio device: ' + localstream.getAudioTracks()[0].label);

  pc1 = new RTCPeerConnection(null);
  if(debug) trace("Created local peer connection object pc1");
  pc1.onicecandidate = iceCallback1;

  socket.emit('offer');

  pc1.addStream(localstream);

  if(debug) trace("Adding Local Stream to peer connection");

  setTimeout(function() {
    pc1.createOffer(gotDescription1, null, null);
  }, 1000);
}

function gotDescription1(desc) {
  // pop up persona dialog
  // if fail then return
  // else
  pc1.setLocalDescription(new RTCSessionDescription(desc));
  if(debug) trace("Offer from pc1 \n" + desc.sdp);
  //send offer!
  socket.emit('sendOfferDescription', JSON.stringify({ 'desc' : desc }));
}

function gotDescription2(desc) {
  pc2.setLocalDescription(new RTCSessionDescription(desc));
  if(debug) trace("Answer from pc2 \n" + desc.sdp);
  //send back!
  socket.emit('sendAnswerDescription', JSON.stringify({ 'desc' : desc }));
}

function stopTransmitting() {
  pc1.close();
  pc1 = null;
  btn3.disabled = true;
  btn2.disabled = false;
  socket.emit('IStoppedTransmitting');
}

function stopReceiving() {
  pc2.close();
  pc2 = null;
  btn4.disabled = true;
  vid2.src = "";
  socket.emit('IStoppedReceiving');
}

function hangup() {
  if(debug) trace("Ending call");
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  vid2.src = "";
  btn3.disabled = true;
  btn2.disabled = false;
}

function gotRemoteStream(e) {
  if(debug) trace("got remote stream!!");
  if(debug) trace(e.stream);
  vid2.src = window.URL.createObjectURL(e.stream);
}

function iceCallback1(event) {
  if(debug) trace("running ice callback 1!!");
  if (event.candidate) {
    socket.emit('sendIceCandidate1', JSON.stringify({'cand' : event.candidate }));
  }
}

function iceCallback2(event){
  if(debug) trace("running ice callback 2!!");
  if (event.candidate) {
    socket.emit('sendIceCandidate2', JSON.stringify({'cand' : event.candidate }));
  }
}

socket.on('OtherUserConnected', function(socketid) {
  document.getElementById('pc2status').innerHTML = socketid + "'s Stream (Other Browser)";
});

socket.on('YouConnected', function(socketid) {
  document.getElementById('pc1status').innerHTML = socketid + "'s Stream (Your Browser)";
});

socket.on('callerStoppedTransmitting', function() {
  stopReceiving();
});

socket.on('calleeStoppedReceiving', function() {
  stopTransmitting();
});

socket.on('offerComingThru', function(){
  if(debug) trace("offerComingThru!!");
  if(!pc1) {
    trace("making pc1!!");
    pc1 = new RTCPeerConnection(null);
    pc1.onicecandidate = iceCallback1;
  }
  if(debug) trace("making pc2!!");
  pc2 = new RTCPeerConnection(null);
  if(debug) trace("Created remote peer connection object pc2");
  pc2.onicecandidate = iceCallback2;
  pc2.onaddstream = gotRemoteStream;
});

socket.on('incomingOfferDescription', function(obj) {
  var desc = (JSON.parse(obj)).desc;
  if(debug) trace('got offer desc ' + desc.sdp);
  if(debug) trace("Setting Remote Description for pc2");
  pc2.setRemoteDescription(new RTCSessionDescription(desc), function() {
    if(debug) trace('incomingOfferDescription SUCCEEDED to be set as remote description');
    if(debug) trace("Creating Answer for pc2");
    pc2.createAnswer(gotDescription2, null, null);
    btn4.disabled = false;
  }, function(){
    if(debug) trace('incomingOfferDescription FAILED set as remote description');
  });
});

socket.on('incomingAnswerDescription', function(obj) {
  var desc = (JSON.parse(obj)).desc;
  trace('got answer desc ' + desc.sdp);
  trace("Setting Remote Description for pc1");
  pc1.setRemoteDescription(new RTCSessionDescription(desc), function() {
    if(debug) trace('incomingAnswerDescription SUCCEEDED to be set as remote description');
  }, function(){
    if(debug) trace('incomingAnswerDescription FAILED set as remote description');
  });
  btn3.disabled = false;
});

socket.on('incomingIceCandidate1', function(obj) {
  if(debug) trace("Adding ICE candidate to pc2");
  pc2.addIceCandidate(new RTCIceCandidate(JSON.parse(obj).cand));
  if(debug) trace("Local ICE candidate: \n" + JSON.parse(obj).cand.candidate);
});

socket.on('incomingIceCandidate2', function(obj) {
  if(debug) trace("Adding ICE candidate to pc1");
  pc1.addIceCandidate(new RTCIceCandidate(JSON.parse(obj).cand));
  if(debug) trace("Remote ICE candidate: \n" + JSON.parse(obj).cand.candidate);
});
