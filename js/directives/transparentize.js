/**
 * Turn a parent element transparent on touchstart.
 */

app.directive( 'transparentize', function($timeout){

	return function( scope, elem, attrs ) {

		var $target = jQuery( attrs.transparentize );

		elem.on( 'touchstart', function(){
			$target.addClass('transparentized');
		});

		elem.on( 'touchend', function(e){
			$target.addClass('detransparentized');
			$target.removeClass('transparentized');
			$timeout(function() {
			  $target.removeClass('detransparentized');
			}, 300)
		});

	}

});
