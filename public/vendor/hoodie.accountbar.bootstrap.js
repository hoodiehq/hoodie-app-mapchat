/* global Hoodie */

(function ($) {

  'use strict';

  // extend Hoodie with Hoodstrap module
  hoodie.plugin(function(hoodie) {

    // Constructor
    function Hoodstrap(hoodie) {

      this.hoodie = hoodie;

      // all about authentication and stuff
      this.hoodifyAccountBar();
    }

    Hoodstrap.prototype = {

      //
      hoodifyAccountBar: function() {
        var hoodstrap = this;

        this.subscribeToHoodieEvents();
        hoodie.account.get('session').then(function (session) {
          if (session) {
            hoodstrap.hoodie.account.get('username').then(function (username) {
              hoodstrap.handleUserAuthenticated(username)
            })
          } else {
            hoodstrap.handleUserUnauthenticated()
          }
        })
      },

      subscribeToHoodieEvents : function() {
        this.hoodie.account.on('signin reauthenticated', this.handleUserAuthenticated.bind(this));
        this.hoodie.account.on('signout', this.handleUserUnauthenticated.bind(this));
        this.hoodie.on('account:error:unauthenticated remote:error:unauthenticated', this.handleUserAuthenticationError.bind(this));
      },

      //
      handleUserAuthenticated: function(username) {
        $('html').attr('data-hoodie-account-status', 'signedin');
        $('.hoodie-accountbar').find('.hoodie-username').text(username);
      },

      //
      handleUserUnauthenticated: function() {
        $('html').attr('data-hoodie-account-status', 'signedout');
      },
      handleUserAuthenticationError: function() {
        $('.hoodie-accountbar').find('.hoodie-username').text(this.hoodie.account.username);
        $('html').attr('data-hoodie-account-status', 'error');
      }
    };

    new Hoodstrap(hoodie);
  });

 /* Hoodie DATA-API
  * =============== */

  $(function () {
    // bind to click events
    $('body').on('click.hoodie.data-api', '[data-hoodie-action]', function(event) {
      var $element = $(event.target),
          action   = $element.data('hoodie-action'),
          $form;

      if (!action) {
        action = $element.closest('[data-hoodie-action]').data('hoodie-action')
      }

      switch(action) {
        case 'signup':
          $form = $.modalForm({
            fields: [ 'username', 'password', 'password_confirmation' ],
            submit: 'Sign Up'
          });
          break;
        case 'signin':
          $form = $.modalForm({
            fields: [ 'username', 'password' ],
            submit: 'Sign in'
          });
          break;
        case 'resetpassword':
          $form = $.modalForm({
            fields: [ 'username' ],
            submit: 'Reset Password'
          });
          break;
        case 'changepassword':
          $form = $.modalForm({
            fields: [ 'current_password', 'new_password' ],
            submit: 'Reset Password'
          });
          break;
        case 'changeusername':
          $form = $.modalForm({
            fields: [ 'current_password', 'new_username' ],
            submit: 'Reset Password'
          });
          break;
        case 'signout':
          window.hoodie.account.signOut();
          break;
        case 'destroy':
          if( window.confirm('you sure?') ) {
            window.hoodie.account.destroy();
          }
          break;
      }

      if ($form) {
        $form.on('submit', handleSubmit( action ));
      }
    });

    var handleSubmit = function(action) {
      return function(event, inputs) {
        var $modal = $(event.target);
        var magic;

        switch(action) {
          case 'signin':
            magic = window.hoodie.account.signIn({
              username: inputs.username, password: inputs.password
            });
            break;
          case 'signup':
            magic = window.hoodie.account.signUp({
              username: inputs.username, password: inputs.password
            }).then(function () {
              return window.hoodie.account.signIn({
                username: inputs.username, password: inputs.password
              });
            });
            break;
          case 'changepassword':
            magic = window.hoodie.account.changePassword(null, inputs.new_password);
            break;
          case 'changeusername':
            magic = window.hoodie.account.update({ username: inputs.new_username });
            break;
          case 'resetpassword':
            magic = window.hoodie.account.request({ type: 'passwordreset', contact: inputs.email })
            .then(function(properties) {
              window.alert('send new password to ' + properties.contact);
            });
            break;
        }

        magic.then(function() {
          $modal.find('.alert').remove();
          $modal.modal('hide');
        });
        magic.catch(function(error) {
          $modal.find('.alert').remove();
          $modal.trigger('error', error);
        });
      };
    };
  });
})( window.jQuery );
