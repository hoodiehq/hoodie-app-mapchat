(function($, hoodie, ich){

  var $document = $(document);
  var $container, $el, $username, $password, $alert;
  var isInitialized = false;

  // 
  // init gets run when app:ready event gets fired
  // on app startup.
  // 
  function init() {
    findElements()
    render()
    bindToEvents()

    // on next tick, so all modules will be initialized
    window.setTimeout( showWhenSignedOut )
  }
  $document.on('app:ready', init)

  // 
  // cache jQuery selectors
  // 
  function findElements () {
    $container = $('#dialog')
  }

  // 
  // render dialog and set $el
  // 
  function render() {
    $el = $( ich.login() )
    $username = $el.find('input[name=username]')
    $password = $el.find('input[name=password]')
    $alert = $el.find('.alert-warn')
  }

  // 
  // bind to outsite events
  // 
  function bindToEvents() {
    $el.on('submit', 'form', handleSubmit)
    hoodie.account.on('signout', show)
  }

  // 
  // 
  // 
  function reset() {
    $username.val('')
    $password.val('')
    $alert.text('').hide()
  }

  // 
  // 
  // 
  function show() {
    reset()
    $.event.trigger('dialog:show')
    $container.show().html( $el )
  }

  // 
  // 
  // 
  function hide() {
    $.event.trigger('dialog:hide')
    $container.hide().html( '' )
  }

  // 
  // 
  // 
  function handleSubmit(event) {
    event.preventDefault()

    var username = $username.val();
    var password = $password.val();

    hoodie.account.signIn(username, password)
    .then(onSignInSucces).fail(onSignInError)
  }

  // 
  // 
  // 
  function onSignInSucces(username) {
    hide()
    Map.show();
  }

  // 
  // 
  // 
  function onSignInError(error) {
    $alert.text(error.error+": "+error.reason).show();
    $password.val('')
  }

  // 
  // 
  // 
  function showWhenSignedOut () {
    if(! hoodie.account.username){
      show();
    }
  }

})(jQuery, hoodie, ich);