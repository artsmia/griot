/**
 * These adapters are specific to the MIA's implementation of Griot. You should
 * overwrite them if you'd like to use your own service to pull data. If you'd
 * rather manually enter metadata using GriotWP, set config.miaMediaMetaActive 
 * and config.miaObjectMetaActive to false in config.js.
*/

/**
 * miaMediaMetaAdapter
 * 
 * Grabs media metadata from an external source and massages it into a hash
 * connecting a media ID/URL to a single block of text containing a description 
 * and/or credit line.
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
 * Grabs object metadata from an external source and massages it into a hash
 * connecting an object ID to an object with three levels of metadata.
 */
app.service( 'miaObjectMetaAdapter', function( $http, $sce ) {

  var _this = this;

  this.isActive = false;

  this.metaHash = {};  

  this.get = function( id, level ) {
    return _this.metaHash[ id ][ level ] || false;
  }

  this.build = function( src ) {

    $http.get( src, { cache: true } ).success( function( result ) {

      _this.isActive = true;

      var result = result.objects;

      for( var id in result ) {

        var levels = {}, 
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

        levels.meta1 = artist + ', ' + ( culture && culture + ', ' ) + country;
        levels.meta2 = dated;
        levels.meta3 = $sce.trustAsHtml( ( medium && medium + "<br />" ) + ( dimension && dimension + "<br />" ) + ( creditline && creditline + "<br />" ) + accession_number );

        _this.metaHash[id] = levels;

      }

    });
  }

});