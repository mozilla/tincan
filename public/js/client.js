var socket = io.connect();
socket.emit('connect');
btn1.disabled = false;
btn2.disabled = true;
btn3.disabled = true;
var pc1,pc2;
var localstream;

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

function call() {
  if(!pc1){
    pc1 = new webkitPeerConnection00(null, iceCallback1);
  }
  if(!pc2) {
    pc2 = new webkitPeerConnection00(null, iceCallback2);
    pc2.onaddstream = gotRemoteStream;
  }
  btn2.disabled = true;
  btn3.disabled = false;
  trace("Starting call");
  if (localstream.videoTracks.length > 0)
    trace('Using Video device: ' + localstream.videoTracks[0].label);
  if (localstream.audioTracks.length > 0)
    trace('Using Audio device: ' + localstream.audioTracks[0].label);

  pc1.addStream(localstream);
  var offer = pc1.createOffer(null);
  pc1.setLocalDescription(pc1.SDP_OFFER, offer);

  socket.emit('offer', JSON.stringify(offer.toSdp()));
}

socket.on('offer', function(offer){
  if(!pc1){
    pc1 = new webkitPeerConnection00(null, iceCallback1);
  }
  if(!pc2) {
    pc2 = new webkitPeerConnection00(null, iceCallback2);
    pc2.onaddstream = gotRemoteStream;
  }
  offer = JSON.parse(offer);
  pc2.setRemoteDescription(pc2.SDP_OFFER, new SessionDescription(offer));
  var answer = pc2.createAnswer(offer, {has_audio:true, has_video:true});
  pc2.setLocalDescription(pc2.SDP_ANSWER, answer);
  socket.emit('answer', JSON.stringify(answer.toSdp()));
});

socket.on('answer', function(answer){
  answer = JSON.parse(answer);
  pc1.setRemoteDescription(pc1.SDP_ANSWER, new SessionDescription(answer));
  socket.emit('startICE');
});

socket.on('startICE', function(){
  pc1.startIce();
  pc2.startIce();
});

socket.on('candidate', function(candidate) {
  cand = JSON.parse(candidate);
  candidate = new IceCandidate(cand.label, cand.candidate);
  if(cand.type == "candidate1") pc1.processIceMessage(candidate);
  else pc2.processIceMessage(candidate);
  trace("Remote ICE candidate: " + candidate.toSdp());
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
  vid2.src = webkitURL.createObjectURL(e.stream);
  trace("Received remote stream");
}

function iceCallback1(candidate,bMore){
    if (candidate) {
      socket.emit('candidate', JSON.stringify({type: 'candidate2', label: candidate.label, candidate: candidate.toSdp()}));
    }
}

function iceCallback2(candidate,bMore){
  if (candidate) {
    socket.emit('candidate', JSON.stringify({type: 'candidate1', label: candidate.label, candidate: candidate.toSdp()}));
  }
}

pc1 = new webkitPeerConnection00(null, iceCallback1);
pc2 = new webkitPeerConnection00(null, iceCallback2);
pc2.onaddstream = gotRemoteStream;
