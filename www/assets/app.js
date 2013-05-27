var App = {
  init : function() {
    
    this.bindToEvents();

    Map.show();
    MarkerList.init();
    DetailView.init();

    // If no-one is logged in, show the login screen
    if(! hoodie.account.username){
      Login.show();
    } 
  },

  // bind to DOM & Hoodie events
  bindToEvents : function() {

  }
}

