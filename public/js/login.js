var signinLink = document.getElementById('signin');
var currentUser = null;

if (signinLink) {
  signinLink.onclick = function() {
    navigator.id.request();
  };
}

if(navigator.id) {
  navigator.id.watch({
    onlogin: function(assertion) {
      $.post('/login',
        { assertion: assertion },
        function(data) {
          window.location = JSON.parse(data).location;
        }
      );
    },
    onlogout: function() {
      // we don't handle logout on this page
    }
  });
}
