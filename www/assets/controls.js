var Controls = {
  isInitialized : false,
  init : function() {
    this.$el = $('#controls')

    this.findElements()
    this.bindToEvents()
  },

  findElements : function() {
    this.$leafletControls = $('.leaflet-control-container')
    this.$geolocateButton = this.$el.find('.geolocation')
  },

  bindToEvents : function() {
    this.$el.on('click','.geolocate' , this.handleGeolocateClick);
    this.$el.on('click','.bookmark' , this.handleBookmarkSelect);

    $(document).on("map:geolocated", this.handleGeolocateDone)
    $(document).on("map:geolocation:error", this.handleGeolocateDone)
  },

  show : function() {
    if (! this.isInitialized ) this.init();
    this.$el.removeClass('hide')
    this.$leafletControls.show()
  },

  hide : function() {
    if (! this.isInitialized ) this.init();
    this.$el.addClass('hide')
    this.$leafletControls.hide()
  },

  handleGeolocateClick : function(event) {
    event.preventDefault()
    this.$geolocateButton.addClass('loading');
    $.event.trigger("map:geolocate")
  },

  handleGeolocateDone : function(event) {
    this.$geolocateButton.removeClass('loading');
  },

  handleBookmarkSelect : function(event) {
    event.preventDefault()
    var $el = $(event.target)
    console.log($el.text(), $el.data(), $el.data('zoom'))
    Map.setView($el.data(), $el.data('zoom'))
  }
}

Controls.handleToggleMarkeListClick = bind(Controls.handleToggleMarkeListClick, Controls)
Controls.handleGeolocateClick = bind(Controls.handleGeolocateClick, Controls)
Controls.handleGeolocateDone = bind(Controls.handleGeolocateDone, Controls)
Controls.handleGeolocateDone = bind(Controls.handleGeolocateDone, Controls)
Controls.handleGeolocateDone = bind(Controls.handleGeolocateDone, Controls)
Controls.handleBookmarkSelect = bind(Controls.handleBookmarkSelect, Controls)