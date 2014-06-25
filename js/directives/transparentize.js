/**
 * Turn a parent element transparent on touchstart.
 */

app.directive( 'transparentize', function(){

	return function( scope, elem, attrs ) {

		var $target = jQuery( attrs.transparentize );

		elem.on( 'touchstart', function(){
			$target.addClass('transparentized');
		});

		elem.on( 'touchmove touchend', function(e){
			$target.removeClass('transparentized');
			e.preventDefault();
		});

	}

});