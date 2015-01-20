/**
 * Adapters (MIA-specific)
 *
 * These adapters are specific to the MIA's implementation of Griot. You should
 * overwrite them if you'd like to use your own service to pull data. If you'd
 * rather pull all data from GriotWP or another service, set 
 * config.miaMediaMetaActive, config.miaObjectMetaActive, and 
 * config.miaThumbnailAdapterActive to false in config.js.
*/

/**
 * miaMediaMetaAdapter
 * 
 * Grabs media metadata from an external source and provides a method for
 * retrieving that metadata by ID.
 */
app.service( 'miaMediaMetaAdapter', function( $http, $sce ) {

  var _this = this;

  this.isActive = false;

  this.metaHash = {};

  this.get = function( id ) {
    return _this.metaHash[ id ] || false;
  }

  this.build = function( src ){

    $http.get( src, { cache: true } ).success( function( result ) {

      _this.isActive = true;
      
      for( var id in result ) {
        var description = result[ id ].description ? result[id].description + "<br />" : '';
        var credit = result[ id ].credit || '';
        _this.metaHash[ id ] = $sce.trustAsHtml( description + credit );
      }

    });

  }

});

/**
 * miaObjectMetaAdapter
 * 
 * Grabs object metadata from an external source and provides a method for
 * retrieving metadata reformatted into a particular grouping, i.e. to match
 * the groups in GriotWP.
 */
app.service( 'miaObjectMetaAdapter', function( $http, $sce ) {

  var _this = this;

  this.isActive = false;

  this.metaHash = {};  

  this.get = function( id, grouping ) {
    var id = parseInt(id)
    try{
      if (_this.metaHash[id] !== undefined) {
        var hash = _this.metaHash[ id ]
        return grouping ? hash[ grouping ] : hash
      } else {
        return this.getFromAPI(id, grouping)
      }
    } catch(e) {
      console.log('error in objectMeta.get', e)
      return null;
    }
  }

  this.getFromAPI = function(id, grouping) {
    var apiURL = "http://caption-search.dx.artsmia.org/id/"+id
    return $http.get(apiURL, {cache: true}).then(function(result) {
      var data = result.data
      _this.addObjectToMetaHash(data.id.split('/').reverse()[0], data)
      return _this.get(id, grouping)
    })
  }

  this.build = function( src ) {
    $http.get( src, { cache: true } ).success( function( result ) {

      _this.isActive = true;

      for( var id in result ) {
        // Skip ID listing
        if( 'ids' === id ) {
          continue;
        }

        _this.addObjectToMetaHash(id, result[id])
      }
    });
  }

  this.addObjectToMetaHash = function(id, json) {
    var groupings = {}, 
        artist, 
        culture, 
        country, 
        dated, 
        medium, 
        dimension, 
        creditline, 
        accession_number, 
        trustedDescription;

    artist = json.artist || 'Artist unknown';
    culture = json.culture || '';
    country = json.country || '';
    dated = json.dated || '';
    medium = json.medium || '';
    dimension = json.dimension || '';
    creditline = json.creditline || '';
    accession_number = json.accession_number || '';
    trustedDescription = $sce.trustAsHtml( json.description );

    groupings.meta1 = artist + ', ' + ( culture && culture + ', ' ) + country;
    groupings.meta2 = dated;
    groupings.meta3 = $sce.trustAsHtml( ( medium && medium + "<br />" ) + ( dimension && dimension + "<br />" ) + ( creditline && creditline + "<br />" ) + accession_number );

    // Special editions for goldweights
    groupings.gw_title = $sce.trustAsHtml( json.title );
    groupings.gw_meta2 = $sce.trustAsHtml( ( creditline && creditline + "<br />" ) + accession_number );
    groupings.location = json.room.replace('G', '')

    this.metaHash[id] = groupings;
    return groupings
  }

});

/**
 * miaThumbnailAdapter
 * 
 * Provides a method for retrieving an image thumbnail from an external source,
 * given an image ID.
 */
app.service( 'miaThumbnailAdapter', function() {

  var _this = this;

  this.isActive = false;

  this.cdn = '';

  this.init = function( cdn ) {
    _this.isActive = true;
    _this.cdn = cdn;
  }

  this.get = function( id ) {
    if(id === undefined) return
    var trimmed_id = id.replace( '.tif', '' );
    return _this.cdn + 'thumbs/tn_' + trimmed_id + '.jpg';
  }

});
