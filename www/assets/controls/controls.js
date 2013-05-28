(function($, hoodie){

  var $document = $(document);
  var $el, $leafletControls, $geolocateButton;

  // 
  // init gets run when app:ready event gets fired
  // on app startup.
  // 
  function init() {
    findElements()
    bindToEvents()
  };
  $document.on('app:ready', init)

  // 
  // cache jQuery selectors
  // 
  function findElements () {
    $el = $('#controls')
    $leafletControls = $('.leaflet-control-container')
    $geolocateButton = $el.find('.geolocation')
  }

  // 
  // bind to outsite events
  // 
  function bindToEvents() {
    $el.on('click','.geolocate' , handleGeolocateClick);
    $el.on('click','.bookmark' , handleBookmarkSelect);

    $document.on("map:geolocated", handleGeolocateDone)
    $document.on("map:geolocation:error", handleGeolocateDone)
    $document.on("dialog:show", hide)
    $document.on("dialog:hide", show)
  }

  // 
  // 
  // 
  function show() {
    $el.removeClass('hide')
    $leafletControls.show()
  }

  // 
  // 
  // 
  function hide() {
    $el.addClass('hide')
    $leafletControls.hide()
  }

  // 
  // 
  // 
  function handleGeolocateClick (event) {
    event.preventDefault()
    $geolocateButton.addClass('loading');
    $.event.trigger("map:geolocate")
  }

  // 
  // 
  // 
  function handleGeolocateDone (event) {
    $geolocateButton.removeClass('loading');
  }

  // 
  // 
  // 
  function handleBookmarkSelect (event) {
    var $target = $(event.target)
    Map.setView($target.data(), $target.data('zoom'))
  }

})(jQuery, hoodie);