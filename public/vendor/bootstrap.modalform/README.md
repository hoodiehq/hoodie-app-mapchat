bootstrap modal forms
=======================

Example usage:

```javascript
$.modalForm({
  fields: [ 'username', 'password' ],
  submit: 'Sign In'
}).on('submit', function(event, inputs) {
  // event.target => <div class="modal">
  // inputs       => { username, password }
})
```

results in:

![Screenshot](https://raw.github.com/gr2m/bootstrap.modalform.js/master/assets/screenshot.png)

License
---------

MIT license.  
© Gregor Martynus