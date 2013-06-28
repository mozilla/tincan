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
    },
    onlogout: function() {
    }
  });
}
