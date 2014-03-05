app.constant('envConfig', {
  contents: 'contents.json',
  tilesaw: '//tilesaw.dx.artsmia.org/', // '//localhost:8887/'
  tileUrlSubdomain: function(tileUrl) {
    return tileUrl.replace('http://0.', 'http://{s}.')
  },
  crashpad: 'http://cdn.dx.artsmia.org/crashpad.json',
  cdn: 'http://cdn.dx.artsmia.org/'
})


