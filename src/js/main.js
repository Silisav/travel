jQuery(document).ready(function($){
	var isLateralNavAnimating = false;
	
	//open/close lateral navigation
	$('.cd-nav-trigger').on('click', function(event){
		event.preventDefault();
		//stop if nav animation is running 
		if( !isLateralNavAnimating ) {
			if($(this).parents('.csstransitions').length > 0 ) isLateralNavAnimating = true; 
			
			$('body').toggleClass('navigation-is-open');
			$('.cd-navigation-wrapper').one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function(){
				//animation is over
				isLateralNavAnimating = false;
			});
		}
	});
});

$(".view-pics").click(function() {
    $('html,body').animate({
        scrollTop: $(".photos").offset().top},
        'slow');
    return false;
});


$(document).ready(function(){
	$("nav a").removeClass('selected');	
	$("nav a[href='/"+ location.pathname.split("/")[1] +"']").addClass('selected');    
});

	
$(document).ready(function () {
  // preloader
  $(window).load(function(){
    $('.preloader').delay(400).fadeOut(500);
  })
 
});
