$(function () {
  $("#how_it_works_carousel").on("slide", function (event) {
    var allSlides = $(event.target).find(".item");
    var slide = event.relatedTarget;
    var index = Array.prototype.slice.call(allSlides).indexOf(slide);
    $("#how_it_works_indicators li").removeClass("active");
    $("#how_it_works_indicators li[data-slide-index=\"" + index + "\"]").addClass("active");
  });
});
