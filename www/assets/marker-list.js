var MarkerList = {
  isInitialized : false,
  init : function() {
    this.$el = $('#markerList')

    this.findElements()
    this.bindToEvents()

    // load existing markers
    this.renderMarkers()

    this.isInitialized = true
  },

  findElements : function() {
    this.$content = this.$el.find('.content')
    this.$search = this.$el.find('input[type=search]')
    this.$body = $('body')
  },

  bindToEvents : function() {
    this.$el.on('click', '.list li', this.handleMarkerSelect)
    
    $(document).on('marker:activate', this.handleMarkerActivate)
    hoodie.store.on('change clear', this.renderMarkers )
    $('.toggle-marke-list').on('click', this.handleToggleMarkeListClick);
  },

  handleMarkerSelect : function(event) {
    event.preventDefault()

    var $marker = $(event.currentTarget)
    var id = $marker.data('id')
    $.event.trigger('marker:activate', id )
  }, 

  handleToggleMarkeListClick : function(event) {
    event.preventDefault()
    event.stopPropagation()
    this.toggle()
  },

  handleMarkerActivate : function(event, id) {
    var $items = this.$el.find('[data-id]')
    $items.removeClass('active');
    $items.filter('[data-id='+id+']').addClass('active');
  },

  addMessagesToMarkers : function( markers ) {
    var promises = markers.map( function( marker ){
      marker.options = {};
      return hoodie.store.findAll( this._filterMessagesFor(marker) ).then( function(messages) {
        marker.options.messages = messages
        return marker;
      })
    }.bind(this));

    // resolve all promises, and turn array of arguments into one array
    return $.when.apply($, promises).then( function() {
      return Array.prototype.slice.apply(arguments) 
    });
  },

  addTimeAgoToMarkers : function( markers ) {
    return markers.map( function( marker ){
      marker.createdTimeAgo = $.timeago(marker.createdAt)
      return marker;
    }.bind(this));
  },

  renderMarkers : function( markers) {
    var html;
    var data = {};

    hoodie.store.findAll('marker')
    .then( this.addMessagesToMarkers )
    .then( this.addTimeAgoToMarkers )
    .then( function(markers) {
      if(markers.length !== 0){
        data.data = {markers: markers};
      }

      html = ich.markerList(data);
      this.$content.html( html )
    }.bind(this) )
  },

  show : function() {
    this.$el.attr('data-mode', 'show')
    this.$el.data('mode', 'show')
    this.subscribeToScroll()
  },

  hide : function() {
    this.$el.attr('data-mode', 'hide')
    this.$el.data('mode', 'hide')
    this.unsubscribeFromScroll()
  },

  toggle : function() {
    if ( this.$el.data('mode') === 'hide' ) {
      this.show()
    } else {
      this.hide()
    }
  },


  subscribeToScroll : function() {
    $(window).on('scroll', this.handleScroll)
  },
  unsubscribeFromScroll : function() {
    $(window).unbind('scroll', this.handleScroll)
    window.clearTimeout( this._scrollEndTimeout )
  },

  _scrollEndTimeout : null,
  handleScroll : function(event) {
    window.clearTimeout( this._scrollEndTimeout )
    this._scrollEndTimeout = window.setTimeout( this.checkScrollPosition, 150 )
    this.$body.stop(true, true)
  },
  checkScrollPosition : function () {
    var scrollLeft = $(window).scrollLeft()
    if (scrollLeft > 70) {
      this.hide()
    } else {
      this.$body.animate({scrollLeft: 0}, 500)
    }
  },


  // private
  _getReadableTimestamp : function( datetime) {
    var weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunnday"];
    var date = new Date(datetime);
    var weekday = weekdays[date.getDay()];
    return weekday+", "+date.toFormat("DD.MM.YYYY - HH24:MM");
  },

  _filterMessagesFor : function(marker) {
    return function(object) {
      return object.type === 'message' && object.parent == "marker/" + marker.id
    };
  }
}

MarkerList.render = bind(MarkerList.render, MarkerList)
MarkerList.renderMarkers = bind(MarkerList.renderMarkers, MarkerList)
MarkerList.addMessagesToMarkers = bind(MarkerList.addMessagesToMarkers, MarkerList)
MarkerList.handleMarkerSelect = bind(MarkerList.handleMarkerSelect, MarkerList)
MarkerList.handleMarkerActivate = bind(MarkerList.handleMarkerActivate, MarkerList)
MarkerList.handleScroll = bind(MarkerList.handleScroll, MarkerList)
MarkerList.checkScrollPosition = bind(MarkerList.checkScrollPosition, MarkerList)
MarkerList.handleToggleMarkeListClick = bind(MarkerList.handleToggleMarkeListClick, MarkerList)
