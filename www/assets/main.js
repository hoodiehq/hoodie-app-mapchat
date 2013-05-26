// Set correct Hoodie API endpoint depending on where the app is running
var HOODIE_API_URL;
if (/github\.io$/.test(location.hostname)) {
  HOODIE_API_URL = 'http://hoodie-mapchat.jit.su/_api';
} 

// Init Hoodie and tell it where it's API is
window.hoodie = new Hoodie(HOODIE_API_URL)

var onPageLoad = function() {

  // FastClick makes mobile devices respond quicker to touch events
  new FastClick(document.body);

  App.init()
};

// helper for binding methods to specificed contexts
bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },

// init on page load
$( onPageLoad )