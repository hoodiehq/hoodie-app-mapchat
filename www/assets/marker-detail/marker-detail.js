(function($, hoodie, ich, Config){

  var $document = $(document);
  var $window = $(window);
  var $body = $(document.body);
  var $el, $marker;
  var currentMarker = {};

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
    $el = $('#marker-detail')
    $marker = $el.find(' > article')
  }

  //
  // bind to outside events
  //
  function bindToEvents() {
    $el.on('click', '.close', hide)
    $el.on('click', '.edit', edit)
    $el.on('click', '.destroy', destroy)
    $el.on('click', '.expand', show)
    $el.on('change', 'select[name=template]', setTemplate)
    $el.on('focus', 'textarea', showForm)
    $el.on('submit', '.marker', save)
    $el.on('submit', '.message', saveMessage)

    //$document.on('marker:edit', edit)
    $document.on('marker:show', show)
    $document.on('marker:activate', show)

    $document.on('markerlist:open', layoutPreview);
    $document.on('markerlist:close', layoutPreview);

    hoodie.store.on('add:marker', handleNewMarker )
    hoodie.account.on('signout', hide )
  }

  //
  //
  //
  function show(event, markerId) {
    console.log("show: ",markerId);
    if (isCurrentMarker(markerId)) {
       detail(markerId)
       return
     }

     if ( mode() === 'hide') {
       setMode('show')
       preview(markerId)
       return
     }

     hoodie.store.find('marker', markerId)
     .then( render )
     .then( layoutPreview );
  }

  //
  //
  //
  function showForm () {
    var currentScrollTop = $window.scrollTop()
    if (currentScrollTop < 200) {
      $body.animate({scrollTop: 200}, 300)
      $.event.trigger('map:center', [currentMarker, { y: currentScrollTop - 200 }])
    }
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
  function preview(markerId) {
    if (! markerId) markerId = currentMarker.id;
    hoodie.store.find('marker', markerId)
    .then( render )
    .then( layoutPreview );

    subscribeToScroll()
  }

  // Calculate preview header height and scroll accordingly
  // because we need to accomodate various text lengths
  //
  function layoutPreview() {
    var $markerDetail = $('#marker-detail article.marker > header');
    var markerDetailHeaderHeight = $markerDetail.height() + 20;
    $el.addClass('preview');
  }

  //
  //
  //
  function detail(markerId) {
    if (! markerId) markerId = currentMarker.id;

    // if already expanded, close it.
    if ( $window.scrollTop() > 110 ) {
      hide()
      return
    }

    var maxScroll = $window.height() - 110
    var scrollTop = $window.scrollTop()
    var diff = maxScroll - scrollTop
    if ( scrollTop < maxScroll) {

      hoodie.store.find('marker', markerId).then( function(marker) {
        $.event.trigger('map:center', [marker, { y: diff / 2 }])
      })

      $body.animate({scrollTop: maxScroll}, 300)
    }

    hoodie.store.find('marker', markerId)
    .then( render );

    subscribeToScroll()
  }

  //
  //
  //
  function isCurrentMarker(marker) {
    return currentMarker.id === (marker.id || marker)
  }

  //
  //
  //
  function isntCurrentMarker(marker) {
    return currentMarker.id !== (marker.id || marker)
  }

  //
  //
  //
  function mode() {
    return $el.data('mode')
  }

  //
  //
  //
  function setMode(mode) {
    $el.attr('data-mode', mode)
    $el.data('mode', mode)
  }

  //
  //
  //
  function render(marker) {
    _addMessagesToMarker(marker)
    .then( function(marker) {
      if (marker && marker.type === 'marker') {
        // update current marker
        currentMarker = marker
      } else {
        // update current marker
        marker = currentMarker
      }

      // defaults
      marker.name = marker.name || t("noName")

      // add time ago
      marker.createdTimeAgo = $.timeago(marker.createdAt)

      // is it mine?
      marker.belongsToMe = marker.createdBy === hoodie.account.ownerHash

      var html = ich.show($.extend(marker, {Config: Config}));
      $el.html( html )
      translate()
    }.bind(this))
  }

  //
  //
  //
  function translate ( $tree ) {
    $tree || ( $tree = $el)
    $tree.find('.date').timeago()
    document.webL10n.translate($tree[0])
  }

  //
  //
  //
  function hide() {
    console.log("hide: ",hide);
    var scrollTop = $window.scrollTop()
    $.event.trigger('map:center', [currentMarker, { y : -scrollTop}])
    currentMarker = {}
    unsubscribeFromScroll()
    $.event.trigger('marker:deactivate')

    $body.animate({scrollTop: 0}, 200, function() {
      setMode('hide')
    }.bind(this))
  }

  // Triggered when this client adds a new marker
  //
  //
  function handleNewMarker(marker, options){

    // ignore remote marker
    if (options.remote) {
      return
    }
    if(marker.createdByName === hoodie.account.username){
      setMode('show')
      showEditView(marker)
    }
  }

  // Triggered when this client edits an existing marker
  //
  //
  function edit( event, markerId ) {
    if(!markerId){
      markerId = $(event.target).closest('[data-id]').data('id');
    }
    setMode('show')
    hoodie.store.find('marker', markerId).then( function(marker) {
      showEditView(marker)
    })
  }

  function showEditView(marker){
    currentMarker = marker;
    var html = ich.edit($.extend(marker, {Config: Config}));
    $el.html( html )
    translate()
    $body.animate({scrollTop: 9999}, 300)
    $('#marker-detail input:eq(0)').focus()
  }

  //
  //
  //
  function setTemplate(event) {
    var $select   = $el.find('select[name=template]')
    var $textarea = $el.find('textarea[name=messageBody]')

    var template = $select.val()
    var text = $textarea.val()

    // reset
    $select.val('')

    if (text) {
      text += " " + template
    } else {
      text = template
    }
    $textarea.val( text )
  }

  //
  //
  //
  function save(event) {
    event.preventDefault()
    var name = $el.find('input[name=name]').val()
    if(!name){
      name = $el.find('header h3 span').text()
    }
    hoodie.store.update('marker', currentMarker.id, {name: name})
    .then( render )
    $body.animate({scrollTop: 9999}, 300)
  }


  //
  //
  //
  function saveMessage(event) {
    event.preventDefault()

    var message = {
      messageBody: $el.find('form.message textarea[name=messageBody]').val(),
      createdByName: hoodie.account.username,
      parent : "marker/" + currentMarker.id
    }
    hoodie.store.add('message',  message)
    .then( function() { render() }.bind(this) )
  }

  //
  //
  //
  function destroy(event) {
    event.preventDefault()

    if( ! confirm("are you sure? ")) {
      return
    }

    var id = currentMarker.id
    hoodie.store.removeAll( _filterMessagesFor({id: id}))
    hoodie.store.remove( 'marker', id)
    currentMarker = {}
  }


  //
  //
  //
  function subscribeToScroll() {
    unsubscribeFromScroll()
    $window.on('scroll', handleScroll)
  }

  //
  //
  //
  function unsubscribeFromScroll() {
    $window.unbind('scroll', handleScroll)
    window.clearTimeout( _scrollEndTimeout )
  }

  //
  //
  //
  var _scrollEndTimeout = null
  function handleScroll(event) {
    window.clearTimeout( _scrollEndTimeout )
    _scrollEndTimeout = window.setTimeout( checkScrollPosition, 150 )
  }

  //
  //
  //
  function checkScrollPosition () {
    return;
    var scrollTop = $window.scrollTop()

    if (scrollTop < 80) {
      $body.animate({scrollTop: 0}, 200, hide)
    }
  }

  // private

  //
  //
  //
  function _addMessagesToMarker( marker ) {
    return hoodie.store.findAll( _filterMessagesFor(marker) ).then( function(messages) {
      marker.options || (marker.options = {})
      marker.options.messages = messages || []
      return marker;
    })
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