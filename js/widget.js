libdir_widgets_loaded = false;

(function() {
// url for client-side widgets
// omit protocol for ssl support
var url = "://localhost:8080/";

var jQuery;

// load jquery if not yet available
if (window.jQuery === undefined || window.jQuery.fn.jquery !== '1.7.2') {
    var script_tag = document.createElement('script');
    script_tag.setAttribute("type","text/javascript");
    // omit protocol for ssl support
    script_tag.setAttribute("src","://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js");
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

