/**
 * Turn a parent element transparent on touchstart.
 */

app.directive( 'transparentize', function($timeout){

	return {
		restrict:'A',
		require:'^?drawerify',
		link: function( scope, elem, attrs, drawerify ) {

			var $target = jQuery( attrs.transparentize );

			elem.on( 'touchstart', function(){
				if( attrs.hasOwnProperty( 'transparentizeAction' ) ){
					switch( attrs.transparentizeAction ){
						
						case 'playVideo':
							// Close drawer in case we're not on a device that automatically
							// full-screens the video
							if( drawerify ){
								drawerify.to('closed');
								$timeout( function(){
									var $video = $('video[src="' + scope.page.video + '"]');
									$video[0].play();
								}, 150 );
							}
							else {
								var $video = $('video[src="' + scope.page.video + '"]');
								$video[0].play();
							}
							break;
							

						default:
							$target.addClass('transparentized');
					}
				} 
				else {
					$target.addClass('transparentized');
				}
			});

			elem.on( 'touchend', function(e){
				$target.addClass('detransparentized');
				$target.removeClass('transparentized');
				$timeout(function() {
				  $target.removeClass('detransparentized');
				}, 300)
			});

		}
	}

});
