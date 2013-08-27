// TDX Presenter.js

var curInnerContent = "annotations";
var curNavButton = "annotations.b"
$(curNavButton).addClass('selected');

$('#'+curInnerContent).fadeIn('fast');


function swapObjectInnerContent(swap){
	if(curInnerContent != swap){
		$('#'+curInnerContent).fadeOut(250, function() {
			$('#'+swap).fadeIn(500);
			curInnerContent = swap;
		});
	}	
}


$('.object-nav a').on("click", function(event){

	$('.object-nav a.selected').removeClass('selected');

	var str = this.id;
	var arr = str.split(".");
	var target = arr[0];
	swapObjectInnerContent(target);
	
	$(this).addClass('selected');
});

/*
$('.allobjects').on("click", function(event){
	
});
*/

var active = 'homeMode';

$( ".home-allobjects" ).click(function() {
	$('#homeMode').fadeOut(500, function(){
		$('#objectMode').fadeIn(500);
		active = "objectMode";
	});
});

$('.home-allstories').click(function(){
	$('#homeMode').fadeOut(500, function(){
		$('#storyMode').fadeIn(500);
		active = "storyMode";
	});	
});

$('.homeicon').click(function(){
	$('#'+active).fadeOut(500, function(){
		$('#homeMode').fadeIn(500);
		active = "homeMode";
	});	
});


$('.allobjects').on("click", function(event){
	if(active != 'objectMode'){
		$('#'+active).fadeOut(500, function(){
			$('#objectMode').fadeIn(500);
			active = "objectMode";
		});	
	}
});


$('.allstories').on("click", function(event){
	if(active != 'storyMode'){
		$('#'+active).fadeOut(500, function(){
			$('#storyMode').fadeIn(500);
			active = "storyMode";
		});	
	}
});



/* obnoxious code i know */


var activeS = 's1';

$( ".s1" ).click(function() {
	if(activeS != 's1'){
		$('#'+activeS).fadeOut(250, function(){
			$('#s1').fadeIn(250);
			activeS = "s1";
		});
	}
});

$( ".s2" ).click(function() {
	if(activeS != 's2'){
		$('#'+activeS).fadeOut(250, function(){
			$('#s2').fadeIn(250);
			activeS = "s2";
		});
	}
});







$(function() {
		
	$( ".accordion" ).accordion({
		heightStyle:'content'
	});

});