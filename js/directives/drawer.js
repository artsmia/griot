/**
 * Drawer directive
 *
 * Provides controls for interacting with the content frame on mobile.
 */
app.directive( 'drawer', function( $timeout ){
	return{
		controller: function( $scope, $element, $attrs ){

			var _this = this;

			// Get actual jQuery array so we can use animation methods.
			var $drawer = this.$element = $( $element[0] );

			$scope._setOrientation = function(){
	      _this.orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
	    }

	    $scope._setDrawerState = function(){
	    	switch( _this.orientation ){
	    		case 'portrait':
	    			$timeout( function(){
	    				_this.peek();
	    			}, 300 );
	    			break;
	    		case 'landscape':
	    			_this.close();
	    			break;
	    	}
	    }

			this.moving = false;

			this.track = function( touch ){

				_this.moving = true;
				$scope.drawerState = null;

				switch( _this.orientation ){

					case 'portrait':
				    $drawer.css({
				    	'top': ( touch.pageY ) + 'px'
				    });
				    break;

			    case 'landscape':
				  	if( touch.pageX < $drawer.outerWidth() ) {
				   	  $drawer.css({
					    	'left': ( touch.pageX - $drawer.outerWidth() ) + 'px'
					    });
				   	}
				   	break;
				}
			}

			this.open = function() {
				switch( _this.orientation ){

					case 'portrait':
						$drawer.animate({
							'top': '70px'
						}, 300 );
						break;

					case 'landscape':
						$drawer.animate({
			    		'left': 0
			    	}, 300 );
			    	break;
				}
				$scope.drawerState = 'open';
				$scope.$broadcast( 'drawerOpen' );
			}

			this.close = function(){
				switch( _this.orientation ) {
				
					case 'portrait':
						$drawer.animate({
				    	'top': '100%'
				    }, 300 );
				    break;

				  case 'landscape':
				  	$drawer.animate({
				    	'left': '-25rem'
				  	}, 300 );
				  	break;
				}
				$scope.drawerState = 'close';
				$scope.$broadcast( 'drawerClose' );
			}

			this.peek = function(){
				switch( _this.orientation ) {

					case 'portrait':

						var spaceNeeded = $('.object-title').height() + 70;
			    	var frameTop = window.outerHeight - spaceNeeded;

			    	$drawer.animate({
			    		'top': frameTop + 'px'
			    	}, 300 );
			    	break;

			    case 'landscape':
			    	this.close();
			     	break;
			  }
			  $scope.drawerState = 'peek';
			  $scope.$broadcast( 'drawerPeek' );
			}

			this.cycle = function(){
				switch( $scope.drawerState ){
					case 'open':
						if( _this.orientation == 'portrait'){
							_this.peek();
						} else {
							_this.close();
						}
						break;
					case 'peek':
					case 'close':
						_this.open();
						break;
				}
			}

			this.reset = function(){
				$drawer.css({
					'top':'',
					'left':''
				});
			}
		},
		link: function( scope, elem, attrs ){

			scope._setOrientation();
			$(window).on( 'resize orientationChange', function(){
				scope._setOrientation() 
			});

			scope.$on( '$viewContentLoaded', scope._setDrawerState );
		}
	}
});