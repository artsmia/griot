/**
 * Handle touch interaction with content drawer.
 */

app.directive( 'handle', function( $timeout ){

	return{
		require: '^drawer',
		link: function( scope, elem, attrs, drawerCtrl ) {

			var _scope = scope;

			// Reset content frame and button attachment status
			$( window ).on( 'resize orientationChange', function(){
				drawerCtrl.reset();
				scope.$apply( function(){
					scope.attached = false;
				});
			});

			// Track drawer with touch
			elem.on( 'touchmove', function(e){

				var touch = e.targetTouches[0];

				drawerCtrl.track( touch );

				switch( drawerCtrl.drawerMode ){
					case 'vertical':
				    if( ( window.outerHeight - touch.pageY ) > $(this).outerHeight() ){
				    	scope.$apply( function(){
				    		scope.attached = true;
				    	});
				    }
				    else {
				    	scope.$apply( function(){
				    		scope.attached = false; 
				    	});
				    }
				    break;
				}
			});

			elem.on( 'touchend', function(e){

				var touch = e.changedTouches[0];

				// If drawer is not being manipulated, cycle to next position.
				if( ! drawerCtrl.moving ){
					drawerCtrl.cycle();
					return;
				} 

				drawerCtrl.moving = false;

				switch( drawerCtrl.drawerMode ){

					case 'vertical':

						if( touch.pageY < ( window.outerHeight / 2 ) ){
				    	drawerCtrl.open();
				    } 
				    else if ( touch.pageY > ( window.outerHeight / 2 ) && touch.pageY < ( window.outerHeight * 0.9 ) ) {
				    	drawerCtrl.peek();
				    } 
				    else {
				    	drawerCtrl.close();
				    }
				    break;

				  case 'horizontal':

						if( touch.pageX > ( $('.object-content-frame').outerWidth() / 2 ) ){
				    	drawerCtrl.open();
				    } 
				    else {
				    	drawerCtrl.close();
				    }
				    break;

				}

		    e.preventDefault();

			});

			scope.$on( 'drawerOpen', function(){
				$timeout( function(){
					scope.attached = true;
				}, 50 );
			});

			scope.$on( 'drawerPeek', function(){
				$timeout( function(){
					scope.attached = true;
				}, 50 );
			});

			scope.$on( 'drawerClose', function(){
				$timeout( function(){
					scope.attached = false;
				}, 250 );
			});

		}
	}
});