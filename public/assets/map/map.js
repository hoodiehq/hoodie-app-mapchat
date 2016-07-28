// MapChat module: the actual app
(function(document, window, $, hoodie, ich){

  $document = $(document)
  $window = $(window)
  var map, $map, tileLayer, markers = {};
  var state = 'map';
  var bottomOffset = 0;
  var activeMarker;
  var userPosition;
  var desktopBreakpoint = 1280;
  var baseMarkerIcon, defaultMarkerIcon, activeMarkerIcon;
  var mapUpdaterInterval;

  var init = function() {
    $('.mainContainer').removeClass('hide');
    $('body').addClass('mapView');

    if (! isInitialized ) {
      initMap();
      registerHoodieEvents();
      registerInterfaceEvents();
      registerMapEvents();
      isInitialized = true
    }

    // pre-populate map with markers
    hoodie.store.findAll('marker')
    .then( addAllMarkersFromStoreToMap )
  };
  $document.on('app:ready', init)

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

    // Start in Los Angeles
    map = L.map('map').setView([34.0522222,-118.2427778], 10);
    map.zoomControl.setPosition('bottomright');

    // Load tiles from OpenStreetMap
    tileLayer = L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png').addTo(map);
  }

  // Get notified by Hoodie when remote data changes
  var registerHoodieEvents = function() {
    hoodie.store.on('marker:add', onMarkerFromStore )
    hoodie.store.on('message:add', onMessageFromStore )
    hoodie.store.on('marker:remove', onRemoveMarkerFromStore )
    hoodie.store.on('clear', onRemoveAllMarkers )
  }

  // Register all interface events like clicks, form changes etc.
  var registerInterfaceEvents = function() {

    // Add new markers via touch hold
    $map.hammer().on('hold', onMapHold);

    $document.on('map:geolocate', geolocate)
    $document.on('map:center', function (event, marker, offset) {
      centerMapOnCoordinates(marker, offset)
    })
    $document.on('map:resize', onResize)
    $document.on('map:setstate', function(event, newState){
      setState(newState)
    });
    $document.on('marker:activate', onMarkerActivate)
    $document.on('marker:deactivate', onMarkerDeactivate)
    $document.on('bookmark:open', handleBookmarkOpen)

    $map.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',
      function(event) {
        onResize()
      }
    );

    // Window resize
    $window.on('resize', onResize);
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
    // TODO: not sure if we still need this anywhere
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
    if(activeMarker && activeMarker.options.couchId == properties.id){
      activeMarker = null;
    }
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
    console.log("onResize: ",state);
    switch(state){
      default:
      case 'map':
        targetHeight = '100%';
      break;
      case 'preview':
        var $markerDetailHeader = $('#marker-detail.preview article.marker > header');
        var markerDetailHeaderHeight = $markerDetailHeader.height() + 20;
        targetHeight = $window.height() - markerDetailHeaderHeight;
      break;
      case 'list':
        targetHeight = '40%';
      break;
      case 'detail':
        targetHeight = '40%';
      break;
    }

    $('.mapContainer').css('height', targetHeight);
    map.invalidateSize(true)

  };

  // -----------------------------
  // Additional events for markers
  // -----------------------------

  var triggerMarkerActivation = function(event) {
    var markerId = event.target.options.couchId;
    $.event.trigger("marker:activate", markerId)
  }

  var onMarkerActivate = function(event, markerId) {
    // if this is the active marker, show it in detail view and nothing else
    if(activeMarker && activeMarker.options.couchId == markerId){
      setState('detail')
      onResize()
      //$.event.trigger("marker:show", markerId)
      return;
    }
    hoodie.store.find('marker', markerId)
    .then( function(marker) {
      centerMapOnCoordinates(marker)
      activateMarker(marker.id);
      if(state === 'map'){
        setState('preview')
      } else {
        onResize();
      }
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

  // -------------
  // Global events
  // -------------

  var setState = function(newState) {
    console.log("setState: ",newState);
    if(state === newState) return;
    state = newState;
    onResize();
  }

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
      'name': t('NewMarker'),
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

  // --------
  // Messages
  // --------

  // Find and display all messages belonging to a specific marker
  var showAllMessagesOfParent = function(type, parentId) {
    hoodie.store.findAll('message').then(function(messages){
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
    if($window.width() >= desktopBreakpoint){
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
    hoodie.store.findAll('message').then(function(messages){
      console.log("messages: ",messages);
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

  var centerMapOnCoordinates = function(properities, extraOffset) {
    map.invalidateSize(false)
    if(!properities.lat || !properities.lng) return;
    var lat = properities.lat,
        lng = properities.lng
    map.panTo(L.latLng(lat,lng));
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
    .on('click', triggerMarkerActivation);
  };

  //
  //
  //
  function handleBookmarkOpen(event, latlng, zoom) {
    map.setView(latlng, zoom)
  }


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
})(document, window, jQuery, hoodie, ich);
