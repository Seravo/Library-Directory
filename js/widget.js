libdir_widgets_loaded = false;

(function() {
// url for client-side widgets
// handle ssl-proxy
var proto = 'http';
if (window.location.protocol == 'https:') {
  proto = 'https';
}
var url = proto + "://localhost:8080/";

var jQuery;

// load jquery if not yet available
if (window.jQuery === undefined || window.jQuery.fn.jquery !== '1.7.2') {
    var script_tag = document.createElement('script');
    script_tag.setAttribute("type","text/javascript");
    // omit protocol for ssl support
    script_tag.setAttribute("src",proto+"://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js");
    if (script_tag.readyState) {
      script_tag.onreadystatechange = function () { // for old ie
          if (this.readyState == 'complete' || this.readyState == 'loaded') {
              scriptLoadHandler();
          }
      };
    } else {
      script_tag.onload = scriptLoadHandler;
    }
    (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script_tag);
} else {
    // or use jquery already on the window
    jQuery = window.jQuery;
    main();
}

function scriptLoadHandler() {
    jQuery = window.jQuery.noConflict(true);
    main();
}

function main() {
	$=jQuery;
	// Change calendar week on /{library-name}/ page
	$(document).on("click", "button.change-week", function(){
		var id = $('div#opentimes_large').attr('for');
		var mondayDate = $(this).attr('monday');

		$.ajax({
		  type: 'POST',
		  url: url+'openTimeChangeWeek',
		  data: {
			id: id,
			value: this.value,
			mondayDate : mondayDate
		  }
		}).fail(function (jqXHR, textStatus) {

		}).done(function (data) {

		  var htmlData = data._source.opening_hours;

		  $('h3.week-label').text(htmlData.title);
		  $('time[itemprop="openingHours"]').children().remove();
		  $('time[itemprop="openingHours"]').append(htmlData.html);

	   });
	});

    jQuery(document).ready(function($) {
		// skip if widgets are already loaded
		if (libdir_widgets_loaded) return;

		var widgets = $('.libdir_widget');

		widgets.each(function(){
			var widget = $(this);
			var widget_id = widget.attr("data-id");
			var widget_type = widget.attr("data-type");
			var widget_params = widget.attr("data-params");
			var widget_lang = "";
			if (widget.attr("data-lang")) widget_lang = widget.attr("data-lang") + "/";

			var jsonp_url = url + widget_lang + "loadwidget?"+widget_params+"&type="+widget_type+"&callback=?";

			// load widget css
			var css_link = $("<link>", {
				rel: "stylesheet",
				type: "text/css",
				href: url + "css/json_widget" + widget_type + ".css" });
			css_link.appendTo('head');

			// load widget html & populate container
			$.getJSON(jsonp_url, function(data) { $('#libdir_widget-'+widget_id).html(data.html); });
		});
		libdir_widgets_loaded = true;
    });
}

})();
