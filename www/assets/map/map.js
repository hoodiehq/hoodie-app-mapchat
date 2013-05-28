// MapChat module: the actual app
var Map = (function(){

  var map, $map, tileLayer, markers = {};
  var state = 'map';
  var activeMarker;
  var userPosition;
  var desktopBreakpoint = 1280;
  var baseMarkerIcon, defaultMarkerIcon, activeMarkerIcon;

  var _init = function() {
    $('.mainContainer').removeClass('hide');
    $('body').addClass('mapView');

    if (! isInitialized ) {
      initMap();
      registerHoodieEvents();
      registerInterfaceEvents();
      registerMapEvents();
      isInitialized = true
    }

    // show controls
    Controls.show()

    // pre-populate map with markers
    hoodie.store.findAll('marker')
    .then( addAllMarkersFromStoreToMap )
  };

  // Initialize the Leaflet map and its markers
  var isInitialized = false;
  var initMap = function() {

    // Basic Leaflet marker icon that other marker types will inherit from
    baseMarkerIcon = L.Icon.extend({
      options: {
        shadowUrl: 'assets/images/marker-shadow.png',
        iconSize:     [25, 41],
        shadowSize:   [41, 41],
        iconAnchor:   [12, 40],
        shadowAnchor: [14, 40],
        popupAnchor:  [-3, -76],
        labelAnchor:  [-21,-21]
      }
    });

    // The two marker types: default (blue) and active (green)
    defaultMarkerIcon = new baseMarkerIcon({iconUrl: 'assets/images/marker-icon.png'});
    activeMarkerIcon = new baseMarkerIcon({iconUrl: 'assets/images/active-marker-icon.png'});

    // Set up the Leaflet map
    $map = $('#map');

    // Start in Berlin
    map = L.map('map').setView([52.500274,13.419693], 14);
    map.zoomControl.setPosition('bottomright');

    // Load tiles from OpenStreetMap
    tileLayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  }

  // Get notified by Hoodie when remote data changes
  var registerHoodieEvents = function() {
    hoodie.store.on('add:marker', onMarkerFromStore )
    hoodie.store.on('add:message', onMessageFromStore )
    hoodie.store.on('remove:marker', onRemoveMarkerFromStore )
    hoodie.store.on('clear', onRemoveAllMarkers )
  }

  // Register all interface events like clicks, form changes etc.
  var registerInterfaceEvents = function() {

    // Add new markers via touch hold
    $map.hammer().on('hold', onMapHold);

    $(document).on('map:geolocate', geolocate)
    $(document).on('map:center', function (event, marker) {
      centerMapOnCoordinates(marker)
    })
    $(document).on('marker:activate', onMarkerActivate)
    $(document).on('marker:deactivate', onMarkerDeactivate)

    // Window resize
    $(window).on('resize', onResize);
    onResize();
  }

  // Register general Leaflet events
  var registerMapEvents = function() {
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
  }

  // ---------------------
  // Hoodie event handlers
  // ---------------------

  // Displays the new marker on add:marker
  var onMarkerFromStore = function(properties, options) {
    addMarkerToMap(properties);

    // don't highlight markers that came from remote
    if(options.remote === true){
      return
    }

    activateMarker(properties.id);
    centerMapOnCoordinates(properties);
    $.event.trigger('marker:edit', properties.id)
    onResize();
  };

  // Displays the new message whereever it needs to be displayed
  var onMessageFromStore = function(message) {
    var type = message.parent.substring(0, message.parent.indexOf('/'));
    var id = message.parent.substr(message.parent.indexOf('/')+1);
    var $currentMarker = $(".contentContainer [data-id='"+id+"']");
    addMessageToMarkerLabel(id);
    if($currentMarker.length === 0) return;
    var index = $('.contentContainer .messagesContainer li').length + 1;
    addMessageToMessagesContainerList(message, index);
    onResize();
  };

  // Updates views when a marker is removed from Hoodie
  var onRemoveMarkerFromStore = function(properties) {
    map.removeLayer( markers[properties.id] );
    if(activeMarker.options.couchId == properties.id){
      activeMarker = null;
    }
    updateMap();
  };

  // Updates views when all markers are removed
  var onRemoveAllMarkers = function() {
    var markerId
    for(markerId in markers) {
      map.removeLayer( markers[markerId] )
    }
  };

  // ------------------------------
  // Start interface event handlers
  // ------------------------------

  var onMapHold = function(event) {
    addMarker(convertHammerEventToLeafletEvent(event, map));
  }


  var geolocate = function(event) {
    map.locate({setView: true, maxZoom: 16});
  };

  

  var onResize = function() {
    var $contentContainer = $('.contentContainer');
    $contentContainer.css('height', 'auto');
    var padding = 11;
    var targetHeight = $contentContainer.children().outerHeight(true);
    var maxHeight = $(window).height() * 0.66-$('.mainContainer .tabBar').height() - padding;
    if($(window).width() >= desktopBreakpoint){
      targetHeight = $(window).height() - $('.mainContainer .tabBar').height() - padding;
    } else {
      if(targetHeight > maxHeight){
        targetHeight = maxHeight;
        if(state === "detail"){
          updateMap();
          return;
        }
      }
    }
    $contentContainer.css('height', targetHeight);
    updateMap();
  };

  // -----------------------------
  // Additional events for markers
  // -----------------------------

  var onMarkerClick = function(event) {
    var markerId = event.target.options.couchId;

    // if this is the active marker, show it in detail view and nothing else
    if(activeMarker && activeMarker.options.couchId == markerId){
      $.event.trigger("marker:show", markerId)
      updateMap();
      return;
    }

    $.event.trigger("marker:activate", markerId)
  }

  var onMarkerActivate = function(event, markerId) {

    hoodie.store.find('marker', markerId)
    .then( function(marker) {

      centerMapOnCoordinates(marker)
      activateMarker(marker.id);

      var newState;
      var $contentContainer = $('.contentContainer');
    });
  };

  var onMarkerDeactivate = function(event, markerId) {
    deactivateActiveMarker()
  };

  // ------------------
  // Map event handlers
  // ------------------

  var onLocationFound = function(event) {
    $.event.trigger('map:geolocated')

    var radius = event.accuracy / 2;
    if(!userPosition){
      userPosition = L.circle(event.latlng, radius).addTo(map);
    } else {
      userPosition.setLatLng(event.latlng).setRadius(radius);
    }
  };

  var onLocationError = function(event) {
    $.event.trigger('map:geolocation:error')

    if(userPosition) map.removeLayer(userPosition);
    userPosition = null;
  };

  // -------------------------
  // General application logic
  // -------------------------

  // -------
  // Markers
  // -------

  // Populates map on init
  var addAllMarkersFromStoreToMap = function(markersProperties) {
    var maker, latlng, html;
    while(properties = markersProperties.shift()) {
      addMarkerToMap(properties);
    }
    getAllMessages()
  };

  // Turns the marker green and deactivates the previous active marker
  var activateMarker = function(id) {
    deactivateActiveMarker();
    if(markers[id]){
      $(markers[id]._icon).attr('src', 'assets/images/active-marker-icon.png');
      activeMarker = markers[id];
    }
  };

  // Turns the marker blue again
  var deactivateActiveMarker = function() {
    if(activeMarker){
      $(activeMarker._icon).attr('src', 'assets/images/marker-icon.png');
      activeMarker = null;
    }
  };

  // Adds a new marker to the store
  var addMarker = function(event) {
    var markerData = {
      'name': 'new Marker',
      'lat': event.latlng.lat,
      'lng': event.latlng.lng,
      'createdByName': hoodie.account.username
    };
    hoodie.store.add('marker', markerData)
  };

  var updateMarker = function(event) {
    var $marker = $(event.target).closest('[data-id]')
    var update = {}
    update[event.target.name] = event.target.value
    hoodie.store.update('marker', $marker.data('id'), update)
  };

  // Loads all marker items into the list
  var populateMarkerList = function() {
    var globalMarkerStore = markers;
    hoodie.store.findAll('marker').done(function(markers){
      var html;
      resetContentContainer();
      var $contentContainer = $('.contentContainer');
      markers.forEach( function( marker ){
        addCreatedAtReadable(marker);
        marker.options = {};
        marker.options.messages = globalMarkerStore[marker.id].options.messages;
      });
      var data = {};
      if(markers.length !== 0){
        data.data = {markers: markers};
      }
      html = ich.markerList(data);
      $contentContainer.empty().append(html);
      if(activeMarker){
        var $activeItem = $("li[data-id='"+activeMarker.options.couchId+"']");
        $activeItem.addClass('active');
        $contentContainer.scrollTo($activeItem, 250);
      }
      onResize();
    });
  };

  // --------
  // Messages
  // --------

  // Find and display all messages belonging to a specific marker
  var showAllMessagesOfParent = function(type, parentId) {
    hoodie.store.findAll('message').done(function(messages){
      // find all messages belonging to this marker
      var relevantMessages = _.filter(messages, function(message){
        return message.parent == type+"/"+parentId;
      });
      // sort them ascending by date/time
      relevantMessages = _.sortBy(relevantMessages, function(message){
        return new Date(message.createdAt);
      });
      if(relevantMessages.length !== 0){
        var $container = $('.contentContainer .messagesContainer');
        $container.find('.hide').removeClass('hide');
        $container.append('<ul></ul>');
        var html;
        relevantMessages.forEach( function( message, index ){
          addMessageToMessagesContainerList(message, index+1);
        });
      }
      onResize();
    });
  };

  // Displays a message in a marker's detail view
  var addMessageToMessagesContainerList = function(message, index) {
    addCreatedAtReadable(message);
    message.index = index;
    html = ich.message(message);
    var $contentContainer = $('.contentContainer');
    var $container = $contentContainer.find('.messagesContainer');
    if($('ul', $container).length === 0){
      $container.find('.hide').removeClass('hide');
      $container.append('<ul></ul>');
    }
    $('ul', $container).append(html);
    if($(window).width() >= desktopBreakpoint){
      $contentContainer.scrollTo("max", 0);
    } else {
      $contentContainer.scrollTo("max", 0);
    }
  };


  var removeMessagesOfMarker = function(markerId) {
    hoodie.store.findAll('message').done(function(messages){
      messages.forEach(function(message, index){
        if(message.parent.indexOf('marker/') != -1){
          var id = message.parent.substr(message.parent.indexOf('/')+1);
          if(id === markerId){
            hoodie.store.remove('message', message.id)
          }
        }
      })
    })
  }

  // Fetches all messages in the store and distributes them in the UI
  var getAllMessages = function() {
    hoodie.store.findAll('message').done(function(messages){
      messages.forEach(function(message, index){
        var type = message.parent.substring(0,message.parent.indexOf('/'))
        var parentId = message.parent.substr(message.parent.indexOf('/')+1);
        switch(type){
          case "marker":
            addMessageToMarkerLabel(parentId);
          break;
          default:
          break;
        }
      })
    })
  }

  // Updates the message counter on a marker
  var addMessageToMarkerLabel = function(markerId){
    var marker = markers[markerId];

    if(!marker){
      marker = markers[markerId] = { options: { messages: 0 }}
      return;
    }
    marker.options.messages++;
    if (!marker._label) {
      return
    }
    if(marker.options.messages){
      $(marker._label._container).addClass('show');
    }
    marker.updateLabelContent(marker.options.messages.toString())
    addMessageToListLabels(markerId, marker.options.messages);
  };

  // Updates the message counter on a list item
  var addMessageToListLabels = function(markerId, messageCount){
    var $listItems = $(".markerListItem[data-id='"+markerId+"'] .markerLocation");
    $listItems.attr('data-messages', messageCount);
  };

  // ---
  // Map
  // ---

  // Resizes map to fit container and refreshes it
  var updateMap = function(){
    // Only needs to happen on small screens
    if($(window).width() < desktopBreakpoint){
      $('#map').css('bottom',$('.mainContainer').height());
    } else {
      $('#map').css('bottom',0);
    }
    if(map) map.invalidateSize();
  };

  var centerMapOnCoordinates = function(properities) {
    var lat = properities.lat, 
        lng = properities.lng

    console.log('centerMapOnCoordinates')
    
    // map might be out screen, but we want to center
    // on visible part, so:
    // 1. turn lat/lng into pixels
    var point = map.project([lat, lng])
    // 2. calculate offsets & update pixel point
    var offsetLeft = $('.mapContainer').offset().left
    var offsetBottom = $(window).scrollTop()
    point.x += offsetLeft / 2
    point.y -= offsetBottom / 2
    // 3. turn pixel point back to lat/lng
    var latlng = map.unproject(point)

    // \o/
    map.panTo(latlng);
  };

  // Displays a marker on the map
  var addMarkerToMap = function(properties) {

    // sanity check
    if (! properties.lat || ! properties.lng) {
      return
    }

    var latlng = [properties.lat, properties.lng];
    var messages = 0;
    if(markers[properties.id]){
      messages = markers[properties.id].messages;
      markers[properties.id] = null;
    }
    markers[properties.id] = L.marker(latlng, {
      opacity: 0.8,
      couchId: properties.id,
      icon: defaultMarkerIcon,
      messages: messages,
      fieldId: properties.fieldId
    })
    .bindLabel("", { noHide: true })
    .addTo(map)
    .showLabel()
    .on('click', onMarkerClick);
    if(state == "list"){
      populateMarkerList();
    }
  };

  // -----
  // Other
  // -----

  // Moves content container scroll position back to top
  var resetContentContainer = function() {
    $('.contentContainer').scrollTo(0);
  };

  // -------
  // Helpers
  // -------

  // Turns a store object's createdAt attribute into a nice date string
  var addCreatedAtReadable = function(properties) {
    var weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunnday"];
    var date = new Date(properties.createdAt);
    var weekday = weekdays[date.getDay()];
    properties.createdAtReadable = weekday+", "+date.toFormat("DD.MM.YYYY - HH24:MM");
  };

  // Leaflet doesn't understand Hammer event coordinates,
  // so here's a really simple fix
  var convertHammerEventToLeafletEvent = function(event, map){
    event.pageX = event.gesture.touches[0].pageX;
    event.pageY = event.gesture.touches[0].pageY;
    var translatedEvent = map.mouseEventToLatLng(event);
    translatedEvent.latlng = {};
    translatedEvent.latlng.lat = translatedEvent.lat;
    translatedEvent.latlng.lng = translatedEvent.lng;
    return translatedEvent;
  };

  // Expose public methods
  return {
    show: _init,

    locate: function(options) { map.locate(options) },
    setView: function(options, zoom) { map.setView(options, zoom) }
  }
}());