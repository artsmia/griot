/**
 * Turn a parent element transparent on touchstart.
 */

app.directive( 'videoHandler', function(){

	return function( scope, elem, attrs ){

		var aspect = $(elem).innerHeight() / $(elem).innerWidth();

		var resize = function(){

			var containerWidth = $(elem).closest('.story-video').innerWidth();

			if( window.outerWidth > 1023 ){
				containerWidth -= 140;
			}

			$(elem).css({
				'width': containerWidth + 'px',
				'height': Math.round( containerWidth * aspect ) + 'px',
				'max-width': '800px'
			});

		}

		resize();

		$(window).on('resize orientationchange', function(){
			setTimeout( function(){
				resize();
			}, 300 );
		});

	}

});