/**
 * Prevent overscroll on iOS. Adapted from 
 * http://stackoverflow.com/questions/10238084
 */

var selScrollable = '.scrollable';

$(document).on('touchmove',function(e){
  e.preventDefault();
});

$('body').on('touchstart', selScrollable, function(e) {

  if (e.currentTarget.scrollTop === 0) {
    e.currentTarget.scrollTop = 1;
  } else if (e.currentTarget.scrollHeight === e.currentTarget.scrollTop + e.currentTarget.offsetHeight) {
    e.currentTarget.scrollTop -= 1;
  }

  if( e.currentTarget.scrollLeft === 0) {
    e.currentTarget.scrollLeft = 1;
  } else if ( e.currentTarget.scrollWidth === e.currentTarget.scrollLeft + e.currentTarget.offsetWidth ) {
    e.currentTarget.scrollLeft -= 1;
  }
});

$( 'body' ).on( 'touchmove', selScrollable, function( e ){
  // Only block default if internal div contents are large enough to scroll
  // Warning: scrollHeight support is not universal. (http://stackoverflow.com/a/15033226/40352)
  if( $(this)[0].scrollHeight > $(this).innerHeight() ){
    e.stopPropagation();
  }

  if( $(this)[0].scrollWidth > $(this).innerWidth() ){
    e.stopPropagation();
  }
});

$(window).on('orientationchange', function() {
  window.scrollTo(0, 0);
});