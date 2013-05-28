// Set correct Hoodie API endpoint depending on where the app is running
var HOODIE_API_URL;
if (/github\.io$/.test(location.hostname)) {
  HOODIE_API_URL = 'http://hoodie-mapchat.jit.su/_api';
}

// Init Hoodie and tell it where it's API is
var hoodie = new Hoodie(HOODIE_API_URL)

// getting rid of this one soon
bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },

(function($){

  var $document = $(document)

  //
  // gets executed when dom ready
  //
  function init (event) {

    // FastClick makes mobile devices respond quicker to touch events
    new FastClick(document.body);

    var throttledResize = _.throttle(sendResizeEvent, 300);
    $(window).on('resize', function(event){
      throttledResize();
    })

    $.event.trigger('app:ready')
  }
  $document.ready( init )

  function sendResizeEvent() {
    $.event.trigger('app:resize')
  }

})(jQuery);


// Set the 'lang' and 'dir' attributes to <html> when the page is translated
window.addEventListener('localized', function() {
  document.documentElement.lang = document.webL10n.getLanguage();
  document.documentElement.dir = document.webL10n.getDirection();
}, false);