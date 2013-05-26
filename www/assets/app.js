var App = {
  init : function() {
    
    this.bindToEvents();

    // If no-one is logged in, show the login screen
    if(hoodie.account.username){
      Map.show();
    } else {
      Login.show();
    }
  },

  // bind to DOM & Hoodie events
  bindToEvents : function() {

  }
}

