var socket = io.connect();
var signinLink = document.getElementById('signin');
var currentUser = null;

if (signinLink) {
  signinLink.onclick = function() {
    if(navigator.id) {
      if(currentUser) {
        navigator.id.logout();
      }
      else navigator.id.request();
    }
  };
}

if(navigator.id) {
  navigator.id.watch({
    loggedInUser: currentUser,
    onlogin: function(assertion) {
      $.post('/login',
        { assertion: assertion },
        function(data) {
          window.location = JSON.parse(data).location;
        }
      );
      // socket.emit('signin', { assertion: assertion });
    },
    onlogout: function() {
      // socket.emit('signout');
    }
  });
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
