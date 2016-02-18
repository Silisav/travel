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
	L.marker([35, 139]).bindPopup("Japan").addTo(map);	
	L.marker([21, 106]).bindPopup("Vietnam").addTo(map);
	L.marker([11.5, 104]).bindPopup("Cambodia").addTo(map);
	L.marker([14, 100]).bindPopup("Thailand").addTo(map);
	L.marker([3.1, 101.7]).bindPopup("Malaysia").addTo(map);
	L.marker([-6.9, 107.8]).bindPopup("Indonesia").addTo(map);
	L.marker([41, 29]).bindPopup("Turkey").addTo(map);

	var polyline = L.polyline([
	    [56, -3],
	    [35, 139],
	    [21, 106],
	    [11.5, 104],
	    [14, 100],
	    [3.1, 101.7],
	    [-6.9, 107.8],
	    [41, 29],
	]).addTo(map);

	map.addLayer(Stamen_Watercolor);
	map.setView([14, 116], 3);
}

$(document).ready( function() {
	makeMap();
});

$(document).ready(function(){
	$("nav a").removeClass('selected');	
	$("nav a[href='/"+ location.pathname.split("/")[1] +"']").addClass('selected');
});

$(document).ready(function () {
  // preloader
  $(window).load(function(){
    $('.preloader').delay(2400).fadeOut(500);
  })
 
});

$(document).ready(function(){
	var blocks = $(".preloader-gif");
    var blockIndex = -1;
    
    function showNextBlock() {
        ++blockIndex;
        blocks.eq(blockIndex % blocks.length)
            .fadeIn(400)
            .delay(400)
            .fadeOut(400, showNextBlock);
    }
    
    showNextBlock();
});
