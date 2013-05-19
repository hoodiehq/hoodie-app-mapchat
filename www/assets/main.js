var onPageLoad = function() {
  // Set correct Hoodie API endpoint depending on where the app is runnin
  var HOODIE_API_URL;
  if (/\.dev|xip\.io$/.test(location.hostname)) {
    // gets set automatically
  } else {
    HOODIE_API_URL = 'http://api.hoodie-mapchat.jit.su'
  }

  // Init Hoodie and tell it where it's API is
  window.hoodie = new Hoodie(HOODIE_API_URL)
  // FastClick makes mobile devices respond quicker to touch events
  new FastClick(document.body);
  // If no-one is logged in, show the login screen
  if(!hoodie.account.username){
    Login.init();
  } else {
    MapChat.init();
  }
};

// Login module: for the login screen
var Login = (function(){
  var _init = function() {
    $('div.signIn').removeClass('hidden');
    $('div.signIn button.signIn').click(function(event){
      event.preventDefault()
      var $username = $('div.signIn input.username');
      var $password = $('div.signIn input.password');
      var username = $username.val();
      var password = $password.val();
      if(username === ""){
        $username.attr('placeholder', 'Please enter a user name')
      }
      if(password === ""){
        $password.attr('placeholder', 'Please enter a password')
      }
      if(username !== "" && password !== ""){
        hoodie.account.signIn(username, password).done(onAuthentication).fail(onAuthenticationError)
      }
    });
  }

  var onAuthentication = function(data) {
    $('div.signIn').addClass('hidden');
    MapChat.init();
  }

  var onAuthenticationError = function(data) {
    $('div.signIn .alert-warn').removeClass('hidden').text(data.error+": "+data.reason);
    $('div.signIn input.password').val("");
  }

  // Expose public methods
  return {
    init: _init
  }
}());

// MapChat module: the actual app
var MapChat = (function(){
  var map, $map, tileLayer, mostRecentlyAddedMarkerId, markers = {};
  var state = 'map';
  var activeMarker;
  var userPosition;
  var desktopBreakpoint = 1280;
  var baseMarkerIcon, defaultMarkerIcon, activeMarkerIcon;

  var _init = function() {
    $('.mainContainer, .hoodie-accountbar').removeClass('hidden');
    $('body').addClass('mapView');

    initMap();
    registerHoodieEvents();
    registerInterfaceEvents();
    registerMapEvents();

    // pre-populate map with markers
    hoodie.store.findAll('marker').then( addAllMarkersFromStoreToMap );
  };

  // Initialize the Leaflet map and its markers
  var initMap = function() {
    // Basic Leaflet marker icon that other marker types will inherit from
    baseMarkerIcon = L.Icon.extend({
      options: {
        shadowUrl: 'assets/marker-shadow.png',
        iconSize:     [25, 41],
        shadowSize:   [41, 41],
        iconAnchor:   [12, 40],
        shadowAnchor: [14, 40],
        popupAnchor:  [-3, -76],
        labelAnchor:  [-21,-21]
      }
    });

    // The two marker types: default (blue) and active (green)
    defaultMarkerIcon = new baseMarkerIcon({iconUrl: 'assets/marker-icon.png'});
    activeMarkerIcon = new baseMarkerIcon({iconUrl: 'assets/active-marker-icon.png'});

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

    // Top right tool buttons
    $('.geolocate').on('click', geolocate);
    $('.bookmark').on('click', goToBookmark)
    // Main container buttons
    $('.tabBar button.list').on('click', onList);
    $('.tabBar button.map').on('click', onMap);

    // Click event from markerListItem
    $('.contentContainer').on('click', 'li.markerListItem', onMarkerListItemClick);

    // Events from the addMarker template
    $('.contentContainer').on('click', '.confirmMarker', onConfirmNewMarker);
    $('.contentContainer').on('click', '.removeMarker', onRemoveMarkerClick);
    // Listen for changes in the addMarker form and save them
    $('.contentContainer').on('input change', 'input, select', onAddMarkerFormChange);
    // Add or cancel message
    $('.contentContainer').on('click', '.addMessageSection .addMessage', onAddMessageClick);
    $('.contentContainer').on('click', '.cancelMessage', onCancelMessageClick);
    // Window resize
    $(window).on('resize', onResize);
    onResize();

    // Since the side bar is always visible on large screens, populate it with markers
    if($(window).width() >= desktopBreakpoint){
      onList();
      // evil hack, see https://github.com/gr2m/hoodie-mapchat/issues/85
      _.delay(populateMarkerList, 500);
    }
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

    if(options.remote === true){
      return
    }

    // add a human readable created at
    addCreatedAtReadable(properties);

    var html;
    if(properties.fieldId){
      showMarkerDetail(properties.id)
    } else {
      html = ich.addMarker(properties);
      $('.contentContainer').empty().append(html);
      setState('detail');
      updateMap();
    }
    activateMarker(properties.id);
    centerMapOnCoordinates(properties.lat, properties.lng);
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
    if($(window).width() < desktopBreakpoint){
      setState('map');
    } else {
      setState('list');
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

  var goToBookmark = function(event) {
    event.preventDefault()
    var $el = $(event.target)
    console.log($el.data(), $el.data('zoom'))
    map.setView($el.data(), $el.data('zoom'))
  };

  var geolocate = function() {
    $('.geolocation').addClass('loading');
    map.locate({setView: true, maxZoom: 16});
  };

  var onMarkerListItemClick = function(event) {
    var $dataItem = $(this).closest('li');
    centerMapOnCoordinates($dataItem.data('lat'), $dataItem.data('lng'));
    activateMarker($dataItem.data('id'));
    if($(event.currentTarget).hasClass('active')){
      // If the list item is already active and is tapped again, open it
      showMarkerDetail($dataItem.data('id'));
    } else {
      // If it isn't already active, activate it and pan the map there
      $('.contentContainer li.active').removeClass('active');
      $dataItem.addClass('active');
    }
  }

  var onConfirmNewMarker = function(event) {
    var $marker = $(event.target).closest('[data-id]');
    var id = $marker.data('id');
    showMarkerDetail(id);
    setState('detail');
    updateMap();
  }

  var onRemoveMarkerClick = function(event) {
    var $marker = $(event.target).closest('[data-id]');
    var id = $marker.data('id');
    hoodie.store.remove('marker', id);
    removeMessagesOfMarker(id);
  }

  var onAddMarkerFormChange = function(event) {
    var $marker = $(event.target).closest('[data-id]');
    var update = {};
    update[event.target.name] = event.target.value;
    hoodie.store.update('marker', $marker.data('id'), update);
  }

  var onAddMessageClick = function(event) {
    var $marker = $(event.target).closest('[data-id]');
    var $textarea = $(event.target).siblings('textarea');
    var messageData = {
      messageBody: $textarea.val(),
      createdByName: hoodie.account.username
    };
    messageData.parent = "marker/"+$marker.data('id');
    hoodie.store.add('message', messageData).done(function(){
      $textarea.val("");
    });
  }

  var onCancelMessageClick = function(event) {
    $(event.target).siblings('textarea').val("");
    onList();
  }

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
    var id = event.target.options.couchId;

    // if this is the active marker, show it in detail view and nothing else
    if(activeMarker && activeMarker.options.couchId == id){
      showMarkerDetail(id);
      setState('detail');
      updateMap();
      return;
    }

    map.panTo(event.target._latlng);
    activateMarker(id);

    hoodie.store.find('marker', id).done(function(marker){
      var newState;
      var $contentContainer = $('.contentContainer');

      // depending on what state we're in, tapping a marker does different things
      switch(state){
        // highlight the marker's item in the list
        case "list":
          var activeItem = $contentContainer.find("li[data-id='"+id+"']");
          $contentContainer.find('li.active').removeClass('active');
          activeItem.addClass('active');
          $contentContainer.scrollTo(activeItem, 250);
        break;
        // show the current marker's details
        case "detail":
          showMarkerDetail(id);
        break;
        default:
        // show the current marker's preview
        case "preview":
        case "map":
          newState = 'preview';
          addCreatedAtReadable(marker);
          marker.options = {};
          marker.options.messages = markers[marker.id].options.messages;
          marker.active = true;
          var html = ich.preview(marker);
          $contentContainer.empty().append(html);
          setState(newState);
          onResize();
        break;
      }
    });
  };

  // ------------------
  // Map event handlers
  // ------------------

  var onLocationFound = function(event) {
    $('.geolocation').removeClass('loading');
    var radius = event.accuracy / 2;
    if(!userPosition){
      userPosition = L.circle(event.latlng, radius).addTo(map);
    } else {
      userPosition.setLatLng(event.latlng).setRadius(radius);
    }
  };

  var onLocationError = function(event) {
    $('.geolocation').removeClass('loading');
    if(userPosition) map.removeLayer(userPosition);
    userPosition = null;
  };

  // --------------
  // State handlers
  // --------------

  // On mainContainer button
  var onList = function(event){
    var newState = 'list';
    setState(newState);
    updateMap();
  };

  // On mainContainer button
  var onMap = function(event){
    var newState = 'map';
    setState(newState);
    updateMap();
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
      $(markers[id]._icon).attr('src', 'assets/active-marker-icon.png');
      activeMarker = markers[id];
    }
  };

  // Turns the marker blue again
  var deactivateActiveMarker = function() {
    if(activeMarker){
      $(activeMarker._icon).attr('src', 'assets/marker-icon.png');
      activeMarker = null;
    }
  };

  // Shows the marker's details in the content container
  var showMarkerDetail = function(id) {
    hoodie.store.find('marker', id).done(function(marker){
      if(hoodie.account.username == marker.createdByName){
        marker.showDeleteButton = true;
      }
      addCreatedAtReadable(marker);
      var html = ich.markerDetails(marker);
      resetContentContainer();
      $('.contentContainer').empty().append(html);
      setState('detail');
      updateMap();
      // Show all messages belonging to the marker
      showAllMessagesOfParent("marker", marker.id);
      onResize();
    });
  };

  // Adds a new marker to the store
  var addMarker = function(event) {
    var markerData = {
      'name': '',
      'lat': event.latlng.lat,
      'lng': event.latlng.lng,
      'createdByName': hoodie.account.username
    };
    hoodie.store.add('marker', markerData).then( function(marker) {
      mostRecentlyAddedMarkerId = marker.id;
    });
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
        $container.find('.hidden').removeClass('hidden');
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
      $container.find('.hidden').removeClass('hidden');
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

  var centerMapOnCoordinates = function(lat, lng) {
   var latlng = new L.LatLng(lat, lng);
   map.panTo(latlng);
  };

  // Displays a marker on the map
  var addMarkerToMap = function(properties) {
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
    .on('click', function(event){
      onMarkerClick(event);
    });
    if(state == "list"){
      populateMarkerList();
    }
  };

  // -----
  // Other
  // -----

  // Sets state, unsets old state, manages body and container classes
  var setState = function(newState){
    if(newState === state) return;
    $('.mainContainer, body').removeClass(state).addClass(newState);
    state = newState;
    switch(state){
      case "list":
        // Load all marker items into the list
        populateMarkerList();
      break;
      default:
      case "detail":
      case "preview":
        onResize();
      break;
      case "map":
        $('.contentContainer').empty();
        deactivateActiveMarker();
      break;
    }
  };

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
    init: _init
  }
}());

// init on page load
$( onPageLoad )