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

			$scope.drawerState = null;

			// Vertical mode only applies to portrait mobile devices. Landscape mobile
			// and portrait iPad slide horizontally.
			$scope._setDrawerMode = function(){
				if( window.outerHeight > window.outerWidth && window.outerWidth <  641 ){
					_this.drawerMode = 'vertical';
				}
				else if( window.outerWidth < 1024 ){
					_this.drawerMode = 'horizontal';
				}
				else{
					_this.drawerMode = 'off';
				}
	    }

	    $scope._setDrawerState = function(){
	    	switch( _this.drawerMode ){
	    		case 'vertical':
	    			if( ! $scope.drawerState ){
		    			$timeout( function(){
		    				_this.peek();
		    			}, 300 );
		    		} else if( $scope.drawerState == 'open' ){
		    			_this.open();
		    		} else {
		    			_this.close();
		    		}
	    			break;
	    		case 'horizontal':
	    			if( $scope.drawerState == 'close' ){
	    				_this.close();
	    			} else {
	    				_this.open();
	    			}
	    			break;
	    	}
	    }

			this.moving = false;

			this.track = function( touch ){

				_this.moving = true;
				$scope.drawerState = null;

				switch( _this.drawerMode ){

					case 'vertical':
				    $drawer.css({
				    	'top': ( touch.pageY ) + 'px'
				    });
				    break;

			    case 'horizontal':
				  	if( touch.pageX < $drawer.outerWidth() ) {
				   	  $drawer.css({
					    	'left': ( touch.pageX - $drawer.outerWidth() ) + 'px'
					    });
				   	}
				   	break;
				}
			}

			this.open = function() {
				switch( _this.drawerMode ){

					case 'vertical':
						$drawer.animate({
							'top': '70px'
						}, 300 );
						break;

					case 'horizontal':
						$drawer.animate({
			    		'left': 0
			    	}, 300 );
			    	break;
				}
				$scope.drawerState = 'open';
				$scope.$broadcast( 'drawerOpen' );
			}

			this.close = function(){
				switch( _this.drawerMode ) {
				
					case 'vertical':
						$drawer.animate({
				    	'top': '100%'
				    }, 300 );
				    break;

				  case 'horizontal':
				  	$drawer.animate({
				    	'left': '-24rem'
				  	}, 300 );
				  	break;
				}
				$scope.drawerState = 'close';
				$scope.$broadcast( 'drawerClose' );
			}

			this.peek = function(){
				switch( _this.drawerMode ) {

					case 'vertical':

						var spaceNeeded = $('.object-title').height() + 70;
			    	var frameTop = window.outerHeight - spaceNeeded;

			    	$drawer.animate({
			    		'top': frameTop + 'px'
			    	}, 300 );
			    	break;

			    case 'horizontal':
			    	this.close();
			     	break;
			  }
			  $scope.drawerState = 'peek';
			  $scope.$broadcast( 'drawerPeek' );
			}

			this.cycle = function(){
				switch( $scope.drawerState ){
					case 'open':
						if( _this.drawerMode == 'vertical'){
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
				$scope._setDrawerMode();
				$scope._setDrawerState();
			}
		},
		link: function( scope, elem, attrs ){
			scope._setDrawerMode();
			scope.$on( '$viewContentLoaded', scope._setDrawerState );
		}
	}
});