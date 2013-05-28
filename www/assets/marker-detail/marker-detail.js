var DetailView = {
  isInitialized : false,
  currentMarker : {},
  init : function() {
    this.findElements()
    this.bindToEvents()
  },

  findElements : function() {
    this.$el = $('#marker-detail')
    this.$marker = this.$el.find(' > article')
    this.$body = $('body')
  },

  bindToEvents : function() {
    this.$el.on('click', '.close', this.hide)
    this.$el.on('click', '.edit', this.edit)
    this.$el.on('click', '.destroy', this.destroy)
    this.$el.on('click', '.expand', this.show)
    this.$el.on('submit', '.marker', this.save)
    this.$el.on('submit', '.message', this.saveMessage)

    $(document).on('marker:edit', this.edit)
    $(document).on('marker:show', this.show)
    $(document).on('marker:activate', this.show)
  },

  show : function(event, markerId) {
    if (this.isCurrentMarker(markerId)) {
      this.detail(markerId)
      return
    }

    if ( this.mode() === 'hide') {
      this.setMode('show')
      this.preview(markerId)
      return
    }

    if ( $(window).scrollTop() < 100) {
      $('body').animate({scrollTop: 100}, 500)
    }

    hoodie.store.find('marker', markerId)
    .then( this.render );
  },

  preview : function(markerId) {
    if (! markerId) markerId = this.currentMarker.id;

    if ( $(window).scrollTop() < 100) {
      $('body').animate({scrollTop: 100}, 500)
    }

    hoodie.store.find('marker', markerId)
    .then( this.render );

    this.subscribeToScroll()
  },

  detail : function(markerId) {
    if (! markerId) markerId = this.currentMarker.id;

    // if already expanded, close it.
    if ( $(window).scrollTop() > 100 ) {
      this.hide()
      return
    }

    var maxScroll = $(window).height() - 100
    if ( $(window).scrollTop() < maxScroll) {
      $('body').animate({scrollTop: maxScroll}, 500, function() {
        hoodie.store.find('marker', markerId).then( function(marker) {
          $.event.trigger('map:center', marker)  
        })
      })

    }

    hoodie.store.find('marker', markerId)
    .then( this.render );

    this.subscribeToScroll()
  },

  isCurrentMarker : function(marker) {
    return this.currentMarker.id === (marker.id || marker)
  },
  isntCurrentMarker : function(marker) {
    return this.currentMarker.id !== (marker.id || marker)
  },

  mode : function() {
    return this.$el.data('mode')
  },

  setMode : function(mode) {
    this.$el.attr('data-mode', mode)
    this.$el.data('mode', mode)
  },

  render : function(marker) {
    this._addMessagesToMarker(marker)
    .then( function(marker) {
      if (marker && marker.type === 'marker') {
        // update current marke
        this.currentMarker = marker
      } else {
        // update current marke
        marker = this.currentMarker
      }

      // add time ago
      marker.createdTimeAgo = $.timeago(marker.createdAt)

      // is it mine?
      marker.belongsToMe = marker.createdBy === hoodie.account.ownerHash

      var html = ich.show(marker);
      this.$el.html( html )
      this.$el.find('.date').timeago()
    }.bind(this))
  },

  hide : function() {
    $('body').animate({scrollTop: 0}, 200, function() {
      this.setMode('hide')
      $.event.trigger('marker:deactivate')
      $.event.trigger('map:center', this.currentMarker)
      this.currentMarker = {}
      this.unsubscribeFromScroll()
    }.bind(this))
  },

  edit : function( event, markerId ) {
    this.setMode('show')

    if (! markerId) markerId = this.currentMarker.id;

    hoodie.store.find('marker', markerId)
    .then( function(marker) {
      var html = ich.edit(marker);
      this.$el.html( html )

      $('body').animate({scrollTop: 9999}, 500)
    }.bind(this) );

    
  },

  save : function(event) {
    event.preventDefault()
    var name = this.$el.find('input[name=name]').val()
    hoodie.store.update('marker', this.currentMarker.id, {name: name})
    .then( this.render )
    $('body').animate({scrollTop: 9999}, 500)
  },


  saveMessage : function(event) {
    event.preventDefault()
    
    var message = {
      messageBody: this.$el.find('form.message textarea[name=messageBody]').val(),
      createdByName: hoodie.account.username,
      parent : "marker/" + this.currentMarker.id
    }
    hoodie.store.add('message',  message)
    .then( function() { this.render() }.bind(this) )
  },

  destroy : function(event) {
    event.preventDefault()

    if( ! confirm("are you sure? ")) {
      return
    }

    var id = this.currentMarker.id
    hoodie.store.removeAll( this._filterMessagesFor({id: id}))
    hoodie.store.remove( 'marker', id)
    this.currentMarker = {}
  },


  subscribeToScroll : function() {
    this.unsubscribeFromScroll()
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
  },
  checkScrollPosition : function () {
    var scrollTop = $(window).scrollTop()

    console.log('scrollTop', scrollTop)

    if (scrollTop < 80) {
      $('body').animate({scrollTop: 0}, 200, this.hide)
    }
  },

  // private
  _addMessagesToMarker : function( marker ) {
    return hoodie.store.findAll( this._filterMessagesFor(marker) ).then( function(messages) {
      marker.options || (marker.options = {})
      marker.options.messages = messages || []
      return marker;
    })
  },

  _filterMessagesFor : function(marker) {
    return function(object) {
      return object.type === 'message' && object.parent == "marker/" + marker.id
    };
  }
}


DetailView.render = bind(DetailView.render, DetailView)
DetailView.show = bind(DetailView.show, DetailView)
DetailView.hide = bind(DetailView.hide, DetailView)
DetailView.edit = bind(DetailView.edit, DetailView)
DetailView.save = bind(DetailView.save, DetailView)
DetailView.saveMessage = bind(DetailView.saveMessage, DetailView)
DetailView.destroy = bind(DetailView.destroy, DetailView)
DetailView._addMessagesToMarker = bind(DetailView._addMessagesToMarker, DetailView)
DetailView.previewMarker = bind(DetailView.previewMarker, DetailView)
DetailView.handleScroll = bind(DetailView.handleScroll, DetailView)
DetailView.checkScrollPosition = bind(DetailView.checkScrollPosition, DetailView)