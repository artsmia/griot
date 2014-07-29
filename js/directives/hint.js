app.directive( 'hint', function( $rootScope ) {
	return function( scope, elem, attrs ) {
		$rootScope.hintSeen = true;
	}
});