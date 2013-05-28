(function($, hoodie, ich){

  var $document = $(document);
  var $el, $content, $search, $body;

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
    $el = $('#markerList')
    $content = $el.find('.content')
    $search = $el.find('input[type=search]')
    $body = $('body')
  }

  // 
  // bind to outsite events
  // 
  function bindToEvents() {
    $el.on('click', '.list li', handleMarkerSelect)
    
    $document.on('marker:activate', handleMarkerActivate)
    hoodie.store.on('change clear', renderMarkers )
    $('.toggle-marke-list').on('click', handleToggleMarkeListClick);
  }

  // 
  // 
  // 
  function handleMarkerSelect(event) {
    event.preventDefault()

    var $marker = $(event.currentTarget)
    var id = $marker.data('id')
    $.event.trigger('marker:activate', id )
  } 

  // 
  // 
  // 
  function handleToggleMarkeListClick(event) {
    event.preventDefault()
    event.stopPropagation()
    toggle()
  }

  // 
  // 
  // 
  function handleMarkerActivate(event, id) {
    var $items = $el.find('[data-id]')
    $items.removeClass('active');
    $items.filter('[data-id='+id+']').addClass('active');
  }

  // 
  // 
  // 
  function addMessagesToMarkers( markers ) {
    var promises = markers.map( function( marker ){
      marker.options = {};
      return hoodie.store.findAll( _filterMessagesFor(marker) ).then( function(messages) {
        marker.options.messages = messages
        return marker;
      })
    }.bind(this));

    // resolve all promises, and turn array of arguments into one array
    return $.when.apply($, promises).then( function() {
      return Array.prototype.slice.apply(arguments) 
    });
  }

  // 
  // 
  // 
  function addTimeAgoToMarkers( markers ) {
    return markers.map( function( marker ){
      marker.createdTimeAgo = $.timeago(marker.createdAt)
      return marker;
    }.bind(this));
  }

  // 
  // 
  // 
  function renderMarkers( markers) {
    var html;
    var data = {};

    hoodie.store.findAll('marker')
    .then( addMessagesToMarkers )
    .then( addTimeAgoToMarkers )
    .then( function(markers) {
      if(markers.length !== 0){
        data.data = {markers: markers};
      }

      html = ich.markerList(data);
      $content.html( html )
    }.bind(this) )
  }

  // 
  // 
  // 
  function show() {
    $el.attr('data-mode', 'show')
    $el.data('mode', 'show')
    subscribeToScroll()
  }

  // 
  // 
  // 
  function hide() {
    $el.attr('data-mode', 'hide')
    $el.data('mode', 'hide')
    unsubscribeFromScroll()
  }

  // 
  // 
  // 
  function toggle() {
    if ( $el.data('mode') === 'hide' ) {
      show()
    } else {
      hide()
    }
  }


  // 
  // 
  // 
  function subscribeToScroll() {
    $(window).on('scroll', handleScroll)
  }
  // 
  // 
  // 
  function unsubscribeFromScroll() {
    $(window).unbind('scroll', handleScroll)
    window.clearTimeout( _scrollEndTimeout )
  }

  // 
  // 
  // 
  var _scrollEndTimeout = null;
  function handleScroll(event) {
    window.clearTimeout( _scrollEndTimeout )
    _scrollEndTimeout = window.setTimeout( checkScrollPosition, 150 )
    $body.stop(true, true)
  }
  // 
  // 
  // 
  function checkScrollPosition () {
    var scrollLeft = $(window).scrollLeft()
    if (scrollLeft > 70) {
      hide()
    } else {
      $body.animate({scrollLeft: 0}, 500)
    }
  }


  // private
  // 
  // 
  // 
  function _getReadableTimestamp( datetime) {
    var weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunnday"];
    var date = new Date(datetime);
    var weekday = weekdays[date.getDay()];
    return weekday+", "+date.toFormat("DD.MM.YYYY - HH24:MM");
  }

  // 
  // 
  // 
  function _filterMessagesFor(marker) {
    return function(object) {
      return object.type === 'message' && object.parent == "marker/" + marker.id
    };
  }

})(jQuery, hoodie, ich);