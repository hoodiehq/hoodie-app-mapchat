(function(document, window, $, hoodie, ich, Config){

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
    $el = $( ich.login( {Config: Config}) )
    $username = $el.find('input[name=username]')
    $password = $el.find('input[name=password]')
    $alert = $el.find('.alert-warn')
    translate()
  }

  //
  //
  //
  function translate() {
    document.webL10n.translate($el[0])
  }

  //
  // bind to outsite events
  //
  function bindToEvents() {
    $el.on('submit', 'form', handleSubmit)
    $el.on('click', 'button[name=signUp]', handleSignUpSubmit)
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

    hoodie.account.signIn({username: username, password: password})
    .then(onSignInSucces).catch(onSignInError)
  }
  //
  //
  //
  function handleSignUpSubmit(event) {
    event.preventDefault()

    var username = $username.val();
    var password = $password.val();

    hoodie.account.signUp({username: username, password: password})
    .then(function (){
      return hoodie.account.signIn({username: username, password: password})
    })
    .then(onSignInSucces).catch(onSignInError)
  }

  //
  //
  //
  function onSignInSucces(username) {
    hide()
    $.event.trigger('map:setstate', ['map'])
  }

  //
  //
  //
  function onSignInError(error) {
    $alert.text(error.message).show();
    $password.val('')
  }

  //
  //
  //
  function showWhenSignedOut () {
    hoodie.account.get('username').then(function (username) {
      if(!username){
        show();
      }
    })
  }

})(document, window, jQuery, hoodie, ich, Config);
