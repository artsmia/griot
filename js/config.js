/**
 * Configure application.
 */

app.constant('envConfig', {

  // Location of tile server; used in flatmap directive
  tilesaw: '//tiles.dx.artsmia.org/',
  tileUrlSubdomain: function(tileUrl) {
    return tileUrl.replace('http://0.', 'http://{s}.')
  },

  // Location of content
  crashpad: 'http://new.artsmia.org/crashpad/griot/',

  // CDN for Goldweights audio (specific to MIA implementation)
  cdn: 'http://cdn.dx.artsmia.org/',

  miaEmailSharingActive: true,
  emailServer: 'http://dx.artsmia.org:33445/',

  // Adapters - set to false to use GriotWP for everything.
  miaMediaMetaActive: true,
  miaMediaMetaSrc: 'http://cdn.dx.artsmia.org/credits.json',
  miaObjectMetaActive: true,
  miaObjectMetaSrc: "http://caption-search.dx.artsmia.org/id/",
  miaThumbnailActive: true,
  miaThumbnailSrc: 'http://cdn.dx.artsmia.org/'

});
