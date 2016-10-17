$(document).ready(function() {
    travel
        .navigation()
        .preloader()
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
};

var map;

function makeMap() {
	// create map
	map = new L.map('map');

	// create the tile layer with correct attribution
	// leaflet demo here: https://leaflet-extras.github.io/leaflet-providers/preview/
	// https: also suppported.
	var Stamen_Watercolor = L.tileLayer('http://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}', {
		attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		subdomains: 'abcd',
		minZoom: 1,
		maxZoom: 16,
		ext: 'png'
	});

	L.marker([56, -3]).bindPopup("Edinburgh").addTo(map);
	L.marker([35, 139]).bindPopup("<a href='japan.html'>Japan</a>").addTo(map);
	L.marker([21, 106]).bindPopup("<a href='vietnam.html'>Vietnam</a>").addTo(map);
	L.marker([11.5, 104]).bindPopup("<a href='cambodia.html'>Cambodia</a>").addTo(map);
	L.marker([14, 100]).bindPopup("<a href='thailand.html'>Thailand</a>").addTo(map);
	L.marker([3.1, 101.7]).bindPopup("<a href='malaysia.html'>Malaysia</a>").addTo(map);
	L.marker([-6.9, 107.8]).bindPopup("<a href='indonesia.html'>Indonesia</a>").addTo(map);
	L.marker([38,23.7]).bindPopup("<a href='greece.html'>Greece</a>").addTo(map);

	var polyline = L.polyline([
	    [56, -3],
	    [35, 139],
	    [21, 106],
	    [11.5, 104],
	    [14, 100],
	    [3.1, 101.7],
	    [-6.9, 107.8],
	    [38,23.7],
	], {color: 'red'}).addTo(map);

	map.addLayer(Stamen_Watercolor);
	map.setView([14, 116], 3);
}

$(document).ready( function() {
	makeMap();
});
