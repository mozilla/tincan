var socket = io.connect();
performance.now = performance.now || performance.webkitNow; // hack added by SD!

var vid1 = document.getElementById("vid1");
var vid2 = document.getElementById("vid2");
btn1.disabled = false;
btn2.disabled = true;
btn3.disabled = true;
var localstream; //the stream of audio/video coming from this browser
var servers = null;
var pc1; //this computer
var pc2; //remote computer

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] == '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function gotStream(stream){
  trace("Received local stream");
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
  trace("Starting call");

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
  ///////////////////////////////////////////

  if (localstream.getVideoTracks().length > 0)
    trace('Using Video device: ' + localstream.getVideoTracks()[0].label);
  if (localstream.getAudioTracks().length > 0)
    trace('Using Audio device: ' + localstream.getAudioTracks()[0].label);

  pc1 = new RTCPeerConnection(null);
  trace("Created local peer connection object pc1");
  pc1.onicecandidate = iceCallback1;

  socket.emit('offer');

  pc1.addStream(localstream);
  trace("Adding Local Stream to peer connection");

  pc1.createOffer(gotDescription1, null, null);
}

socket.on('OtherUserConnected', function(socketid) {
  document.getElementById('pc2status').innerHTML = socketid + "'s Stream (Other Browser)";
});

socket.on('YouConnected', function(socketid) {
  document.getElementById('pc1status').innerHTML = socketid + "'s Stream (Your Browser)";
});

socket.on('offerComingThru', function(){
  pc1 = new RTCPeerConnection(null);
  // trace("Created local peer connection object pc1");
  pc1.onicecandidate = iceCallback1;

  pc2 = new RTCPeerConnection(null);
  trace("Created remote peer connection object pc2");
  pc2.onicecandidate = iceCallback2;
  pc2.onaddstream = gotRemoteStream;
});

socket.on('incomingOfferDescription', function(obj) {
  var desc = (JSON.parse(obj)).desc;
  // console.log(desc);
  pc2.setRemoteDescription(new RTCSessionDescription(desc));
  pc2.createAnswer(gotDescription2, null, null);
});

function gotDescription1(desc){
  pc1.setLocalDescription(new RTCSessionDescription(desc));
  trace("Offer from pc1 \n" + desc.sdp);
  socket.emit('sendOfferDescription', JSON.stringify({ 'desc' : desc }));
}

function gotDescription2(desc){
  pc2.setLocalDescription(new RTCSessionDescription(desc));
  trace("Answer from pc2 \n" + desc.sdp);
  //send back!
  socket.emit('sendAnswerDescription', JSON.stringify({ 'desc' : desc }))
}

socket.on('incomingAnswerDescription', function(obj) {
  var desc = (JSON.parse(obj)).desc;
  pc1.setRemoteDescription(new RTCSessionDescription(desc));
});

function hangup() {
  trace("Ending call");
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  btn3.disabled = true;
  btn2.disabled = false;
}

function gotRemoteStream(e){
  vid2.src = window.URL.createObjectURL(e.stream);
  trace("Received remote stream");
}

function iceCallback1(event){
  if (event.candidate) {
    socket.emit('sendIceCandidate1', JSON.stringify({'cand' : event.candidate }));
  }
}

socket.on('incomingIceCandidate1', function(obj) {
  pc2.addIceCandidate(new RTCIceCandidate(JSON.parse(obj).cand));
  trace("Local ICE candidate: \n" + JSON.parse(obj).cand.candidate);
});

socket.on('incomingIceCandidate2', function(obj) {
  pc1.addIceCandidate(new RTCIceCandidate(JSON.parse(obj).cand));
  trace("Local ICE candidate: \n" + JSON.parse(obj).cand.candidate);
});

function iceCallback2(event){
  if (event.candidate) {
    socket.emit('sendIceCandidate2', JSON.stringify({'cand' : event.candidate }));
    // trace("Remote ICE candidate: \n " + event.candidate.candidate);
  }
}
