app.directive( 'vcenter', function(){

	return{
		restrict: 'C',
		transclude: true,
		template: "<div class='vcenter_outer'><div class='vcenter_inner' ng-transclude></div></div>"
	}

});