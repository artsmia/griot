app.directive('vcenter', function() {

	return{
		restrict:'C',
		replace:false,
		controller: function( $scope, $element, $attrs ) {

			var _scope = $scope;

			$scope.vc_height = 0;
			$scope.vc_parent = 0;

			$scope.vc_interval = setInterval( function(){

				if( jQuery( $element ).height() !== $scope.vc_height || jQuery( $element ).parent().height() !== $scope.vc_parent ) {
		  		var topBuffer = ( jQuery( $element ).parent().height() - jQuery( $element ).height() ) / 2;
		  		jQuery( $element ).css({
		  			'position':'relative', 
		  			'top':topBuffer 
		  		});
		  		$scope.vc_height = jQuery( $element ).height();
		  		$scope.vc_parent = jQuery( $element ).parent().height();
		  	}
			}, 100 );

			$scope.$on("$destroy", function(){
        clearInterval(_scope.vc_interval);
				console.log( 'clearing' );
			});

		}
	}

});