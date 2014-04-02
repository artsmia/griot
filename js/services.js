/**
 * These adapters are specific to the MIA's implementation of Griot. You should
 * overwrite them if you'd like to use your own service to pull data. If you'd
 * rather manually enter metadata using GriotWP, set config.miaMediaMetaActive 
 * and config.miaObjectMetaActive to false in config.js.
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
    try{
      return _this.metaHash[ id ][ grouping ];
    } catch(e) {
      return null;
    }
  }

  this.build = function( src ) {

    $http.get( src, { cache: true } ).success( function( result ) {

      _this.isActive = true;

      var result = result.objects;

      for( var id in result ) {

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

        // Skip ID listing
        if( 'ids' === id ) {
          continue;
        }

        artist = result[id].artist || 'Artist unknown';
        culture = result[id].culture || '';
        country = result[id].country || '';
        dated = result[id].dated || '';
        medium = result[id].medium || '';
        dimension = result[id].dimension || '';
        creditline = result[id].creditline || '';
        accession_number = result[id].accession_number || '';
        trustedDescription = $sce.trustAsHtml( result[id].description );

        groupings.meta1 = artist + ', ' + ( culture && culture + ', ' ) + country;
        groupings.meta2 = dated;
        groupings.meta3 = $sce.trustAsHtml( ( medium && medium + "<br />" ) + ( dimension && dimension + "<br />" ) + ( creditline && creditline + "<br />" ) + accession_number );

        // Special editions for goldweights
        groupings.gw_title = $sce.trustAsHtml( result[id].title );
        groupings.gw_meta2 = $sce.trustAsHtml( ( creditline && creditline + "<br />" ) + accession_number );

        _this.metaHash[id] = groupings;

      }

    });
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
    return _this.cdn + 'thumbs/tn_' + id + '.jpg';
  }

});