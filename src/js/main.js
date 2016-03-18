$(document).ready(function() {
    travel
        .navigation()
        .preloader()
        .localTime()
        .daysCount()
});

var travel = {
    navigation: function() {
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

        //Highlight the active page in navigation
        $("nav a").removeClass('selected'); 
        $("nav a[href='/"+ location.pathname.split("/")[1] +"']").addClass('selected'); 

        return this;
    },
    preloader: function() {
        // Fade out and then hide the preloader once the page loads
        $(window).load(function(){
            $('.preloader').delay(300).fadeOut(400, function(){
               $(this).remove();
            });
        });

        // Fade in and out the preloader icons
        var blocks = $(".preloader-gif");
        var blockIndex = -1;

        function showNextBlock() {
            ++blockIndex;
            blocks.eq(blockIndex % blocks.length)
                .fadeIn(300)
                .delay(300)
                .fadeOut(300, showNextBlock);
        }
        showNextBlock();

        return this;
    },
    localTime: function() {
        function showTheTime() {
            $('.local-time').each(function() {
                var timeZone = $(this).data('tz');
                
                var now = moment().tz(timeZone).format('HH:mm');
                $(this).html( now );
            });
        };

        showTheTime(); // for the first load
        setInterval(showTheTime, 250); // update it periodically

        return this;
    },
    daysCount: function() {
        // Calculate days since 11th of April 2016
        var initialDate = new Date(2016, 3, 11); // 11 April 2016
        var now = Date.now();
        var difference = now - initialDate;
        var millisecondsPerDay = 24 * 60 * 60 * 1000;
        var daysSince = Math.floor(difference / millisecondsPerDay);

        // Write result to HTML
        $('.daycount').html(daysSince);  
    },
};


$(".view-pics").click(function() {
    $('html,body').animate({
        scrollTop: $(".photos").offset().top},
        'slow');
    return false;
});




