var socket = io.connect();
btn1.disabled = false;
btn2.disabled = true;
btn3.disabled = true;
var pc1,pc2;
var localstream;
var peerConnections = {};
var localPeerConnections = {};
var peerConnection = mozRTCPeerConnection || webkitPeerConnection;
// var SessionDescription = RTCSessionDescription || mozRTCSessionDescription;

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] == '\n') {
    text = text.substring(0, text.length - 1);
  }
  // console.log((performance.webkitNow() / 1000).toFixed(3) + ": " + text);
}

function gotStream(stream){
  trace("Received local stream");
  vid1.src = window.URL.createObjectURL(stream);
  localstream = stream;
  btn2.disabled = false;
}

function start() {
  trace("Requesting local stream");
  btn1.disabled = true;
  navigator.getMedia = (navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);
  navigator.getMedia({audio:true, video:true}, gotStream, function(err) {
    console.log("The following error occured: " + err);
   });
}

socket.on('newUserConnected', function(socketid) {
  if(localstream) {
    var lpc = new peerConnection(null, iceCallback1);
    lpc.addStream(localstream);
    var offer = lpc.createOffer(null);
    lpc.setLocalDescription(lpc.SDP_OFFER, offer);
    localPeerConnections[socketid] = lpc;
    socket.emit('offer', JSON.stringify(offer.toSdp()), socketid);
  }
});

function call() {
  btn2.disabled = true;
  btn3.disabled = false;
  trace("Starting call");
  socket.emit('getConnectedSockets');
}

socket.on('getConnectedSockets', function(sockets){
  // SessionDescription = mozRTCSessionDescription;
  sockets = JSON.parse(sockets);
  var len = sockets.length;
  var socketid;
  for(var i = 0; i < len; i++){
    socketid = sockets[i];
    if(socketid != socket.socket.sessionid) {
      var lpc = new peerConnection(null, iceCallback1);
      lpc.addStream(localstream);
      var offer = lpc.createOffer(null);

      offer = new SessionDescription(offer);
      lpc.setLocalDescription(offer);
      // lpc.setLocalDescription(lpc.SDP_OFFER, offer);
      localPeerConnections[socketid] = lpc;
      socket.emit('offer', JSON.stringify(offer.toSdp()), socketid);
    }
  }
});

socket.on('offer', function(offer, socketid) {
  SessionDescription = RTCSessionDescription || mozRTCSessionDescription;

  console.log('make peer connection');
  var newpeerconn = new peerConnection(null, iceCallback2);

  //peerConnections[socketid] = newpeerconn;
  console.log('set peer connections');
  newpeerconn.onaddstream = function(e) {
    console.log(socketid);
    gotRemoteStream(e, socketid);
  };
  offer = JSON.parse(offer);
  offer = new SessionDescription(offer);
  newpeerconn.setRemoteDescription(offer);
  // newpeerconn.setRemoteDescription(newpeerconn.SDP_OFFER, new SessionDescription(offer));
  var answer = newpeerconn.createAnswer(offer, {has_audio:true, has_video:true});
  newpeerconn.setLocalDescription(newpeerconn.SDP_ANSWER, answer);
  console.log('storing in peerConnections for socket:' + socketid);
  peerConnections[socketid] = newpeerconn;
  socket.emit('answer', JSON.stringify({answer: answer.toSdp()}));
});

socket.on('answer', function(answer, socketid) {
  answer = JSON.parse(answer);
  answer = answer.answer;
  console.log('getting from localPeerConnections for socket:' + socketid);
  var lpc = localPeerConnections[socketid];
  lpc.setRemoteDescription(lpc.SDP_ANSWER, new SessionDescription(answer));
  lpc.startIce();
  socket.emit('startICE');
});

socket.on('startICE', function(socketid) {
  console.log('startICE for socket:' + socketid);
  peerConnections[socketid].startIce();
});

socket.on('candidate', function(candidate, socketid) {
  console.log('candidate for socket:' + socketid);
  cand = JSON.parse(candidate);
  candidate = new IceCandidate(cand.label, cand.candidate);
  if(cand.type == "candidate1") localPeerConnections[socketid].processIceMessage(candidate);
  else peerConnections[socketid].processIceMessage(candidate);
});

function hangup() {
  trace("Ending call");
  var key;
  for(key in peerConnections) {
    if(peerConnections.hasOwnProperty(key)) {
      if(peerConnections[key]) {
        peerConnections[key].close();
        peerConnections[key] = null;
      }
    }
  }

  for(key in localPeerConnections) {
    if(localPeerConnections.hasOwnProperty(key)) {
      if(localPeerConnections[key]) {
        localPeerConnections[key].close();
        localPeerConnections[key] = null;
      }
    }
  }

  btn3.disabled = true;
  btn2.disabled = false;
}

function gotRemoteStream(e, socketid) {
  var vid = document.createElement("video");
  vid.setAttribute('id', 'vid'+socketid);
  vid.setAttribute('autoplay', 'autoplay');
  document.body.appendChild(vid);
  vid.src = window.URL.createObjectURL(e.stream);
  trace("Received remote stream");
}

socket.on('userDisconnect', function(socketid){
  vid = document.getElementById('vid' + socketid);
  if(vid) {
    document.body.removeChild(vid);
  }
  peerConnections[socketid] = null;
});

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
