var DetailView = {
  isInitialized : false,
  currentMarker : {},
  init : function() {
    this.findElements()
    this.bindToEvents()
  },

  findElements : function() {
    this.$el = $('#detail-view')
    this.$marker = this.$el.find(' > article')
  },

  bindToEvents : function() {
    this.$el.on('click', '.close', this.hide)
    this.$el.on('click', '.edit', this.edit)
    this.$el.on('click', '.destroy', this.destroy)
    this.$el.on('click', '.expand', this.show)
    this.$el.on('submit', '.marker', this.save)
    this.$el.on('submit', '.message', this.saveMessage)

    $(document).on('marker:show', this.show)
    $(document).on('marker:activate', this.show)
  },

  show : function(event, markerId) {
    var template

    if (! markerId) markerId = this.currentMarker.id;

    if ( this.currentMarker.id === markerId || (this.$el.is(':visible') && this.$el.is(':not(.preview)'))) {
      template = 'detail'
      this.$el.removeClass('preview')
    } else {
      template = 'preview'
      this.$el.addClass('preview')
    }

    this.$el.removeClass('hide')
    $.event.trigger('uichange')

    hoodie.store.find('marker', markerId)
    .then( this.render(template) );
  },

  render : function(template) {
    return function(marker) {

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

        var html = ich[template](marker);
        this.$el.html( html )
        this.$el.find('.date').timeago()
      }.bind(this))
      
    }.bind(this)
  },

  hide : function() {
    this.$el.removeClass('preview')
    this.$el.addClass('hide')
    $.event.trigger('uichange')

    $.event.trigger('marker:deactivate')
  },

  edit : function() {
    var html = ich.edit(this.currentMarker);
    this.$el.html( html )
  },

  save : function(event) {
    event.preventDefault()
    var template
    if (this.$el.is('.preview')) {
      template = 'preview' 
    } else {
      template = 'detail'
    }
    var name = this.$el.find('input[name=name]').val()
    hoodie.store.update('marker', this.currentMarker.id, {name: name})
    .then( this.render(template) )
  },


  saveMessage : function(event) {
    event.preventDefault()
    
    var message = {
      messageBody: this.$el.find('form.message textarea[name=messageBody]').val(),
      createdByName: hoodie.account.username,
      parent : "marker/" + this.currentMarker.id
    }
    hoodie.store.add('message',  message)
    .then( this.render('detail') )
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