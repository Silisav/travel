// init Masonry
var $grid = $('.my-gallery').masonry({
  itemSelector: 'figure',
  percentPosition: true,
  columnWidth: 'figure'
});
// layout Isotope after each image loads
$grid.imagesLoaded().progress( function() {
  $grid.masonry();
});  