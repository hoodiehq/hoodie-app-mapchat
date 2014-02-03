(function(document, window, $, hoodie, ich, Config){

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
    $el.on('click', '.marker h3 a', show)
    $el.on('click', '.marker header .comment a', show)
    $el.on('change', 'select[name=template]', setTemplate)
    $el.on('submit', 'form.marker', save)
    $el.on('submit', 'form.message', saveMessage)

    //$document.on('marker:edit', edit)
    $document.on('marker:show', show)
    $document.on('marker:activate', show)

    hoodie.store.on('marker:add', handleNewMarker )
    hoodie.store.on('message:add', handleNewMessage )
    hoodie.account.on('signout', hide )
  }

  //
  //
  //
  function show(event, markerId) {
    console.log("show: ",markerId);
    event.preventDefault();
    if(!markerId){
      markerId = $(event.target).closest('[data-id]').data('id')
    }

    if (isCurrentMarker(markerId) || $el.hasClass('detail')) {
      detail(markerId)
      return
    }

    hoodie.store.find('marker', markerId)
    .then( render )
    .then( $el.removeClass('detail hide').addClass('preview') );

  }

  //
  //  Hide marker panel completely
  //
  function hide() {
    $el.removeClass('detail preview').addClass('hide')
    if(currentMarker){
      $.event.trigger('marker:deactivate', [currentMarker.id]);
    }
    $.event.trigger('map:setstate', ['map']);
    currentMarker = null;
  }

  //
  //  Show only the marker's header
  //
  function preview(markerId) {
    console.log("preview: ",markerId);
    if (! markerId) markerId = currentMarker.id;
    hoodie.store.find('marker', markerId)
    .then( render )
    .then( $el.removeClass('detail hide').addClass('preview') );
  }

  //
  //
  //
  function detail(markerId) {
    console.log("detail: ",markerId);
    if (! markerId) markerId = currentMarker.id;

    $el.removeClass('hide preview').addClass('detail')
    if(!$el.hasClass('preview')){
      $.event.trigger('list:hide');
      // This is a different marker than the one whose preview we've loaded,
      // so load the new marker
      hoodie.store.find('marker', markerId)
      .then( render );
    }
  }

  //
  //
  //
  function isCurrentMarker(marker) {
    if(!currentMarker) return false
    return currentMarker.id === (marker.id || marker)
  }

  //
  //
  //
  function isntCurrentMarker(marker) {
    if(!currentMarker) return true
    return currentMarker.id !== (marker.id || marker)
  }

  //
  //
  //
  function render(marker) {
    console.log("render: ",marker);
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
      marker.belongsToMe = marker.createdBy === hoodie.id()

      var html = ich.show($.extend(marker, {Config: Config}));
      $el.html( html )
      translate()
      $.event.trigger('map:resize');
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

  // Triggered when this client adds a new marker
  //
  //
  function handleNewMarker(marker, options){

    // ignore remote marker
    if (options.remote) {
      return
    }
    if(marker.createdByName === hoodie.account.username){
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
    hoodie.store.find('marker', markerId).then( function(marker) {
      showEditView(marker)
    })
  }

  function showEditView(marker){
    currentMarker = marker;

    var html = ich.edit($.extend(marker, {Config: Config}));
    $el.find('article > header h3').replaceWith(html)

    translate()
    $.event.trigger('map:resize');
    $('#marker-detail input:eq(0)').focus()
  }

  //  Checks if any new messages belong to the currently open marker and re-renders if so
  //
  //
  function handleNewMessage(message){
    if(message.parent === "marker/"+currentMarker.id){
      render(currentMarker)
    }
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
    console.log("save: ",event);
    event.preventDefault()
    var name = $el.find('input[name=name]').val()
    if(!name){
      name = $el.find('header h3 span').text()
    }
    hoodie.store.update('marker', currentMarker.id, {name: name})
    .then( render )
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
})(document, window, jQuery, hoodie, ich, Config);
