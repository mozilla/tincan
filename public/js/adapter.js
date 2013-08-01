var RTCPeerConnection = null;
var getUserMedia = null;
var attachMediaStream = null;
var reattachMediaStream = null;
var webrtcDetectedBrowser = null;
var SessionDescription = null;
var PCCONFIG = null;
var PCCONSTRAINTS = null;

if (navigator.mozGetUserMedia) {
  console.log("This appears to be Firefox");

  PCCONFIG = {"iceServers":[{"url":"stun:stun.services.mozilla.com"}]};
  PCCONSTRAINTS = {"optional":[{"DtlsSrtpKeyAgreement":true}]};

  webrtcDetectedBrowser = "firefox";

  // The RTCPeerConnection object.
  RTCPeerConnection = mozRTCPeerConnection;
  SessionDescription = mozRTCSessionDescription;

  // The RTCSessionDescription object.
  RTCSessionDescription = mozRTCSessionDescription;

  // The RTCIceCandidate object.
  RTCIceCandidate = mozRTCIceCandidate;

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  navigator.getUserMedia = navigator.mozGetUserMedia;

  // Attach a media stream to an element.
  attachMediaStream = function(element, stream) {
    console.log("Attaching media stream");
    element.mozSrcObject = stream;
    element.play();
  };

  reattachMediaStream = function(to, from) {
    console.log("Reattaching media stream");
    to.mozSrcObject = from.mozSrcObject;
    to.play();
  };

  // Fake get{Video,Audio}Tracks
  MediaStream.prototype.getVideoTracks = function() {
    return [];
  };

  MediaStream.prototype.getAudioTracks = function() {
    return [];
  };
} else if (navigator.webkitGetUserMedia) {
  console.log("This appears to be Chrome");

  webrtcDetectedBrowser = "chrome";

  PCCONFIG = {
    "iceServers":[
      {
        "url":"stun:stun.l.google.com:19302"
      },
      {
        "url":"turn:108.59.80.54:3478?transport=udp",
        "credential":"111182be0374e5f10a30806092ec88c0",
        "username":"56043897-1375316132"
      }
    ]
  };

  PCCONSTRAINTS = {"optional":[{"DtlsSrtpKeyAgreement":true}]};

  // The RTCPeerConnection object.
  RTCPeerConnection = webkitRTCPeerConnection;
  SessionDescription = RTCSessionDescription;

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  navigator.getUserMedia = navigator.webkitGetUserMedia;

  // Attach a media stream to an element.
  attachMediaStream = function(element, stream) {
    element.src = webkitURL.createObjectURL(stream);
  };

  reattachMediaStream = function(to, from) {
    to.src = from.src;
  };

  // The representation of tracks in a stream is changed in M26.
  // Unify them for earlier Chrome versions in the coexisting period.
  if (!webkitMediaStream.prototype.getVideoTracks) {
    webkitMediaStream.prototype.getVideoTracks = function() {
      return this.videoTracks;
    };
    webkitMediaStream.prototype.getAudioTracks = function() {
      return this.audioTracks;
    };
  }

  // New syntax of getXXXStreams method in M26.
  if (!webkitRTCPeerConnection.prototype.getLocalStreams) {
    webkitRTCPeerConnection.prototype.getLocalStreams = function() {
      return this.localStreams;
    };
    webkitRTCPeerConnection.prototype.getRemoteStreams = function() {
      return this.remoteStreams;
    };
  }
} else {
  console.log("Browser does not appear to be WebRTC-capable");
}
