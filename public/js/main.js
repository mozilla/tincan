var localstream = null; //the stream of audio/video coming from this browser
var cfg = null;//{"iceServers":[{"url":"stun:23.21.150.121"}]};
var current_call = null;
var callTimeoutID = null;
var debug = true; // true to log messages
var callRequestDialog = null;
var pc; // peer connection
var favicanvas = document.createElement('canvas');
var favicontimer;
var favicontimer2;
var emailList = [];

var RTCPeerConnectionID = RTCPeerConnectionID || null;

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
  callbtn.innerHTML = "Call";
  callbtn.disabled = false;
}


function endCall(email) {
  // console.log('Checking if currently in call with ' + email);
  if(current_call == email) {
    current_call = null;
    pc.close();

    if(!!RTCPeerConnectionID) {
      pc = new RTCPeerConnectionID(PCCONFIG, PCCONSTRAINTS);
    }
    else {
      pc = new RTCPeerConnection(PCCONFIG, PCCONSTRAINTS);
    }

    if(pc.setIdentityProvider) {
      pc.setIdentityProvider(idp_provider, idp_protocol, idp_username);
    }
    localstream.stop();
    localstream = null;
    alertify.success("The call was ended!");
    resetUIState();
  }
}

function noAnswer() {
  pc.close();
  if(!!RTCPeerConnectionID) {
    pc = new RTCPeerConnectionID(PCCONFIG, PCCONSTRAINTS);
  }
  else {
    pc = new RTCPeerConnection(PCCONFIG, PCCONSTRAINTS);
  }

  if(pc.setIdentityProvider) {
    pc.setIdentityProvider(idp_provider, idp_protocol, idp_username);
  }

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

submitcontact.oninput = function(e) {
  var contactemail = document.getElementById('contactemail');
  if(contactemail.value) {
    var match = contactemail.value.match(/^[\w.!#$%&'*+\-\/=?\^`{|}~]+@[a-z\d\-]+(\.[a-z\d\-]+)+$/i);
    if(match) {
      document.getElementById('callbtn').disabled = false;
    }
    else {
      document.getElementById('callbtn').disabled = true;
    }
  }
};

/**
 * On the add of a contact
 * @param  {Event} e    event fired
 * @return {undefined}  undefined
 */
submitcontact.onsubmit = function(e) {
  e.preventDefault();
  e.stopPropagation();
  var contactemail = document.getElementById('contactemail');
  if(contactemail.value) {
    var match = contactemail.value.match(/^[\w.!#$%&'*+\-\/=?\^`{|}~]+@[a-z\d\-]+(\.[a-z\d\-]+)+$/i);
    if(match) {
      callEmail(match[0]);
      if(emailList.indexOf(contactemail.value) < 0){
        addEmailObject(contactemail.value);
      }
    }
  }
};

function callEmail(email) {
  if(!pc) {
    if(!!RTCPeerConnectionID) {
      pc = new RTCPeerConnectionID(PCCONFIG, PCCONSTRAINTS);
    }
    else {
      pc = new RTCPeerConnection(PCCONFIG, PCCONSTRAINTS);
    }

    if(pc.setIdentityProvider) {
      pc.setIdentityProvider(idp_provider, idp_protocol, idp_username);
    }
  }

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
      if(debug) console.log("ice cand: " + event.candidate);
      if (event.candidate) {
        socket.emit('iceCandidate', email, event.candidate);
      }
    };

    if(debug) trace("Adding Local Stream to peer connection");
    pc.createOffer(
      function (offer) {
        pc.setLocalDescription(new RTCSessionDescription(offer));
        if(debug) trace("Created offer \n" + offer.sdp);
        socket.emit('offer', email, { type: offer.type, sdp: offer.sdp });
        // update UI
        callbtn.innerHTML = "Calling " + email + "...";
        callbtn.disabled = true;
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
      socket.emit('answer', email, { type: ans.type, sdp: ans.sdp });
      current_call = email;
    }, null, null);
  }, function(err){
    if(debug) trace('offer FAILED set as remote description');
    console.log(err);
  });
}

function activateIncomingCallFavicon() {
  var link;
  if(isFirefox) {
    link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = '/icons/incoming.gif';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  else {
    var context = favicanvas.getContext('2d');
    link = document.getElementById('favicon');
    favicontimer = setInterval(function() {
      context.rect(0,0,300,300);
      context.fillStyle = '#22FF07';
      context.fill();
      link.href = favicanvas.toDataURL();
      favicontimer2 = setTimeout(function() {
        context.rect(0,0,300,300);
        context.fillStyle = 'rgb(235,57,221);';
        context.fill();
        link.href = favicanvas.toDataURL();
      }, 400);
    }, 800);
  }
}

function deactivateIncomingCallFavicon() {
  clearTimeout(favicontimer);
  clearTimeout(favicontimer2);
  var link = document.createElement('link');
  link.type = 'image/x-icon';
  link.rel = 'shortcut icon';
  link.href = '/icons/favicon.ico';
  document.getElementsByTagName('head')[0].appendChild(link);
}

socket.on('offer', function(email, offer) {
  if(!pc) {
    if(!!RTCPeerConnectionID) {
      pc = new RTCPeerConnectionID(PCCONFIG, PCCONSTRAINTS);
    }
    else {
      pc = new RTCPeerConnection(PCCONFIG, PCCONSTRAINTS);
    }

    if(pc.setIdentityProvider) {
      pc.setIdentityProvider(idp_provider, idp_protocol, idp_username);
    }
  }
  trace('Received offer: ' + offer.sdp);
  if(!current_call) {
    activateIncomingCallFavicon();
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
      deactivateIncomingCallFavicon();
    });
    callRequestDialog = setTimeout(function() {
      alertify.closeOpen();
      deactivateIncomingCallFavicon();
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
  if(!pc) {
    if(!!RTCPeerConnectionID) {
      pc = new RTCPeerConnectionID(PCCONFIG, PCCONSTRAINTS);
    }
    else {
      pc = new RTCPeerConnection(PCCONFIG, PCCONSTRAINTS);
    }

    if(pc.setIdentityProvider) {
      pc.setIdentityProvider(idp_provider, idp_protocol, idp_username);
    }
  }
  if(debug) console.log("got candidate from email: " + email);
  if(debug) console.log(JSON.stringify(cand));
  pc.addIceCandidate(new RTCIceCandidate(cand));
});

$(".alert").alert();

/*
* bind event to toggle between smaller and larger out going video box
*/
$("#outgoingvid").click(function(){
  var width = $("#outgoingvid").width();
  //toggle between 150px and 300px;
  if (width > 150){
    width = 150;
  }
  else{
    width = 300;
  }
  $("#outgoingvid").animate({
      width: width
    }, 500);
});

  /*
  creates cookies
  @param {String} name -  of coookie
  @param {String} valie - value of coookie
  @param {number} days -  number of days for coookie to stay active
  */
function createCookie(name,value,days) {
  if (days) {
    var date = new Date();
    date.setTime(date.getTime()+(days*24*60*60*1000));
    var expires = "; expires="+date.toGMTString();
  }
  else var expires = "";
  document.cookie = name+"="+value+expires+"; path=/";
}

  /*
  creates cookies
  @param {String} name -  of coookie
  @return {String} valie - value of coookie
  */

function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

  /*
  * erases cookies
  * @param {String} name -  of coookie
  */
function eraseCookie(name) {
  createCookie(name,"",-1);
}

  /*
  * adds email to list of cookies
  * @param {String} email -  email address string
  */
function addEmailtoCookies(email){
  console.log("adding email to cookie: " + email)
  var emailListString = readCookie("emails");
  if(!emailListString){
    console.log("creating emails");
    createCookie('emails', "");
    emailListString = "";
  }
  console.log(emailListString);
  emailListString = emailListString + "," + email;
  createCookie("emails", emailListString);
}

  /*
  * creates emails buttons from list of emails stored in cookies
  */
function createEmailButtonsFromCookies(){
  var emailCookie = readCookie("emails");
  var tempEmailArray;
  if(emailCookie){
    tempEmailArray = emailCookie.split(',');
    tempEmailArray.forEach(function (elem){
      if (emailList.indexOf(elem) < 0 && elem.length > 0){  //don't add duplicates or 0 length strings
        addEmailButton(elem);
        emailList.push(elem);
      }
    });
  }
}


  /*
  * adds email button to the DOM
  * @param {String} email -  email address string
  */
function addEmailButton(email){
  var emailElem =  $( "<div/>",
  {
    "class":"emailShortcut btn btn-info"
  });

  $(emailElem).append(email);

  var removeIconElement = $("<i/>",
    {
      "class" : "fa fa-times-circle-o remove-icon"
    });

  $(removeIconElement).click(function(){
    console.log("removing eamil");
    removeEmailFromCookies(email);
    $(emailElem).remove();

  })

  $(emailElem).append(removeIconElement);

  $(emailElem).click(function(){
    callEmail($(emailElem)[0].textContent);
  });
  $(emailElem).insertAfter(".place-call");
}

function addEmailObject(email){
  if (emailList.indexOf(email) < 0 && email.length > 0){  //don't add duplicates or 0 length strings
    emailList.push(email);
    addEmailButton(email);
    addEmailtoCookies(email);
  }
  else
    throw "duplicate email";
}

$(document).ready(function(){
  createEmailButtonsFromCookies();
});

function removeEmailFromCookies(email){
  var index = emailList.indexOf(email);
  if(index < 0){
    throw "email not in list";
    return;
  }
  emailList.splice(index,1);
  createCookie("emails", emailList.toString());
};