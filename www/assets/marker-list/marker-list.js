(function($, hoodie, ich, Config){

  var $document = $(document);
  var $el, $content, $search, $body;

  //
  // init gets run when app:ready event gets fired
  // on app startup.
  //
  function init() {
    findElements()
    bindToEvents()
    renderMarkers()
    resize()
  }
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
  // bind to outside events
  //
  function bindToEvents() {
    $el.on('click', '.list li', triggerMarkerActivation)
    $el.on('input change', $search, handleSearch)

    $document.on('marker:activate', handleMarkerActivation)
    $document.on('app:resize', resize)

    hoodie.store.on('change clear', renderMarkers )
    hoodie.account.on('signout', hide )

    $('.toggle-marker-list').on('click', handleToggleMarkerListClick);
  }

  //
  //
  //
  function resize() {
    var ww = $(window).width()
    var wh = $(window).height()
    console.log("resize: ",ww, wh);
    var headerHeight = $el.find('header').outerHeight(true);
    $el.find('.content').height(wh-headerHeight);
  }

  //
  //
  //
  function handleSearch(event) {
    var searchTerm = $(event.target).val().toLowerCase();
    if(searchTerm){
      $('.markerListItem').each(function(index, item){
        var name = $(item).find('.name').text() + $(item).find('.owner').text() ;
        if(name.toLowerCase().indexOf(searchTerm) == -1){
          $(item).addClass('hidden')
        } else {
          $(item).removeClass('hidden')
        }
      });
    } else {
      $('.markerListItem').removeClass('hidden')
    }
  }

  //
  //
  //
  function triggerMarkerActivation(event) {
    event.preventDefault()
    $.event.trigger('marker:activate', $(event.currentTarget).data('id') )
  }

  //
  //
  //
  function handleToggleMarkerListClick(event) {
    event.preventDefault()
    event.stopPropagation()
    toggle()
  }

  //
  //
  //
  function handleMarkerActivation(event, id) {
    console.log("handleMarkerActivation: ",id);
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

      html = ich.markerList($.extend(data, {Config: Config}));
      $content.html( html )
      translate( $content )
    }.bind(this) )
  }

  //
  //
  //
  function translate ( $tree ) {
    $tree || ( $tree = $el)
    document.webL10n.translate($tree[0])
  }

  //
  //
  //
  function show() {
    $el.attr('data-mode', 'show')
    $el.data('mode', 'show')

  }

  //
  //
  //
  function hide() {
    $el.attr('data-mode', 'hide')
    $el.data('mode', 'hide')
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

})(jQuery, hoodie, ich, Config);