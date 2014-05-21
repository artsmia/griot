app.directive( 'vcenter', function(){

	return{
		restrict: 'C',
		transclude: true,
		template: "<div class='vcenter-table'><div class='vcenter-cell' ng-transclude></div></div>",
		link: function( scope, elem, attrs ) {

			scope.container = jQuery( elem );

			if( scope.container.find( 'video' ).length ) {

				var unwatch = scope.$watch( 
					function(){
						return scope.container.height();
					}, 
					function(){
						setTimeout( function(){
							// Use post-transition height (not the one returned by $watch)
							var finalHeight = scope.container.height();
							scope.container.find( '.vcenter-cell' ).children('video').css( 'max-height', finalHeight );
						}, 150 );
					}
				);

				scope.$on("$destroy", function(){
	        unwatch();
	    	});

			}
		}
	}

});