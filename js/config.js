app.constant('envConfig', {

  contents: 'contents.json',
  tilesaw: '//tilesaw.dx.artsmia.org/', // '//localhost:8887/'
  tileUrlSubdomain: function(tileUrl) {
    return tileUrl.replace('http://0.', 'http://{s}.')
  },
  crashpad: 'http://new.artsmia.org/crashpad/griot/',
  cdn: 'http://cdn.dx.artsmia.org/',

  miaMediaMetaActive: true,
  miaMediaMetaSrc: 'http://cdn.dx.artsmia.org/credits.json',

  miaObjectMetaActive: true,
  miaObjectMetaSrc: '../contents.json'

});