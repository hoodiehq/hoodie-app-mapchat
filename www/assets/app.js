// Set correct Hoodie API endpoint depending on where the app is running
var HOODIE_API_URL;
if (! /(localhost|\.dev)$/.test(location.hostname)) {
  // when running localy, use standard andpoint (defaults to /_api)
  HOODIE_API_URL = Config.hoodieUrl;
}

// Init Hoodie and tell it where it's API is
var hoodie = new Hoodie(HOODIE_API_URL)
var t = document.webL10n.get;

// getting rid of this one soon
bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },

(function(window, document, $){

  var $document = $(document)
  var $window = $(window)
  var $el

  //
  // gets executed when dom ready
  //
  function init (event) {

    // FastClick makes mobile devices respond quicker to touch events
    new FastClick(document.body);

    // localization
    document.documentElement.lang = document.webL10n.getLanguage();
    document.documentElement.dir = document.webL10n.getDirection();
    

    var throttledResize = _.throttle(sendResizeEvent, 300);
    $window.on('resize', function(event){
      throttledResize();
    })

    findElements()
    render()
    // $.event.trigger('app:ready')
  }
  window.addEventListener('localized', init, false);


  //
  //
  //
  function findElements() {
    $el = $('html')
  }


  //
  //
  //
  function render() {
  }


  // 
  // 
  // 
  function sendResizeEvent() {
    $.event.trigger('app:resize')
  }

})(window, document, jQuery);