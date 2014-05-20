app.directive( 'vcenter', function(){

	return{
		restrict: 'C',
		transclude: true,
		template: "<div class='vcenter-table'><div class='vcenter-cell' ng-transclude></div></div>",
		link: function( scope, elem, attrs ) {

			scope.container = jQuery( elem );

			if( scope.container.find( 'video' ).length ) {

				var unwatch = scope.$watch( function(){
					return scope.container.height();
				}, function( containerHeight ){
					scope.container.find( '.vcenter-cell' ).children('video').css( 'max-height', containerHeight );
				});

				scope.$on("$destroy", function(){
	        unwatch();
	    	});
	    	
			}
		}
	}

});