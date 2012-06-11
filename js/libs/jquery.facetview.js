/*
 * jquery.facetview.js
 *
 * displays faceted browse results by querying a specified index
 * can read config locally or can be passed in as variable when executed
 * or a config variable can point to a remote config
 * config options include specifying SOLR or ElasticSearch index
 * 
 * created by Mark MacGillivray - mark@cottagelabs.com
 *
 * http://facetview.cottagelabs.com
 *
*/

// first define the bind with delay function from (saves loading it separately) 
// https://github.com/bgrins/bindWithDelay/blob/master/bindWithDelay.js
(function($) {
    $.fn.bindWithDelay = function( type, data, fn, timeout, throttle ) {
    var wait = null;
    var that = this;

    if ( $.isFunction( data ) ) {
        throttle = timeout;
        timeout = fn;
        fn = data;
        data = undefined;
    }

    function cb() {
        var e = $.extend(true, { }, arguments[0]);
        var throttler = function() {
            wait = null;
            fn.apply(that, [e]);
            };

            if (!throttle) { clearTimeout(wait); }
            if (!throttle || !wait) { wait = setTimeout(throttler, timeout); }
        }

        return this.bind(type, data, cb);
    }
})(jQuery);


// now the facetview function
(function($){
    // commons functions
    var showspinner = function() {
	    $('#search_static').hide();
	    $('#search_spinner').show();
    }

    var hidespinner = function() {
	    $('#search_spinner').hide();
	    $('#search_static').show();
    }

    var showerror = function(msg) {
        if (!msg){ msg = _("Error: unspecified"); }
	    hidespinner();
	    $('#facetview_results').before('<div id="errormsg" class="alert alert-error"><i class="icon-warning-sign"></i> <strong>' + _("Error") + ':</strong> '+msg+'</div>');
    }

    var clearerror = function() {
        $('#errormsg').remove();
    }

    $.fn.facetview = function(options) {

	var opening_hours_format =
		"<i class='icon-time'></i>"+
		"{{#d0}}<span style='color: green;'>" + _("Open") +
		 "</span> " + _("today") + " {{d1}} {{/d0}}" +
		"{{^d0}}<span style='color: red; font-style: italic;'>" + _("Closed") +	"</span> " +
		"{{#d1}}(" + _("open today") + " {{d1}}){{/d1}} {{/d0}}";

	var coordinate_format = "\
		<i class='icon-map-marker'></i> \
		{{#d0}}<a href=\"\" onclick='ld_mapcontrol_init(\"{{d0}}\", \"<b>{{d1}}</b>\", \"<br>{{d2}}<br>{{d3}} {{d4}}\"); return false;'>{{/d0}}";

	var search_results = [
		[ { "fields": "additional_info.slug,  name_fi", "format": "<h3><a href='/{{d0}}'>{{d1}}</a></h3>" } ],
		[ { "fields": "contact.coordinates, name_fi, contact.street_address.street_fi, contact.street_address.post_code, contact.street_address.municipality_fi",
		    "format": coordinate_format },
		  { "fields": "contact.street_address.street_fi, contact.street_address.post_code, contact.street_address.municipality_fi", "format": "{{d0}}, {{d1}} {{d2}}</a>" } ],
		[ { "fields": "open_now, opening_hours", "format": opening_hours_format } ],
		[ { "fields": "id, additional_info.slug, name_fi, id", "format": "<a class='btn btn-big btn-info' title='{{d2}} ({{d0}})' href='/{{#d1}}{{d1}}{{/d1}}{{^d1}}id/{{d3}}{{/d1}}'>" + _("Show details") + " &rarr;</a>" } ]
	]
/*		[ { "field": "services" } ], */
/* optimal would be not to show list of services, but rather just icons for the most important services */
/* the result entry should be a link to a page with more details */

	// library-directory default settings
	var settings = {
            "config_file": false,
            "facets":[
		{'field': 'consortium', 'size': 100, 'order':'term', 'display': _('Library consortium')},
		{'field': 'organisation_type', 'display': _('Type')},
		{'field': 'branch_type', 'display': _('Branch type')},
		{'field': 'services.name_fi', 'order':'term', 'display': _('Services'), "size":40 },
		{'field': 'accessibility.accessible_entry', 'display': _('Accessibility')},
		{'field': 'contact.street_address.municipality_fi', 'display': _('City')}
		],
            "addremovefacets": false,
            "result_display": search_results,
            "display_images": true,
            "visualise_filters": true,
            "description":"",
            "search_url":"http://localhost:8888/testink/organisation/_search?",
            // TODO: if localhost unreachable, use public server
            // "search_url":"http://libdir.seravo.fi:8888/testink/_search?",
            "search_index":"elasticsearch",
            "default_url_params":{},
            "freetext_submit_delay":"1000",
            "query_parameter":"q",
            "q":"*:*",
            "predefined_filters":
				[
					{ "terms": { "organisation_type" : [ "branchlibrary", "library" ] } }
				]
				,
            "paging":{ from: 0, size: 5 }
        };

		// container for active facetview filters for visualisation purposes
		var facetfilters = [];

        // and add in any overrides from the call
        var options = $.extend(settings, options);

        // ===============================================
        // functions to do with filters
        // ===============================================
        
        // show the filter values
        var showfiltervals = function(event) {
            event.preventDefault();
            if ( $(this).hasClass('facetview_open') ) {
                $(this).children('i').replaceWith('<i class="icon-plus"></i>')
                $(this).removeClass('facetview_open');
                $('#facetview_' + $(this).attr('rel') ).children().hide();
            } else {
                $(this).children('i').replaceWith('<i class="icon-minus"></i>')
                $(this).addClass('facetview_open');
                $('#facetview_' + $(this).attr('rel') ).children().show();      
            }
        }

        // function to perform for sorting of filters
        var sortfilters = function(event) {
            event.preventDefault()
            var sortwhat = $(this).attr('href')
            var which = 0
            for (item in options.facets) {
                if ('field' in options.facets[item]) {
                    if ( options.facets[item]['field'] == sortwhat) {
                        which = item
                    }
                }
            }
            if ( $(this).hasClass('facetview_count') ) {
                options.facets[which]['order'] = 'count'
            } else if ( $(this).hasClass('facetview_term') ) {
                options.facets[which]['order'] = 'term'
            } else if ( $(this).hasClass('facetview_rcount') ) {
                options.facets[which]['order'] = 'reverse_count'
            } else if ( $(this).hasClass('facetview_rterm') ) {
                options.facets[which]['order'] = 'reverse_term'
            }
            dosearch()
            if ( !$(this).parent().parent().siblings('.facetview_filtershow').hasClass('facetview_open') ) {
                $(this).parent().parent().siblings('.facetview_filtershow').trigger('click')
            }
        }

        // adjust how many results are shown
        var morefacetvals = function(event) {
            event.preventDefault()
            var morewhat = options.facets[ $(this).attr('rel') ]
            if ('size' in morewhat ) {
                var currentval = morewhat['size']
            } else {
                var currentval = 10
            }
            var newmore = prompt('Currently showing ' + currentval + 
                '. How many would you like instead?')
            if (newmore) {
                options.facets[ $(this).attr('rel') ]['size'] = parseInt(newmore)
                $(this).html('show up to (' + newmore + ')')
                dosearch()
                if ( !$(this).parent().parent().siblings('.facetview_filtershow').hasClass('facetview_open') ) {
                    $(this).parent().parent().siblings('.facetview_filtershow').trigger('click')
                }
            }
        }

        // insert a facet range once selected
        var dofacetrange = function(event) {
            event.preventDefault()
            var rel = $('#facetview_rangerel').html()
            var range = $('#facetview_rangechoices').html()
            var newobj = '<a class="facetview_filterselected facetview_facetrange facetview_clear ' + 
                'btn btn-info" rel="' + rel + 
                '" alt="remove" title="remove"' +
                ' href="' + $(this).attr("href") + '">' +
                range + ' <i class="icon-remove"></i></a>';
            $('#facetview_selectedfilters').append(newobj);
            $('.facetview_filterselected').unbind('click',clearfilter);
            $('.facetview_filterselected').bind('click',clearfilter);
            $('#facetview_rangemodal').modal('hide')
            $('#facetview_rangemodal').remove()
            options.paging.from = 0
            dosearch();
        }
        // remove the range modal from page altogether on close (rebuilt for each filter)
        var removerange = function(event) {
            event.preventDefault()
            $('#facetview_rangemodal').modal('hide')
            $('#facetview_rangemodal').remove()
        }
        // build a facet range selector
        var facetrange = function(event) {
            event.preventDefault()
            var modal = '<div class="modal" id="facetview_rangemodal"> \
                <div class="modal-header"> \
                <a class="facetview_removerange close">×</a> \
                <h3>Set a filter range</h3> \
                </div> \
                <div class="modal-body"> \
                <div style=" margin:20px;" id="facetview_slider"></div> \
                <h3 id="facetview_rangechoices" style="text-align:center; margin:10px;"> \
                <span class="facetview_lowrangeval">...</span> \
                <small>to</small> \
                <span class="facetview_highrangeval">...</span></h3> \
                <p>(NOTE: ranges must be selected based on the current content of \
                the filter. If you require more options than are currently available, \
                cancel and return to the filter options; select sort by term, and set \
                the number of values you require)</p> \
                </div> \
                <div class="modal-footer"> \
                <a id="facetview_dofacetrange" href="#" class="btn btn-primary">Apply</a> \
                <a class="facetview_removerange btn close">Cancel</a> \
                </div> \
                </div>';
            $('#facetview').append(modal)
            $('#facetview_rangemodal').append('<div id="facetview_rangerel" style="display:none;">' + $(this).attr('rel') + '</div>')
            $('#facetview_rangemodal').modal('show')
            $('#facetview_dofacetrange').bind('click',dofacetrange)
            $('.facetview_removerange').bind('click',removerange)
            var values = []
            var valsobj = $( '#facetview_' + $(this).attr('href').replace(/\./gi,'_') )
            valsobj.children('li').children('a').each(function() {
                values.push( $(this).attr('href') )
            })
            values = values.sort()
            $( "#facetview_slider" ).slider({
	            range: true,
	            min: 0,
	            max: values.length-1,
	            values: [0,values.length-1],
	            slide: function( event, ui ) {
		            $('#facetview_rangechoices .facetview_lowrangeval').html( values[ ui.values[0] ] )
		            $('#facetview_rangechoices .facetview_highrangeval').html( values[ ui.values[1] ] )
	            }
            })
            $('#facetview_rangechoices .facetview_lowrangeval').html( values[0] )
            $('#facetview_rangechoices .facetview_highrangeval').html( values[ values.length-1] )
        }


        // pass a list of filters to be displayed
        var buildfilters = function() {
            var filters = options.facets;
			var filterheader = "<h3>" + _("Filter by") + "</h3>";
			var thefilters = "";

            for ( var idx in filters ) {
                var _filterTmpl = ' \
                    <div id="facetview_filterbuttons" class="btn-group"> \
                    <a style="text-align:left; min-width:70%;" class="facetview_filtershow btn" \
                      rel="{{FILTER_NAME}}" href=""> \
                      <i class="icon-plus"></i> \
                      {{FILTER_DISPLAY}}</a> \
                      </div> \
                  <ul id="facetview_{{FILTER_NAME}}" \
                    class="facetview_filters"></ul> \
                    ';
                if (options.visualise_filters) {
                    var vis = '<li class="divider"></li><li><a class="facetview_visualise" rel="{{FACET_IDX}}" href="{{FILTER_DISPLAY}}">visualise this filter</a></li>'
                    thefilters += _filterTmpl.replace(/{{FACET_VIS}}/g, vis)
                } else {
                    thefilters += _filterTmpl.replace(/{{FACET_VIS}}/g, '')
                }
                thefilters = thefilters.replace(/{{FILTER_NAME}}/g, filters[idx]['field'].replace(/\./gi,'_')).replace(/{{FILTER_EXACT}}/g, filters[idx]['field']);
                if ('size' in filters[idx] ) {
                    thefilters = thefilters.replace(/{{FILTER_HOWMANY}}/gi, filters[idx]['size'])
                } else {
                    thefilters = thefilters.replace(/{{FILTER_HOWMANY}}/gi, 10)
                }
                thefilters = thefilters.replace(/{{FACET_IDX}}/gi,idx)
                if ('display' in filters[idx]) {
                    thefilters = thefilters.replace(/{{FILTER_DISPLAY}}/g, filters[idx]['display'])
                } else {
                    thefilters = thefilters.replace(/{{FILTER_DISPLAY}}/g, filters[idx]['field'])
                }
            }
            $('#facetview_filters').html("").append(filterheader+thefilters)
			$('#facetview_filters').after('<div id=clearbutton style="display: none;"><button style="min-width: 78%;" class="btn btn-success" id="clear_facetfilters">' + _("Clear all filters") + '</button></div>');
			$('#clear_facetfilters').bind('click', function(event) {
				event.preventDefault();
				$('#facetview_selectedfilters').children().each(function(){
					var index = facetfilters.indexOf($(this).attr("href"));
					facetfilters.splice(index,1);
					$(this).remove();
				});

				$('#facetview_selectedextrafilters').children().each(function(){
					$(this).remove();
					$("#facetview_location").show();
					ld_position = null;
				});

				if (facetfilters.length==0 && ld_position == null) $('#clearbutton').hide();
				dosearch();
			});

	// get geolocation and show location-filter, if applicable
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			function (position) {
			    //console.log(position);
			    $('#facetview_filters h3').after('<button style="min-width: 78%;" class="btn btn-primary" id="facetview_location">' + _("Show libraries near my location") + '</button>');
			    $('#facetview_location').bind('click',function(event){ 
					$('#facetview_location').hide();
					$('#clearbutton').show();
					ld_position=true;
					ld_position_coords=position.coords;
					clickextrabubble("ld_location",_("Libraries near my location"));
			    }); 
			},
		// the error callback that never gets called (in firefox?)
		function (error) {
			switch(error.code) {
				case error.TIMEOUT:
					showerror('Geolocation: Timeout');
					break;
				case error.POSITION_UNAVAILABLE:
					showerror('Geolocation: Position unavailable');
					break;
				case error.PERMISSION_DENIED:
					showerror('Geolocation: Permission denied');
					break;
				case error.UNKNOWN_ERROR:
					showerror('Geolocation: Unknown error');
					break; }
		        } );
		}
	else {
		showerror("Geolocation not supported"); }

            options.visualise_filters ? $('.facetview_visualise').bind('click',show_vis) : ""
            $('.facetview_morefacetvals').bind('click',morefacetvals)
            $('.facetview_facetrange').bind('click',facetrange)
            $('.facetview_sort').bind('click',sortfilters)
            $('.facetview_filtershow').bind('click',showfiltervals)
            options.addremovefacets ? addremovefacets() : ""
            if (options.description) {
                $('#facetview_filters').append('<div><h3>Meta</h3>' + options.description + '</div>')
            }
        }

        // set the available filter values based on results
        var putvalsinfilters = function(data) {
            // for each filter setup, find the results for it and append them to the relevant filter
            for ( var each in options.facets ) {
                $('#facetview_' + options.facets[each]['field'].replace(/\./gi,'_')).children().remove();
                var records = data["facets"][ options.facets[each]['field'] ];
                for ( var item in records ) {
					var append = "";
					if (facetfilters.indexOf(item)!= -1 ) {
						append = "<li class='selectedfilter'>" + item + ' (' + records[item] + ')</li>';
					}
					else {
						append = '<li><a class="facetview_filterchoice' + 
							'" rel="' + options.facets[each]['field'] + '" href="' + item + '">' + item +
							' (' + records[item] + ')</a></li>';
					}

                    $('#facetview_' + options.facets[each]['field'].replace(/\./gi,'_')).append(append);
                }
                if ( !$('.facetview_filtershow[rel="' + options.facets[each]['field'].replace(/\./gi,'_') + '"]').hasClass('facetview_open') ) {
                    $('#facetview_' + options.facets[each]['field'].replace(/\./gi,'_') ).children().hide();
                }
            }
            $('.facetview_filterchoice').bind('click',clickfilterchoice);
        }

        // show the add/remove filters options
        var addremovefacet = function(event) {
            event.preventDefault()
            if ( $(this).hasClass('facetview_filterselected') ) {
                $(this).removeClass('facetview_filterselected')
                // and remove from options.facets
            } else {
                $(this).addClass('facetview_filterselected')
                options.facets.push({'field':$(this).attr('href')})
            }
            buildfilters()
            dosearch()
        }
        var showarf = function(event) {
            event.preventDefault()
            $('#facetview_addremovefilters').toggle()
        }
        var addremovefacets = function() {
            $('#facetview_filters').append('<a id="facetview_showarf" href="">' + 
                'add more filters</a><div id="facetview_addremovefilters"></div>')
            for (var facet in options.addremovefacets) {
                $('#facetview_addremovefilters').append()
            }
            $('#facetview_addremovefilters').hide()
            $('#facetview_showarf').bind('click',showarf)
            $('.facetview_filterchoose').bind('click',addremovefacet)
        }

        // ===============================================
        // functions to do with filter visualisations
        // ===============================================

        var show_vis = function(event) {
            event.preventDefault();
            if ($('#facetview_visualisation').length) {
                $('#facetview_visualisation').remove()
            } else {
                var vis = '<div id="facetview_visualisation"> \
                    <div class="modal-header"> \
                    <a class="facetview_removevis close">×</a> \
                    <h3>{{VIS_TITLE}}</h3> \
                    </div> \
                    <div class="modal-body"> \
                    </div> \
                    <div class="modal-footer"> \
                    <a class="facetview_removevis btn close">Close</a> \
                    </div> \
                    </div>';
                vis = vis.replace(/{{VIS_TITLE}}/gi,$(this).attr('href'))
                $('#facetview_rightcol').prepend(vis)
                $('.facetview_removevis').bind('click',show_vis)
                bubble($(this).attr('rel'),$('#facetview_rightcol').css('width').replace(/px/,'')-20)
            }
        }

        var bubble = function(facetidx,width) {
            var facetkey = options.facets[facetidx]['field']
            var facets = options.data.facets[facetkey]
            data = {"children":[]};
            var count = 0;
            for (var fct in facets) {
                var arr = {
                    "className": fct,
                    "packageName": count++,
                    "value": facets[fct]
                }
                data["children"].push(arr);
            }
            var r = width,
                format = d3.format(",d"),
                fill = d3.scale.category20c();
            var bubble = d3.layout.pack()
                .sort(null)
                .size([r, r]);
            var vis = d3.select("#facetview_visualisation > .modal-body").append("svg:svg")
                .attr("width", r)
                .attr("height", r)
                .attr("class", "bubble")
            var node = vis.selectAll("g.node")
                .data(bubble(data)
                .filter(function(d) { return !d.children; }))
                .enter().append("svg:g")
                .attr("class", "node")
                .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
            node.append("svg:title")
                .text(function(d) { return d.data.className + ": " + format(d.value); })
            node.append("svg:circle")
                .attr("r", function(d) { return d.r; })
                .style("fill", function(d) { return fill(d.data.packageName); })
            node.append("svg:text")
                .attr("text-anchor", "middle")
                .attr("dy", ".3em")
                .text(function(d) { return d.data.className.substr(0,10) + ".. (" + d.data.value + ")"; })
            node.on('click',function(d) {
                clickbubble(facetkey,d.data.className)
            })
        };

	var clickextrabubble = function(facetkey,facetvalue) {
		var newobj = '<a class="facetview_extrafilterselected facetview_clear ' +
		'btn btn-info" rel="' + facetkey +
		'" alt="remove" title="remove"' +
		' href="' + facetvalue + '">' +
		facetvalue + ' <i class="icon-remove"></i></a>'
		$('#facetview_selectedextrafilters').append(newobj)
		$('.facetview_extrafilterselected').unbind('click',clearlocationfilter)
		$('.facetview_extrafilterselected').bind('click',clearlocationfilter)
		options.paging.from = 0
		dosearch()
		$('#facetview_visualisation').remove() }

        var clickbubble = function(facetkey,facetvalue) {
            var newobj = '<a class="facetview_filterselected facetview_clear ' + 
                'btn btn-info" rel="' + facetkey + 
                '" alt="remove" title="remove"' +
                ' href="' + facetvalue + '">' +
                facetvalue + ' <i class="icon-remove"></i></a>'

            $('#facetview_selectedfilters').append(newobj)
            $('.facetview_filterselected').unbind('click',clearfilter)
            $('.facetview_filterselected').bind('click',clearfilter)
            options.paging.from = 0
            dosearch()
            $('#facetview_visualisation').remove()
        }
        
        // ===============================================
        // functions to do with building results
        // ===============================================

        // read the result object and return useful vals depending on if ES or SOLR
        // returns an object that contains things like ["data"] and ["facets"]
        var parseresults = function(dataobj) {
            var resultobj = new Object();
            resultobj["records"] = new Array();
            resultobj["start"] = "";
            resultobj["found"] = "";
            resultobj["facets"] = new Object();
            if ( options.search_index == "elasticsearch" ) {
				var days = [ "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday" ];
                for (var item in dataobj.hits.hits) {

					var library_data = dataobj.hits.hits[item]._source;
					var curtime = new Date();
					var unixtime = curtime.getTime();
					var daynum = curtime.getDay();

					/* js daynum is 0-6 starting from sunday, libdir daynum is 0-6 starting from monday, fix it */
					if (daynum==0) daynum = 7;
					daynum = daynum-1;

					/* library is not open until proven otherwise */
					library_data.open_now = false;
					library_data.opening_hours = false;

					var periods = library_data.period;
					for (var i in periods) {
						var p = periods[i]
						for (var j=0; j<7; j++) {
							var start = p[days[j]+"_start"];
							var end = p[days[j]+"_end"];
							/* find a matching time frame within period and apply specific open/close state */
							if ( unixtime >= Date.parse(p.start) && unixtime <= Date.parse(p.end) ) {
								if ( (start!=0 && end!=0) && (start!= null && end!= null) ) {
									library_data.open_now = ld_open_now( { start: start, end: end } );
									library_data.opening_hours = ld_format_time(start) + " - " + ld_format_time(end);
								}
							}
						}
					}

                    dataobj.hits.hits[item]._source["id"] = dataobj.hits.hits[item]._id;
                    resultobj["records"].push(dataobj.hits.hits[item]._source);
                    resultobj["start"] = "";
                    resultobj["found"] = dataobj.hits.total;
                }
                for (var item in dataobj.facets) {
                    var facetsobj = new Object();
                    for (var thing in dataobj.facets[item]["terms"]) {
                        facetsobj[ dataobj.facets[item]["terms"][thing]["term"] ] = dataobj.facets[item]["terms"][thing]["count"];
                    }
                    resultobj["facets"][item] = facetsobj;
                }
            } else {
                resultobj["records"] = dataobj.response.docs;
                resultobj["start"] = dataobj.response.start;
                resultobj["found"] = dataobj.response.numFound;
                if (dataobj.facet_counts) {
                  for (var item in dataobj.facet_counts.facet_fields) {
                      var facetsobj = new Object();
                      var count = 0;
                      for ( var each in dataobj.facet_counts.facet_fields[item]) {
                          if ( count % 2 == 0 ) {
                              facetsobj[ dataobj.facet_counts.facet_fields[item][each] ] = dataobj.facet_counts.facet_fields[item][count + 1];
                          }
                          count += 1;
                      }
                      resultobj["facets"][item] = facetsobj;
                  }
              }
            }
            return resultobj;
        }

        // decrement result set
        var decrement = function(event) {
            event.preventDefault()
            if ( $(this).html() != '..' ) {
                options.paging.from = options.paging.from - options.paging.size
                options.paging.from < 0 ? options.paging.from = 0 : ""
                dosearch();
            }
        }

        // increment result set
        var increment = function(event) {
            event.preventDefault()
            if ( $(this).html() != '..' ) {
                options.paging.from = parseInt($(this).attr('href'))
		$(window).scrollTop(0)
                dosearch()
            }
        }

        // write the metadata to the page
        var putmetadata = function(data) {
            if ( typeof(options.paging.from) != 'number' ) {
                options.paging.from = parseInt(options.paging.from)
            }
            if ( typeof(options.paging.size) != 'number' ) {
                options.paging.size = parseInt(options.paging.size)
            }
            var metaTmpl = ' \
              <div class="pagination"> \
                <ul> \
                  <li class="prev"><a id="facetview_decrement" href="{{from}}">&laquo;' + _("back") + '</a></li> \
                  <li class="active"><a>{{from}} &ndash; {{to}} ' + _("of") + ' {{total}}</a></li> \
                  <li class="next"><a id="facetview_increment" href="{{to}}">' + _("next") + '&raquo;</a></li> \
                </ul> \
              </div> \
              ';
            $('#facetview_metadata').html("Not found...")
            if (data.found) {
                var from = options.paging.from + 1
                var size = options.paging.size
                !size ? size = 10 : ""
                var to = options.paging.from+size
                data.found < to ? to = data.found : ""
                var meta = metaTmpl.replace(/{{from}}/g, from);
                meta = meta.replace(/{{to}}/g, to);
                meta = meta.replace(/{{total}}/g, data.found);
                $('#facetview_metadata').html("").append(meta);
                $('#facetview_decrement').bind('click',decrement)
                from < size ? $('#facetview_decrement').html('..') : ""
                $('#facetview_increment').bind('click',increment)
                data.found <= to ? $('#facetview_increment').html('..') : ""
            }
            $("div.pagination").bind("click", function(){ 
                $("#introtext").slideUp(); // no need to show this as soon as user makes first search
            });

        }

        // given a result record, build how it should look on the page
        var buildrecord = function(index) {
            var record = options.data['records'][index]
            var result = '<tr><td>';
            // add first image where available
            if (options.display_images) {
                var recstr = JSON.stringify(record)
                if (typeof record.additional_info.slug != 'undefined') { 
                    if (record.additional_info.slug.trim() == '') { 
                        console.log("Slug empty for " + record.name_fi);
                        delete record.additional_info.slug;
                    }
                }
                var regex = /(http:\/\/\S+?\.(jpg|png|gif|jpeg))/
                var img = regex.exec(recstr)
                if (img) {
                    result += '<a href="/' + record.additional_info.slug + '"><img class="thumbnail" style="float:left; width:100px; margin:0 5px 10px 0; max-height:150px;" src="' + img[0] + '" /></a>'
                }
            }
            // container for data
            result += '<div class="result-data">'
            // add the record based on display template if available
            var display = options.result_display
            var lines = ''
            for (var lineitem in display) {
                line = ""
                for (object in display[lineitem]) {
					/* printf-style multivalue formatting for search-result data */
					var thekey = display[lineitem][object]['fields']
					var format = display[lineitem][object]['format']
					var thevalue = ""
					var keys = thekey.split(',')
					var data = { }
					var idx = 0

					for (key in keys) {
						/* remove spaces and split fields from keys */
						parts = keys[key].split(' ').join('').split('.')

						if (parts.length == 1) { var res = record }
						else if (parts.length == 2) { var res = record[parts[0]] }
						else if (parts.length == 3) { var res = record[parts[0]][parts[1]] }

						var counter = parts.length - 1
		                if (res && res.constructor.toString().indexOf("Array") == -1) { var thevalue = res[parts[counter]] }
						else {
	                        var thevalue = []
	                        for (var row in res) { thevalue.push(res[row][parts[counter]]) }
						}
					/* add value to mustache data hash */
					if ( (thevalue && thevalue.length) || (thevalue==true || thevalue==false) ) { data["d"+idx]=thevalue }
					idx+=1;
					}
				format ? line += Mustache.render(format, data) : line += thevalue
				}

				if (line) {
					lines += line.replace(/^\s/,'').replace(/\s$/,'').replace(/\,$/,'') + "<br>"
				}
			}
			lines ? result += lines : result += JSON.stringify(record,"","    ")
			result += '</div></td></tr>'
			return result;
		}

        // put the results on the page
        showresults = function(sdata) {
            // get the data and parse from the solr / es layout
            var data = parseresults(sdata);
            options.data = data
            // change filter options
            putvalsinfilters(data);
            // put result metadata on the page
            putmetadata(data);
            // put the filtered results on the page
            $('#facetview_results').html("");
            var infofiltervals = new Array();
            $.each(data.records, function(index, value) {
                // write them out to the results div
                $('#facetview_results').append( buildrecord(index) );
            });
        }

        // ===============================================
        // functions to do with searching
        // ===============================================

        // build the search query URL based on current params
        var solrsearchquery = function() {
            // set default URL params
            var urlparams = "";
            for (var item in options.default_url_params) {
                urlparams += item + "=" + options.default_url_params[item] + "&";
            }
            // do paging params
            var pageparams = "";
            for (var item in options.paging) {
                pageparams += item + "=" + options.paging[item] + "&";
            }
            // set facet params
            var urlfilters = "";
            for (var item in options.facets) {
                urlfilters += "facet.field=" + options.facets[item]['field'] + "&";
            }
            // build starting URL
            var theurl = options.search_url + urlparams + pageparams + urlfilters + options.query_parameter + "=";
            // add default query values
            // build the query, starting with default values
            var query = "";
            for (var item in options.predefined_filters) {
                query += item + ":" + options.predefined_filters[item] + " AND ";
            }
            $('.facetview_filterselected',obj).each(function() {
                query += $(this).attr('rel') + ':"' + 
                    $(this).attr('href') + '" AND ';
            });
            // add any freetext filter
            if ($('#facetview_freetext').val() != "") {
                query += $('#facetview_freetext').val() + '*';
            }
            query = query.replace(/ AND $/,"");
            // set a default for blank search
            if (query == "") {
                query = options.q;
            }
            theurl += query;
            return theurl;
        }

        // build the search query URL based on current params
        var elasticsearchquery = function() {
			var qs = {}
			var query_filters = []
			var query_string = ""
            $('.facetview_filterselected',obj).each(function() {
                if ( $(this).hasClass('facetview_facetrange') ) {
                    var rel = options.facets[ $(this).attr('rel') ]['field']
                    var rngs = {
                        'from': $('.facetview_lowrangeval', this).html(),
                        'to': $('.facetview_highrangeval', this).html()
                    }
                    var obj = {'range': {}}
                    obj['range'][ rel ] = rngs
					query_filters.push(obj);
                } else {
                    var obj = {'term':{}}
                    obj['term'][ $(this).attr('rel') ] = $(this).attr('href')
					query_filters.push(obj);
                }
            });

			// set default search result ordering
			qs.sort = [ { "name_fi" : {} } ];

			// add predefined filters from config options
			var filters = options.predefined_filters;
			for (var item in filters) {
				query_filters.push(filters[item])
			}

			// add freetext search as normal query or else match all documents
			var freetext = $('#facetview_freetext').val()
			if (freetext.length!='') {
				query_fields = ["name_*", "name_short_*", "contact.street_address.municipality_*", "contact.street_address.post_code*", "services.name_*" ]
				query_string = {'query_string': { 'fields': query_fields, 'query': freetext + "*" } }
			} else {
				query_string = {'match_all': {}}
			}

			// sort results by geolocation, if available and requested
			if (ld_position) {
				var lat = ld_position_coords.latitude
				var lon = ld_position_coords.longitude

				qs.sort = [ { "_geo_distance": { "contact.coordinates": { "lat": lat, "lon": lon }, "order": "asc" } } ]
				}

			// build the final query object
			qs.query = {}
			qs.query.filtered = {}
			qs.query.filtered.query = query_string
			qs.query.filtered.filter = { "and": query_filters }

            // set any paging
            options.paging.from != 0 ? qs['from'] = options.paging.from : ""
            options.paging.size != 10 ? qs['size'] = options.paging.size : ""
            // set any facets
            qs['facets'] = {};
            for (var item in options.facets) {
                var obj = options.facets[item]
                delete obj['display']
                qs['facets'][obj['field']] = {"terms":obj}
            }
            return JSON.stringify(qs)
        }

        // execute a search
        var dosearch = function() {
            if ( options.search_index == "elasticsearch" ) {
				// jsonp-request does not call the error function (by design) so use timeout instead
				var searchTimer = window.setTimeout(function() { showerror(_("Could not connect to database. Please try again later.")) }, 5000);
				$.ajax({
					type: "get",
					url: options.search_url,
					data: { source: elasticsearchquery() },
					dataType: "jsonp",
					beforeSend: showspinner,
					success: [ function() { window.clearTimeout(searchTimer) }, clearerror, hidespinner, showresults ]
				});
            } else {
                $.ajax( { type: "get", url: solrsearchquery(), dataType:"jsonp", jsonp:"json.wrf", success: function(data) { showresults(data) } } );
            }
        }

        // trigger a search when a filter choice is clicked
        var clickfilterchoice = function(event) {
            event.preventDefault();
			facetfilters.push($(this).attr("href"));
            var newobj = '<a class="facetview_filterselected facetview_clear ' + 
                'btn btn-info" rel="' + $(this).attr("rel") + 
                '" alt="remove" title="remove"' +
                ' href="' + $(this).attr("href") + '">' +
                $(this).html().replace(/\(.*\)/,'') + ' <i class="icon-remove"></i></a>';
            $('#facetview_selectedfilters').append(newobj);
            $('.facetview_filterselected').unbind('click',clearfilter);
            $('.facetview_filterselected').bind('click',clearfilter);
			if (facetfilters.length>0) $('#clearbutton').show();
            options.paging.from = 0
            dosearch();
        }

        // clear a filter when clear button is pressed, and re-do the search
        var clearfilter = function(event) {
            event.preventDefault();
			var index = facetfilters.indexOf($(this).attr("href"));
			facetfilters.splice(index,1);
			if (facetfilters.length==0 && ld_position == null) $('#clearbutton').hide();
            $(this).remove();
            dosearch();
        }

	// clear the location filter when clicked, and re-do the search
	var clearlocationfilter = function(event) {
		event.preventDefault();
		$(this).remove();
		$("#facetview_location").show();
		ld_position = null;
		if (facetfilters.length==0) $('#clearbutton').hide();
		dosearch(); }

        // adjust how many results are shown
        var howmany = function(event) {
            event.preventDefault()
            var newhowmany = prompt('Currently displaying ' + options.paging.size + 
                ' results per page. How many would you like instead?')
            if (newhowmany) {
                options.paging.size = parseInt(newhowmany)
                options.paging.from = 0
                $('#facetview_howmany').html('results per page (' + options.paging.size + ')')
                dosearch()
            }
        }

        // the facet view object to be appended to the page
        var thefacetview = ' \
           <div id="facetview"> \
             <div class="row-fluid"> \
               <div class="span3"> \
                 <div id="facetview_filters"></div> \
               </div> \
               <div class="span9" id="facetview_rightcol"> \
                   <div id="facetview_searchbar" style="display:inline; float:left;" class="input-prepend"> \
                   <span class="add-on"><i id="search_static" class="icon-search"></i><img id="search_spinner" src="img/spinner.gif" style="display: hidden;" alt="[spinner]"> </span> \
                   <input class="span4" id="facetview_freetext" name="q" value="" placeholder="search term" autofocus /> \
                   </div> \
                   <div style="float:left;" id="facetview_selectedfilters"></div> \
                   <div style="float:left;" id="facetview_selectedextrafilters"></div> \
                   <div id="mapcontainer" class="openlayers-map"><div id="basicmap"></div><div id="mapcontrol"></div></div> \
                 <table class="table table-striped" id="facetview_results"></table> \
                 <div id="facetview_metadata"></div> \
               </div> \
             </div> \
           </div> \
           ';

        // what to do when ready to go
        var whenready = function() {
            // append the facetview object to this object
            thefacetview = thefacetview.replace(/{{HOW_MANY}}/gi,options.paging.size)
            $(obj).append(thefacetview);

            // resize the searchbar
            var thewidth = $('#facetview_searchbar').parent().width()
            $('#facetview_searchbar').css('width',thewidth - 50 + 'px')
            $('#facetview_freetext').css('width', thewidth - 88 + 'px')

            // check paging info is available
            !options.paging.size ? options.paging.size = 10 : ""
            !options.paging.from ? options.paging.from = 0 : ""
            // append the filters to the facetview object
            buildfilters();
            $('#facetview_freetext',obj).bindWithDelay('keyup',dosearch,options.freetext_submit_delay);
            // trigger the search once on load, to get all results
            dosearch();
        }

        // ===============================================
        // now create the plugin on the page
        return this.each(function() {
            // get this object
            obj = $(this);
            
            // check for remote config options, then do first search
            if (options.config_file) {
                $.ajax({
                    type: "get",
                    url: options.config_file,
                    dataType: "jsonp",
                    success: function(data) {
                        options = $.extend(options, data)
                        whenready()
                    },
                    error: function() {
                        $.ajax({
                            type: "get",
                            url: options.config_file,
                            success: function(data) {
                                options = $.extend(options, $.parseJSON(data))
                                whenready()
                            },
                            error: function() {
                                whenready()
                            }
                        })
                    }
                })
            } else {
                whenready()
            }


        }); // end of the function  


    };
})(jQuery);


