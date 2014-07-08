var express = require('express')
var cors = require('cors')
var app = express()
var bodyParser = require('body-parser')

var send = require('mandrill-send')(process.env.MANDRILL_TOKEN)
app.use(cors())
app.use(bodyParser())

app.route('/:email').all(function(req, res, next) {
  console.log('.', req.params, req.body)
  var email = req.body
  send({
    to: [{email: req.param('email')}],
    subject: email.subject,
    html: email.body,
    from: email.from || 'MIAbot <artstories@artsmia.org>'
  }, function(err){
    if (err) console.error(err);
  })

  res.send(req.params)
})

app.listen(33445)
