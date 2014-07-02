/**
 * Drawerify directive
 * 
 * Converts the contents of a container to a sliding drawer.
 */
app.directive( 'drawerify', function(){
	return {
		restrict: 'A',
		transclude: true,
		replace: true,
		template: "<div class='drawerify-drawer'><a class='drawerify-handle' ng-class=\"{'horizontal':drawerify.orientation == 'horizontal', 'vertical':drawerify.orientation == 'vertical'}\"></a><div class='drawerify-content' ng-transclude></div></div>",
		controller: function( $scope, $element, $attrs ){

			$scope.drawerify = this;

			/************************************************************************
			 INTERNAL UTILITIES
			 ************************************************************************/

			/**
			 * chooseBreakpoint
			 * 
			 * Cycle through defined breakpoints and get the properties that apply
			 * to the current container width, then set them in the model. Breakpoints 
			 * are interpreted as min-width media queries.
			 */
			this._chooseBreakpoint = function(){

				// Arbitrarily huge number so we start wider than any actual screen
				var currentBpInt = 10000;

				var windowWidth = window.outerWidth;
				var breakpoint = 'default';

				for( var userBreakpoint in this.breakpoints ){
					var bpInt = parseInt( userBreakpoint );
					if( bpInt >= windowWidth && bpInt < currentBpInt ){
						currentBpInt = bpInt;
						breakpoint = userBreakpoint;
					}
				}

				return breakpoint;
			}


			/**
			 * getDrawerWidth
			 */
			this._getDrawerWidth = function(){

				// If maxWidth is wider than container, use container width
				var widthLimit = Math.min( this.containerWidth, this.maxWidth );

				// If maxWidth is narrower than container, but not narrow enough to
				// accommodate the handle, recalculate
				if( 'horizontal' == this.orientation && ( widthLimit + this.handleWidth ) > this.containerWidth ){
					widthLimit = this.containerWidth - this.handleWidth - 10;
				}

				return widthLimit;
			}


			/**
			 * getDrawerHeight
			 */
			this._getDrawerHeight = function(){

				var heightLimit = this.containerHeight;

				// Default height is 100% of container, but in vertical, we need to
				// make room for the handle
				if( 'vertical' == this.orientation ){
					heightLimit = this.containerHeight - this.handleHeight - 10;
				}

				return heightLimit;
			}


			/**
			 * _getDrawerStaticStyles
			 *
			 * Calculate CSS for drawer that won't change with state.
			 */
			this._getDrawerStaticStyles = function(){

				var drawerStyles = {
					// Show drawer, which is set to visibility:hidden in CSS to avoid FOUC
					visibility: 'visible',
					width: this.drawerWidth + 'px',
					height: this.drawerHeight + 'px',
					'z-index': 1000
				}

				// Sacrificing dryness for the sake of simplicity ...

				if( 'vertical' == this.orientation && 'left' == this.attachTo ){
					drawerStyles.top = 'auto';
					drawerStyles.right = 'auto';
					// drawerStyles.bottom is dynamic
					drawerStyles.left = '0';
				}
				else if( 'vertical' == this.orientation && 'right' == this.attachTo ){
					drawerStyles.top = 'auto';
					drawerStyles.right = '0';
					// drawerStyles.bottom is dynamic
					drawerStyles.left = 'auto';
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					drawerStyles.top = '0';
					drawerStyles.right = 'auto';
					drawerStyles.bottom = '0';
					// drawerStyles.left is dynamic
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					drawerStyles.top = '0';
					// drawerStyles.right is dynamic
					drawerStyles.bottom = '0';
					drawerStyles.left = 'auto';
				}

				return drawerStyles;

			}

			/**
			 * _getHandleStaticStyles
			 *
			 * Calculate CSS for handle that won't change with state.
			 */
			this._getHandleStaticStyles = function(){

				var handleStyles = { display: 'block' };

				if( 'vertical' == this.orientation && 'left' == this.attachTo ){
					handleStyles.top = '-' + this.handleHeight + 'px';
					handleStyles.right = 'auto';
					handleStyles.bottom = 'auto';
					handleStyles.left = '0';
				}
				else if( 'vertical' == this.orientation && 'right' == this.attachTo ){
					handleStyles.top = '-' + this.handleHeight + 'px';
					handleStyles.right = '0';
					handleStyles.bottom = 'auto';
					handleStyles.left = 'auto';
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					handleStyles.top = 'auto';
					handleStyles.right = 'auto';
					handleStyles.bottom = '0';
					handleStyles.left = this.drawerWidth + 'px';					
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					handleStyles.top = 'auto';
					handleStyles.right = this.drawerWidth + 'px';
					handleStyles.bottom = '0';
					handleStyles.left = 'auto';					
				}

				return handleStyles;

			}


			/**
			 * _getOpenState
			 *
			 * Calculate values for OPEN drawer state.
			 */
			this._getOpenState = function(){

				var pageLocation, openStyles = {};

				if( 'vertical' == this.orientation ){
					pageLocation = this.containerBottom - this.drawerHeight;
					openStyles.bottom = '0';

				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					pageLocation = this.containerLeft + this.drawerWidth;
					openStyles.left = '0';
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					pageLocation = this.containerRight - this.drawerWidth;
					openStyles.right = '0';
				}

				return {
					css: openStyles,
					pageLocation: pageLocation
				};
			}


			/**
			 * _getClosedState
			 *
			 * Calculate CSS for CLOSED drawer state.
			 */
			this._getClosedState = function(){

				var pageLocation, closedStyles = {};

				if( 'vertical' == this.orientation ){
					pageLocation = this.containerBottom;
					closedStyles.bottom = '-' + this.drawerHeight + 'px';
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					pageLocation = this.containerLeft;
					closedStyles.left = '-' + this.drawerWidth + 'px';
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					pageLocation = this.containerRight;
					closedStyles.right = '-' + this.drawerWidth + 'px';
				}

				return {
					css: closedStyles,
					pageLocation: pageLocation
				};
			}

			/**
			 * _calculateCustomStateStyles
			 *
			 * Calculate CSS for CUSTOM drawer states.
			 */
			this._getCustomState = function( stateName ){

				var pageLocation, customStyles;

				// ISSUE: This early in load, height() is untrustworthy because some
				// elements haven't rendered yet.
				var selector = this.customStates[stateName];
				var $el = $( selector );
				var position = $el.position().top;
				var height = $el.outerHeight();
				var totalHeight = position + height + 10; // Some padding
				var heightDifference = this.drawerHeight - totalHeight;

				pageLocation = this.containerBottom - totalHeight;

				customStyles = {
					bottom: '-' + heightDifference + 'px'
				}

				return {
					css: customStyles,
					pageLocation: pageLocation
				};
			}

			/**
			 * _getDragLimits
			 *
			 * Returns an object representing min and max pageX/pageY values,
			 * depending on orientation and attachment side.
			 */
			this._getDragLimits = function(){

				var limits = {};

				// NOTE: We use drawerHeight and drawerWidth here because they factor
				// in the size of the handle.

				if( 'vertical' == this.orientation ){
					limits.minPageY = this.containerBottom - this.drawerHeight;
					limits.maxPageY = this.containerBottom;
				}
				else if( 'horizontal' == this.orientation && 'left' == this.attachTo ){
					limits.minPageX = this.containerLeft;
					limits.maxPageX = this.containerLeft + this.drawerWidth;
				}
				else if( 'horizontal' == this.orientation && 'right' == this.attachTo ){
					limits.minPageX = this.containerRight - this.drawerWidth;
					limits.maxPageX = this.containerRight;
				}

				return limits;
			}

			/**
			 * _track
			 *
			 * Syncs drawer movement to touch.
			 */
			this._track = function( touch ){

				this.isMoving = true;
				this.state = null;

				var trackStyles = {};

				if( 'vertical' == this.orientation ){

					if( touch.pageY < this.limits.minPageY || touch.pageY > this.limits.maxPageY ){
						return;
					}

					trackStyles.bottom = '-' + ( this.drawerHeight - ( this.containerBottom - touch.pageY ) ) + 'px';

				}
				else if( 'horizontal' == this.orientation ){

					if( touch.pageX < this.limits.minPageX || touch.pageX > this.limits.maxPageX ){
						return;
					}

					if( 'left' == this.attachTo ){
						trackStyles.left = touch.pageX - this.drawerWidth;
					}
					else if( 'right' == this.attachTo ){
						trackStyles.right = '-' + ( this.drawerWidth - ( this.containerRight - touch.pageX ) ) + 'px';
					}
				}

				this.drawer.css( trackStyles );
			}

			/**
			 * _untrack
			 *
			 * Stop tracking drawer and animate to closest state.
			 */
			this._untrack = function( touch ){

				this.isMoving = false;

				var closestStateDistance = null;
				var key = this.orientation == 'vertical' ? 'pageY' : 'pageX';

				for( var state in this.states ){
					var distance = Math.abs( touch[key] - this.states[state].pageLocation );
					if( ! closestStateDistance || distance < closestStateDistance ){
						closestStateDistance = distance;
						closestState = state;
					}
				}

				this.to( closestState );

			}

			/************************************************************************
			 CALLABLE FUNCTIONS
			 ************************************************************************/

			/**
			 * init
			 *
			 * Initialize drawer.
			 */
			this.init = function(){
				var props;

				this.drawer = $( $element[0] );
				this.handle = this.drawer.children( '.drawerify-handle' );
				
				this.breakpoints = $scope.$eval( $attrs.drawerify );
				this.activeBreakpoint = this._chooseBreakpoint();
				props = this.breakpoints[ this.activeBreakpoint ] || 'disabled';
				if( 'disabled' == props ){
					this.disable();
					return;
				}

				this.orientation = props.orientation || 'vertical';
				this.attachTo = props.attachTo || 'right';
				this.startingState = this.state = props.startingState || 'open';
				this.maxWidth = props.maxWidth || -1;
				this.customStates = props.customStates || null;

				this.container = this.drawer.offsetParent();
				this.containerWidth = this.container.width();
				this.containerHeight = this.container.height();
				this.containerTop = this.container.offset().top;
				this.containerBottom = this.containerTop + this.containerHeight;
				this.containerLeft = this.container.offset().left;
				this.containerRight = this.containerLeft + this.containerWidth;
				this.defaultSpeed = 300;
				this.handleWidth = 70;
				this.handleHeight = 70;
				this.drawerWidth = this._getDrawerWidth();
				this.drawerHeight = this._getDrawerHeight();
				this.limits = this._getDragLimits();

				// Define element positions
				this.drawer.css( this._getDrawerStaticStyles() );
				this.handle.css( this._getHandleStaticStyles() );

				// Define how positions will change based on state
				this.states = {
					open: this._getOpenState(),
					closed: this._getClosedState()
				};
				if( 'vertical' == this.orientation ){
					for( stateName in this.customStates ){
						this.states[ stateName ] = this._getCustomState( stateName );
					}
				}

				// Go to initial state
				this.to( this.startingState );

				$scope.$broadcast( 'drawerInitialized', this.drawer );
				$scope.$emit( 'drawerInitialized', this.drawer );

			}

			/**
			 * to
			 *
			 * Transition from one state to another.
			 */
			this.to = function( state, transition ){

   			var transition = typeof transition !== 'undefined' ? transition : this.defaultSpeed;
				this.drawer.animate( this.states[ state ].css, transition );
				this.state = state;

			}


			/**
			 * toggle
			 *
			 * Toggle between open and closed transitions
			 */
			this.toggle = function(){

				if( this.state == 'open' ){
					this.to( 'closed' );
				} 
				else {
					this.to( 'open' );
				}

			}


			/**
			 * disable
			 *
			 * Turn off drawerify and reset controlled elements to original CSS.
			 */
			this.disable = function(){
				this.handle.hide();
				this.managedProperties = [ 'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'z-index' ];
				angular.forEach( this.managedProperties, function( property ){
					$scope.drawerify.drawer.css( property, '' );
				});
			}

		},
		link: function( scope, elem, attrs ){

			scope.drawerify.init();

			/**
			 * Touchmove listener
			 */
			scope.drawerify.handle.on( 'touchmove', function(e){

				var touch = e.originalEvent.targetTouches[0];
				scope.drawerify._track( touch );

			});

			/**
			 * Touchend listener
			 */
			scope.drawerify.handle.on( 'touchend', function(e){

				var touch = e.originalEvent.changedTouches[0];

				// Drag
				if( scope.drawerify.isMoving ){
					scope.drawerify._untrack( touch );
				} 
				// Click
				else {
					scope.drawerify.toggle();
				}

			});

			/**
			 * Resize listener
			 */
			$(window).on( 'resize orientationchange', function(){
				scope.drawerify.init();
			});


			$('.object-title').on('click', function(){
				scope.drawerify.disable();
			});
		}
	}
});