var socket = io.connect();
btn1.disabled = false;
btn2.disabled = true;
btn3.disabled = true;
var pc1,pc2;
var localstream;
var peerConnections = [];

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] == '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.webkitNow() / 1000).toFixed(3) + ": " + text);
}

function gotStream(stream){
  trace("Received local stream");
  vid1.src = webkitURL.createObjectURL(stream);
  localstream = stream;
  btn2.disabled = false;
}

function start() {
  trace("Requesting local stream");
  btn1.disabled = true;
  navigator.webkitGetUserMedia({audio:true, video:true}, gotStream, function() {});
}

socket.on('newUserConnected', function(socketid) {
  if(pc1) {
    createOfferAndSend(socketid);
  }
});

function call() {

  btn2.disabled = true;
  btn3.disabled = false;
  trace("Starting call");
  if (localstream.videoTracks.length > 0)
    trace('Using Video device: ' + localstream.videoTracks[0].label);
  if (localstream.audioTracks.length > 0)
    trace('Using Audio device: ' + localstream.audioTracks[0].label);

  pc1.addStream(localstream);
  createOfferAndSend();
}

function createOfferAndSend(socketid) {
  var offer = pc1.createOffer(null);
  pc1.setLocalDescription(pc1.SDP_OFFER, offer);
  socket.emit('offer', JSON.stringify(offer.toSdp()), socketid);
}

socket.on('offer', function(offer) {
  var newpeerconn = new webkitPeerConnection00(null, iceCallback2);

  newpeerconn.onaddstream = gotRemoteStream;

  offer = JSON.parse(offer);
  newpeerconn.setRemoteDescription(newpeerconn.SDP_OFFER, new SessionDescription(offer));
  var answer = newpeerconn.createAnswer(offer, {has_audio:true, has_video:true});
  newpeerconn.setLocalDescription(newpeerconn.SDP_ANSWER, answer);
  peerConnections.push(newpeerconn);
  socket.emit('answer', JSON.stringify({answer: answer.toSdp()}));
});

socket.on('answer', function(answer){
  answer = JSON.parse(answer);
  answer = answer.answer;
  pc1.setRemoteDescription(pc1.SDP_ANSWER, new SessionDescription(answer));
  pc1.startIce();
  socket.emit('startICE');
});

socket.on('startICE', function(){
  peerConnections[peerConnections.length-1].startIce();
});

socket.on('candidate', function(candidate) {
  cand = JSON.parse(candidate);
  candidate = new IceCandidate(cand.label, cand.candidate);
  if(cand.type == "candidate1") pc1.processIceMessage(candidate);
  else peerConnections[peerConnections.length-1].processIceMessage(candidate);
});
pc1 = new webkitPeerConnection00(null, iceCallback1);
function hangup() {
  trace("Ending call");
  pc1.close();
  for (var i = peerConnections.length - 1; i >= 0; i--) {
    peerConnections[i].close();
    peerConnections[i] = null;
  }
  pc1 = null;
  btn3.disabled = true;
  btn2.disabled = false;
}

function gotRemoteStream(e) {
  var vid = document.createElement("video");
  vid.setAttribute('id', 'vid'+Math.random());
  vid.setAttribute('autoplay', 'autoplay');
  document.body.appendChild(vid);
  vid.src = webkitURL.createObjectURL(e.stream);
  trace("Received remote stream");
}

function iceCallback1(candidate, bMore) {
  if (candidate) {
    socket.emit('candidate', JSON.stringify({type: 'candidate2', label: candidate.label, candidate: candidate.toSdp()}));
  }
}

function iceCallback2(candidate, bMore){
  if (candidate) {
    socket.emit('candidate', JSON.stringify({type: 'candidate1', label: candidate.label, candidate: candidate.toSdp()}));
  }
}

pc1 = new webkitPeerConnection00(null, iceCallback1);
