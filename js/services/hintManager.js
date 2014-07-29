app.service( 'hintManager', function( $location, $timeout, $rootScope ) {

	var _this = this;

	// Wait this number of seconds after last touch before displaying hints again
	this.delay = 60;

	// Has a hint been seen by the user yet?
	$rootScope.hintSeen = false;

	this.init = function(){

		// Start with hints off
		$rootScope.showHints = false;

		// Has the user seen a hint yet?
		$rootScope.hintSeen = false;

	  var query = $location.search();

		// Directs app to refresh hints after a minute of inactivity.
		$rootScope.hosted = query.hasOwnProperty( 'hosted' ) && query.hosted === 'true';

		// Forces app to assume browser has touch events enabled.
		if( query.hasOwnProperty( 'touch' ) && query.touch === 'true' ){
			this.setTouch();
		} else {
			$rootScope.touch = false;
		}

		// If we aren't explicitly told that this screen is touchable, listen for
		// a touch event and activate hints if one is heard.
		if( ! $rootScope.touch ){
			$(window).on( 'touchstart', _this.setTouch );
		}
	}

	// Sets touch to true, and removes the listener on window if applicable
	this.setTouch = function(){
		$timeout( function(){
			$rootScope.touch = true;
			$rootScope.showHints = true;
			$(window).off( 'touchstart', _this.setTouch );
			if( $rootScope.hosted ){
				$(window).on( 'touchend', function(){
					_this.resetTimer( _this.delay );	
				});
			}
		});
	}

	this.resetTimer = function( delay ){

		// Clear timer if it exists
		if( _this.hasOwnProperty( 'hintTimer' ) ){
			$timeout.cancel( _this.hintTimer );
		}
		// Set new timer
		_this.hintTimer = $timeout( function(){
			if( $rootScope.touch ){
				$rootScope.showHints = true;
			}
		}, delay * 1000 );
	}

	$rootScope.$on( 'zoom', function(){
		if( $rootScope.hintSeen ){
			$timeout( function(){
				$rootScope.showHints = false;
			});
		}
	});

});