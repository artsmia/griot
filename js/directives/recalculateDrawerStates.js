app.directive( 'recalculateDrawerStates', function( $timeout ){
	return {
		restrict: 'A',
		require: '^drawerify',
		link: function( scope, elem, attrs, drawerify ){
			elem.on( 'touchend', function(){
				if( 'vertical' === drawerify.orientation ){
					$timeout( function(){
						drawerify.recalculateCustomStates();
						if( 'open' !== drawerify.activeState ){
							drawerify.to('info');
						}
					}, 50 );
				}
			});
		}
	}
});