var signinLink = document.getElementById('signin');
var currentUser = null;

if (signinLink) {
  signinLink.onclick = function() {
    navigator.id.request();
  };
}

if(navigator.id) {
  navigator.id.watch({
    loggedInUser: currentUser,
    onlogin: function(assertion) {
      $.post(
        '/login',
        { assertion: assertion },
        function(data) {
          if(data=== 'failure') {
            alert('Sign in failed! :(');
            navigator.id.logout();
          }
          else window.location.reload();
        }
      );
    },
    onlogout: function() {
      // we don't handle logout on this page
    }
  });
}
