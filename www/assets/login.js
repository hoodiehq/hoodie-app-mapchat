var Login = {
  isInitialized : false,
  init : function() {
    this.$container = $('#dialog')

    this.render()
    this.bindToEvents()
  },

  render : function() {
    this.$el = $( ich.login() )
    this.$username = this.$el.find('input[name=username]')
    this.$password = this.$el.find('input[name=password]')
    this.$alert = this.$el.find('.alert-warn')
  },

  reset : function() {
    this.$username.val('')
    this.$password.val('')
    this.$alert.text('').hide()
  },

  bindToEvents : function() {
    this.$el.on('submit', 'form', this.handleSubmit)
  },

  show : function() {
    if (! this.isInitialized ) this.init();
    this.reset()
    this.$container.show().html( this.$el )
  },

  hide : function() {
    this.$container.hide().html( '' )
  },

  handleSubmit : function(event) {
    event.preventDefault()

    var username = this.$username.val();
    var password = this.$password.val();

    hoodie.account.signIn(username, password)
    .then(this.onSignInSucces).fail(this.onSignInError)
  },

  onSignInSucces : function(username) {
    this.hide()
    Map.show();
  },

  onSignInError : function(error) {
    this.$alert.text(error.error+": "+error.reason).show();
    this.$password.val('')
  }
}


Login.handleSubmit = bind(Login.handleSubmit, Login)
Login.onSignInSucces = bind(Login.onSignInSucces, Login)
Login.onSignInError = bind(Login.onSignInError, Login)