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

var selectedOpts = {};

// Spinner options
var opts = {
  lines: 9, // The number of lines to draw
  length: 14, // The length of each line
  width: 8, // The line thickness
  radius: 15, // The radius of the inner circle
  corners: 1, // Corner roundness (0..1)
  rotate: 0, // The rotation offset
  direction: 1, // 1: clockwise, -1: counterclockwise
  color: '#000', // #rgb or #rrggbb or array of colors
  speed: 1.9, // Rounds per second
  trail: 100, // Afterglow percentage
  shadow: true, // Whether to render a shadow
  hwaccel: true, // Whether to use hardware acceleration
  className: 'spinner', // The CSS class to assign to the spinner
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  // top: '400px', // Top position relative to parent in px
  // left: '700px' // Left position relative to parent in px
};

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
        "{{#d2}}" +
        "<i class='icon-time'></i> "+
        "{{#d0}}<span style='color: green;'>" + _("Open") +
         "</span> " + _("today") + " {{d1}} {{/d0}}" +
        "{{^d0}}<span style='color: red; font-style: italic;'>" + _("Closed") + "</span> " +
        "{{#d1}}(" + _("open today") + " {{d1}}){{/d1}} {{/d0}}" +
        "{{/d2}}";

    var coordinate_format = "\
        {{#d2}} \
        <i class='icon-map-marker'></i> \
        {{#d0}}<a href=\"\" onclick='ld_mapcontrol_init(\"{{d0}}\", \"{{d1}}\"); return false;'>{{/d0}}" +
        "{{/d2}}";

    var address_format =
        "{{#d3}}" +
        "{{d0}}, {{d1}} {{d2}}</a>" +
        "{{/d3}}";

  var web_library_format = "\
    {{#d0}} \
    <i class='icon-search'></i> \
    <a href=\"{{d0}}\">" + _('Library catalogue') + "</a>\
    {{/d0}}";

    var search_results = [
        [ { "fields": "id, additional_info.slug,  name_" + _("locale"), "format": "<h3><a href='{{#d1}}{{d1}}{{/d1}}{{^d1}}{{d0}}{{/d1}}'>{{d2}}</a></h3>" } ],
        [ { "fields": "contact.coordinates, map_popup_html, show_address_entry",
            "format": coordinate_format },
          { "fields": "contact.street_address.street_" + _("locale")+", contact.street_address.post_code, contact.street_address.municipality_"+ _("locale") + ", show_address_entry", "format": address_format } ],
        [ { "fields": "open_now, opening_hours, show_opening_hours", "format": opening_hours_format } ],
        [ { "fields": "contact.web_library_url", "format": web_library_format } ]
    ]
/*      [ { "field": "services" } ], */
/* optimal would be not to show list of services, but rather just icons for the most important services */
/* the result entry should be a link to a page with more details */

  // handle ssl-proxy
  var proto = 'http';
  if (window.location.protocol == 'https:') {
    proto = 'https';
  }

    // library-directory default settings
    var settings = {
            "config_file": false,
            "facets":[
                {'field': 'contact.street_address.municipality_'+_("locale"), 'order':'term', 'display': _('City'), "size":600 },
                {'field': 'services.name_'+_("locale"), 'order':'term', 'display': _('Services'), "size":1000 },
                // {'field': 'accessibility.accessibility_entry', 'display': _('Accessibility')},
                {'field': 'accessibility.accessible_entry', 'display': _('Accessible entry')},
                {'field': 'accessibility.accessible_parking', 'display': _('Accessible parking')},
                {'field': 'accessibility.accessible_toilet', 'display': _('Accessible toilet')},
                {'field': 'accessibility.induction_loop', 'display': _('Induction loop')},
                {'field': 'accessibility.large_typeface_collection', 'display': _('Large typeface collection')},
                {'field': 'accessibility.lift', 'display': _('Lift')},
                {'field': 'accessibility.extraaccessibilityinfo', 'display': _('Extra accessibility info')},
                {'field': 'consortium', 'size': 100, 'order':'term', 'display': _('Library consortium')},
                {'field': 'provincial_area', 'size': 100, 'order':'term', 'display': _('Provincial area')},
                {'field': 'organisation_type', 'display': _('Type')},
                {'field': 'branch_type', 'display': _('Branch type')}
            ],
            "addremovefacets": false,
            "result_display": search_results,
            "display_images": true,
            "visualise_filters": false,
            "description":"",
            "search_url": proto + "://localhost:8888/testink/organisation/_search?",
            // TODO: if localhost unreachable, use public server
            // "search_url":"http://libdir.seravo.fi:8888/testink/_search?",

            // "search_url": proto + "://es-proxy.kirjastot.fi/testink/organisation/_search?",
            "search_index":"elasticsearch",
            "default_url_params":{},
            "freetext_submit_delay":"1000",
            "query_parameter":"q",
            "q":"*:*",
            "predefined_filters":
                [
                    { "terms": { "organisation_type" : [ "branchlibrary", "library" ] } },
                    { "term": { "meta.document_state" : "published" } }
                ]
                ,
            // "paging" : { from: 0, size:  }
            "paging":{ from: 0, size: NUMBEROFRESULTS }
        };

        // container for active facetview filters for visualisation purposes
        var facetfilters = [];

        // and add in any overrides from the call
        var options = $.extend(settings, options);

        var hashParams = ld_parse_url_hash();

        // remove consortium facet if consortium-filter is active
        if ( (options.areafilter != undefined && options.areafilter != "") || hashParams.area != undefined ) settings.facets.splice(3,1);

        // remove city facet if city-filter is active
        if ( (options.cityfilter != undefined && options.cityfilter != "") || hashParams.city != undefined ) settings.facets.splice(0,1);

        // ===============================================
        // functions to do with filters
        // ===============================================

        // show the filter values
        var showfiltervals = function(event) {
            event.preventDefault();
            if ( $(this).hasClass('facetview_open') ) {
                $(this).children('span').replaceWith('<span>▸</span>')
                $(this).removeClass('facetview_open');
                $('#facetview_' + $(this).attr('rel') ).children().hide();
            } else {
                $(this).children('span').replaceWith('<span>▾</span>')
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
            var filterheader = "<h3 id='filter-by'>" + _("Filter results") + "</h3>";

            var thefilters = {};
            var _filterTmpl = '<div class="control-group">' +
                  '<label for="facet-filters-cities">' + _("City") + ':</label>' +
                  '<select id="facet-filters-cities" placeholder="' + _("Select...") + '" multiple></select>' +
                  '<label for="facet-filters-services">' + _("Services") + ':</label>' +
                  '<select id="facet-filters-services" placeholder="' + _("Select...") + '" multiple></select>' +
                  '<label for="facet-filters-accessibility">' + _("Accessibility") + ':</label>' +
                  '<select id="facet-filters-accessibility" placeholder="' + _("Select...") + '" multiple></select>' +
                  '<label for="facet-filters-library-consortium">' + _("Library consortium") + ':</label>' +
                  '<select id="facet-filters-library-consortium" placeholder="' + _("Select...") + '" multiple></select>' +
                  '<label for="facet-filters-provincial-area">' + _("Provincial area") + ':</label>' +
                  '<select id="facet-filters-provincial-area" placeholder="' + _("Select...") + '" multiple></select>' +
                  '<label for="facet-filters-types">' + _("Type") + ':</label>' +
                  '<select id="facet-filters-types" placeholder="' + _("Select...") + '" multiple></select>' +
                  '<label for="facet-filters-branchtypes">' + _("Branch type") + ':</label>' +
                  '<select id="facet-filters-branchtypes" placeholder="' + _("Select...") + '" multiple></select>';

            for(var idx in filters) {

                var filter = {
                    name: '{{FILTER_NAME}}',
                    display: '{{FILTER_DISPLAY}}',
                    size: '{{FILTER_HOWMANY}}',
                    idx: '{{FACET_IDX}}'
                };

                filter.name = filter.name.replace(/{{FILTER_NAME}}/g, filters[idx]['field']).replace(/{{FILTER_EXACT}}/g, filters[idx]['field']);

                if ('size' in filters[idx] ) {
                    filter.size = filter.size.replace(/{{FILTER_HOWMANY}}/gi, filters[idx]['size'])
                } else {
                    filter.size = filter.size.replace(/{{FILTER_HOWMANY}}/gi, 10);
                }

                filter.idx = filter.idx.replace(/{{FACET_IDX}}/gi,idx);

                if ('display' in filters[idx]) {
                    filter.display = filter.display.replace(/{{FILTER_DISPLAY}}/g, filters[idx]['display']);
                } else {
                    filter.display = filter.display.replace(/{{FILTER_DISPLAY}}/g, filters[idx]['field']);
                }

                if(filter.name.match(/accessibility*/)) {
                    if(!thefilters.accessibility){
                        thefilters.accessibility = {
                            name: 'accessibility'
                        };
                    } else {
                        thefilters.accessibility[filter.display] = filter;
                    }
                } else {
                    thefilters[filter.name] = filter;
                }
                options.thefilters = thefilters;
            }

            _filterTmpl += '</div>';

            $('#facetview_filters').html("").append(filterheader+_filterTmpl)


        // get geolocation and show location-filter, if applicable

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              function (position) {
                  // activate automatic geolocation, if available
                  $("#sort_select").append('<li><a>' + _('Geolocation') + '</a></li>');
                  ld_position=true;
                  ld_position_coords=position.coords;

                  var hash = ld_parse_url_hash();

                  if(hash.s === _('Geolocation') || !hash.s){
                    $('a#current-sort').text(_('Geolocation') + ' ');
                    $('<span class="caret"></span>').appendTo('a#current-sort');
                    $("#sort_select").val(_('Geolocation'));
                  }

                  dosearch();
              },
              // the error callback that never gets called (in firefox?)
              function (error) {
                  switch(error.code) {
                      case error.TIMEOUT:
                          /*showerror('Geolocation: Timeout');*/
                          break;
                      case error.POSITION_UNAVAILABLE:
                          /*showerror('Geolocation: Position unavailable');*/
                          break;
                      case error.PERMISSION_DENIED:
                          /*showerror('Geolocation: Permission denied');*/
                          break;
                      case error.UNKNOWN_ERROR:
                          /*showerror('Geolocation: Unknown error');*/
                          break; }
                      } );
        }  else {
             /* showerror("Geolocation not supported"); */
        }


            $("#sort_select").on('click', 'li a', function() {
                // if(this.text === _('Geolocation') && !ld_position) {
                //     alert('Please turn on geolocation features in your browser or reload the page');
                //     return;
                // }

                // var find = \s;
                // var re = new RegExp('\s', 'g');

                $('a#current-sort').text(this.text + ' ');
                $('<span class="caret"></span>').appendTo('a#current-sort')
                $("#sort_select").val(this.text);

                // if(this.text === _('Main libraries first')) {
                //     ld_append_url_hash('#s=main_libraries_first');
                // } else {


                // ld_append_url_hash('#s=' + replaced);

                ld_append_url_hash('s=' + encodeURIComponent(this.text));


                dosearch();
           });

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

         var putvalsinfilters = function(data) {
            // for each filter setup, find the results for it and append them to the relevant filter
            var filterOpts = [];

            for (var each = 0; each < options.facets.length; each++) {

                $('#facetview_' + options.facets[each].field.replace(/\./gi,'_')).children().remove();

                var records = data["facets"][ options.facets[each].field ];

                for ( var item in records ) {
                    var append = "";
                    if (facetfilters.length>0 && $.inArray(item, facetfilters) != -1 ) {
                        var displayItem = "";
                        if (item=='T') displayItem = _('yes');
                        else displayItem = item;
                        filterOpts.push({
                            display:_(displayItem),
                            rel:options.facets[each].field,
                            count: records[item],
                            value: item
                        });
                    }
                    else {
                        var facetType = options.facets[each].field;

                        // do not display empty selectors
                        if (item=='') continue;

                        // do not display some branch types at all
                        if (facetType=='branch_type' && (item == 'default' || item == 'novalue' || item == 'main_library')) continue;

                        // do not display some branch types if geolocation is active
                        if (facetType=='branch_type' && ld_position && (item == 'mobile' || item == 'home_service')) continue;

                        // do not display false accessibility data
                        if (facetType=='accessibility.accessible_entry' && item == 'F') continue;

                        // localize facet selectors
                        var displayItem = "";
                        if (facetType=='branch_type' || facetType=='organisation_type') displayItem = _(item);
                        // else if (facetType=='accessibility.accessible_entry' && item == 'T') dissplayItem = _("yes");
                            else if (facetType=='consortium') {
                              if (CONSORTIUMS[item] != undefined) displayItem = CONSORTIUMS[item].name;
                              // avoid error with dash in facet field (analyzer splits it)
                              else continue;
                            }
                            else if (facetType=='provincial_area') {
                              if (REGIONS[item] != undefined) displayItem = REGIONS[item]['name_'+_('locale')];
                              // avoid error with dash in facet field (analyzer splits it)
                              else continue;
                            }

                            else displayItem = item;

                            if(!filterOpts[options.facets[each].field]){
                                filterOpts[options.facets[each].field] = [];
                            }

                            filterOpts[options.facets[each].field].push({
                                display:displayItem,
                                rel:options.facets[each].field,
                                count: records[item],
                                value: item
                            });
                    }

                }
                if ( !$('.facetview_filtershow[rel="' + options.facets[each].field.replace(/\./gi,'_') + '"]').hasClass('facetview_open') ) {
                    $('#facetview_' + options.facets[each].field.replace(/\./gi,'_') ).children().hide();
                }
            }


            for(var k in options.thefilters) {

                var css;
                var arr = [];

                if(options.thefilters[k].name === 'undefined'){
                    continue;
                }

                // define right selector
                if(options.thefilters[k].name === 'contact.street_address.municipality_' + _('locale')) css = 'cities';
                if(options.thefilters[k].name === 'services.name_' + _('locale')) css = 'services';

                if (options.thefilters[k].name === 'consortium') css = 'library-consortium';
                if (options.thefilters[k].name === 'provincial_area') css = 'provincial-area';
                if (options.thefilters[k].name === 'organisation_type') css = 'types';
                if (options.thefilters[k].name === 'branch_type') css = 'branchtypes';

                if(options.thefilters[k].name === 'accessibility') {

                    css = 'accessibility';

                    for(var x in options.thefilters[k]){

                        var _filter = options.thefilters[k][x];

                        if(filterOpts[_filter.name]){

                            for(var f in filterOpts[_filter.name]){
                                if(filterOpts[_filter.name][f].display === 'T'){
                                    arr.push({
                                        count: filterOpts[_filter.name][f].count,
                                        display: options.thefilters[k][x].display,
                                        rel: filterOpts[_filter.name][f].rel,
                                        value: filterOpts[_filter.name][f].rel
                                    })
                                }
                            }

                        }

                    }
                }

                for(var x in filterOpts[options.thefilters[k].name]){
                    if(filterOpts[options.thefilters[k].name][x].value !== 'undefined' &&
                        typeof filterOpts[options.thefilters[k].name][x] === 'object'){
                      arr.push(filterOpts[options.thefilters[k].name][x]);
                    }
                }

                // Check if selectized has been initialized
                if($('#facet-filters-' + css).hasClass('selectized')) {
                    var select = $('#facet-filters-' + css).selectize();
                    var selectize = select[0].selectize;
                    var values = [];

                    if(k === 'accessibility'){
                        for(var x in options.thefilters[k]){

                            if(facethash[options.thefilters[k][x].name]){
                                values.push(options.thefilters[k][x].name)
                            }

                        }
                    } else {
                        values = facethash[options.thefilters[k].name];
                    }

                    selectize.clearOptions();

                    if(arr.length > 0){
                        selectize.enable();
                        // for(var x in arr){
                        for(var x=0;x<arr.length;x++) {
                            selectize.addOption(arr[x]);
                            selectize.updateOption(arr[x].value, arr[x]);
                        }
                    } else {
                        selectize.disable();
                    }

                    selectize.off('item_add');

                    for(var x in values){
                        selectize.addItem(decodeURIComponent(values[x]));
                    }

                    selectize.on('item_add', clickfilterchoice.bind(null, options.thefilters[k].name));

                    selectize.refreshOptions(false);
                    selectize.refreshItems();
                } else {
                    var select = $('#facet-filters-' + css).selectize({
                        plugins: ['remove_button'],
                        options: arr,
                        searchField: 'display',
                        onItemAdd: clickfilterchoice.bind(null, options.thefilters[k].name),
                        onItemRemove: clearfilter.bind(null, options.thefilters[k].name),
                        sortField: 'display',
                        openOnFocus: true,
                        render: {
                            item: function(item, escape) {
                                return '<div data-rel="'+escape(item.rel)+'" data-value="'+escape(item.display)+'" data-type="item">' +
                                        (item.display ? '<span>' + escape(item.display) + '</span>' : '') +
                                    // (item.display ? '<span>' + escape(item.display) + " (" + escape(item.count) + ')</span>' : '') +
                                    '</div>';
                            },
                            option: function(item, escape) {
                                var label = item.display;
                                return '<div data-rel="'+escape(item.rel)+'" data-value="'+escape(item.display)+'" data-type="option">' +
                                    '<span>' + escape(label) + " (" + escape(item.count) + ')</span>' +
                                    // '<span>' + escape(label) + '</span>' +
                                    '</div>'
                            }
                        }
                    });
                    // If something in facethash
                     if(facethash[options.thefilters[k].name]){
                        var selectize = select[0].selectize;
                        selectize.off('item_add');
                        for(var x in facethash[options.thefilters[k].name]){
                            selectize.addItem(decodeURIComponent(facethash[options.thefilters[k].name][x]));
                        }
                        selectize.on('item_add', clickfilterchoice.bind(null, options.thefilters[k].name));
                    }
                }
            }
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
                // bubble($(this).attr('rel'),$('#facetview_rightcol').css('width').replace(/px/,'')-20)
            }
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

                for(var item = 0; item < dataobj.hits.hits.length; item++) {
                    var library_data = dataobj.hits.hits[item]._source;
                    var curtime = new Date();
                    var unixtime = curtime.getTime();
                    var daynum = curtime.getDay();

                    /* js daynum is 0-6 starting from sunday, libdir daynum is 0-6 starting from monday, fix it */
                    if (daynum==0) daynum = 7;
                    daynum = daynum-1;

                    /* show opening times on front page only if organisation type is branch */
          // also if branch_type != mobile
                    library_data.show_opening_hours = true;
                    if (library_data.organisation_type == 'library' || library_data.branch_type == 'mobile') library_data.show_opening_hours = false;

          /* if locale address is not present, copy over fi-locale data */
          var locale = _("locale");
          var contact = library_data.contact;
          var name = library_data["name_" + locale];
          var address = contact.street_address["street_" + locale];
          var city = contact.street_address["municipality_" + locale];

          if (name === undefined || name === '') { library_data["name_" + locale] = library_data.name_fi; }
          if (address === undefined || address === '') { library_data.contact.street_address["street_" + locale ] = contact.street_address.street_fi; }
          if (city === undefined || city === '') { library_data.contact.street_address["municipality_" + locale ] = contact.street_address.municipality_fi; }

                    /* show address entry only if it is present */
                    library_data.show_address_entry = true;
                    //if (library_data.contact.street_address["street_"+_("locale")]=="") library_data.show_address_entry = false;

                    /* library is closed by default */
                    library_data.open_now = false;
                    library_data.opening_hours = false;
                    var schedule = undefined;

                    // current day opening times
                    if (library_data.schedules !== undefined) {
                      schedule = library_data.schedules[0];
                    }

                    if (schedule !== undefined && schedule.closed === false) {
                      library_data.open_now = true;
                      library_data.opening_hours = schedule.opens + " - " + schedule.closes;
                    }

                    var lib = library_data;
                    lib.map_popup_html =
                        "<strong>" + lib["name_" + _("locale")] + "</strong>" + "<br>" +
                        lib.contact.street_address["street_"+_("locale")] + "<br>" +
                        lib.contact.street_address.post_code + " " + lib.contact.street_address["municipality_" + _("locale")];

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
            $('#facetview_metadata').html("<h3>" + _("No results found") + "</h3>" +
            _("Please try") + "<ul><li>" +
            _("Search with only the first 3-5 letters of your search word to get more matches.") + "</li><li>" +
            _("Remove all search words and drill down to your wanted results using only the search filters.") + "</li></ul>");

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
            //$("div.pagination").bind("click", function(){
            //    $("#introtext").slideUp(); // no need to show this as soon as user makes first search
            //});

        }

        // given a result record, build how it should look on the page
        var buildrecord = function(index) {
            var record = options.data['records'][index]

            // clean up missing or malformed slug
            if (record.additional_info.slug == undefined || record.additional_info.slug == '') record.additional_info.slug=record.id;

            var result = '<tr><td>';
            if (typeof record.default_attachment != 'undefined' && record.default_attachment != null) {
                var index = record.default_attachment;
                var base = record.attachments[index].file;
                var image = "http://kirkanta.kirjastot.fi/media/image_content/small/"+base;

                result += '<a href="' + record.additional_info.slug + '"><img class="thumbnail" style="float:left; width:100px; margin:0 5px 10px 0; max-height:100px;" src="' + image + '" /></a>';
            }
            else {
                var image = "/img/missing.jpg";
                result += '<a href="' + record.additional_info.slug + '"><img class="thumbnail" style="float:left; width:100px; margin:0 5px 10px 0; max-height:100px;" src="' + image + '" /></a>';
            }
            // container for data
            result += '<div class="result-data">'
            // add the record based on display template if available
            var display = options.result_display
            var lines = ''

            for(var lineitem=0;lineitem<display.length;lineitem++) {
                line = ""

                for(var object=0;object<display[lineitem].length;object++) {
                    /* printf-style multivalue formatting for search-result data */
                    var thekey = display[lineitem][object]['fields']
                    var format = display[lineitem][object]['format']
                    var thevalue = ""

                    var keys = thekey.split(',')
                    var data = { }
                    var idx = 0


                    for(var key=0;key<keys.length;key++) {
                        /* remove spaces and split fields from keys */
                        parts = keys[key].split(' ').join('').split('.')

                        if (parts.length == 1) { var res = record }
                        else if (parts.length == 2) { var res = record[parts[0]] }
                        else if (parts.length == 3) { var res = record[parts[0]][parts[1]] }

                        var counter = parts.length - 1
                        if (res && res.constructor.toString().indexOf("Array") == -1) { var thevalue = res[parts[counter]] }
                        else {
                            var thevalue = []
                            for (var row in res) { thevalue.push(res[row][parts[counter]])
                        }
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
            options.data = data;

            // change filter options
            putvalsinfilters(data);

            // put result metadata on the page
            putmetadata(data);
            // put the filtered results on the page
            $('#facetview_results').html("");
            var infofiltervals = new Array();

            if (!$.isEmptyObject(selectedOpts) ||
                    $('#facetview_freetext').val() != "" ||
                    ld_position==true ||
                    $('svg').length){

                ld_mapcontrol_init_geoloc(data.records);

            }
            // TODO Hide map if all false

            var count = data.found;
            if (count==1) $('#search_status').html( _("One search result"));
            else if (count>1) $('#search_status').html( _("%d search results").replace("%d", count) );
            else $('#search_status').html("");

            $.each(data.records, function(index, value) {
                // write them out to the results div
                $('#facetview_results').append( buildrecord(index) );
            });

            var sStr = $('#facetview_freetext').val();
            if(sStr){
                ld_append_url_hash("q=" + sStr);
            }
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

            var qs = {};
            var query_filters = [];
            var query_string = "";

            var hash = ld_parse_url_hash();

            for(var x in selectedOpts) {
                for(var value=0;value<selectedOpts[x].length;value++){
                  var obj = {'term':{}};
                  var value = selectedOpts[x][value];
                  obj['term'][x] = decodeURIComponent(value);
                  query_filters.push(obj);
                }
            }

            // add predefined filters from config options
            var filters = options.predefined_filters;

            for (var item=0; item<filters.length; item++) {
                query_filters.push(filters[item])
            }

            // add freetext search as normal query or else match all documents
            var freetext = $('#facetview_freetext').val()

            if (freetext.length!='') {
                query_fields = ["name_*", "name_short_*", "contact.street_address.municipality_*", "contact.street_address.post_code*", "services.name_*", "description_*" ]
                query_string = {'query_string': { 'fields': query_fields, 'query': freetext + "*", 'default_operator': "AND" } }
            } else {
                query_string = {'match_all': {}}
            }



            // consortium pre-selection from widget #1
            if (options.areafilter != undefined && options.areafilter != "") {
                var obj = {'term':{}}
                obj['term']['consortium'] = options.areafilter;
                query_filters.push(obj);
            }

            // optional city filter from get-parameter
            if (options.cityfilter != undefined && options.cityfilter != "") {
                var obj = {'term':{}}
                obj['term']['contact.street_address.municipality_'+_("locale")] = options.cityfilter;
                query_filters.push(obj);
            }

            // city pre-selection from url hash
            if (hash.city != undefined) {
                var obj = {'term':{}}
                obj['term']['contact.street_address.municipality_'+_("locale")] = hash.city;
                query_filters.push(obj);
            }

            // consortium pre-selection from url hash
            if (hash.area != undefined) {
                var obj = {'term':{}}
                obj['term']['consortium'] = hash.area;
                query_filters.push(obj);
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

            for(var item=0;item<options.facets.length;item++) {
                var obj = options.facets[item]
                delete obj['display']
                qs['facets'][obj['field']] = {"terms":obj}
            }

            // Sorting

            // set default search result ordering
            qs.sort = [ { "name_fi" : {} } ];

            if(hash.s === _('Main libraries first')) {
              qs.sort = {}

              qs.rescore = {
                "query": {
                  "rescore_query": {
                    "match": {
                      "branch_type": {
                      "query": "main_library"
                      }
                    }
                  },
                  "query_weight": 0.7,
                  "rescore_query_weight": 1.2
                  }
                }
            }

            // sort results by geolocation, if available and requested
            if(ld_position && !hash.s || ld_position && hash.s === _('Geolocation')) {
              var lat = ld_position_coords.latitude
              var lon = ld_position_coords.longitude

              qs.sort = [ { "_geo_distance": { "contact.coordinates": { "lat": lat, "lon": lon }, "order": "asc" } } ]
            }

            return JSON.stringify(qs)
        }

        // execute a search
        var dosearch = function() {

            var spinner = new Spinner(opts).spin(document.getElementById('facetview_results'));

            if ( options.search_index == "elasticsearch" ) {
                // jsonp-request does not call the error function (by design) so use timeout instead
                var searchTimer = window.setTimeout(function() { showerror(_("Could not connect to database. Please try again later.")) }, 7000);
                $.ajax({
                    type: "get",
                    url: options.search_url,
                    data: { source: elasticsearchquery() },
                    dataType: "jsonp",
                    beforeSend: showspinner,
                    success: [ function() { window.clearTimeout(searchTimer) }, clearerror, hidespinner, showresults, function() {spinner.stop()} ]
                });
            } else {
                $.ajax( { type: "get", url: solrsearchquery(), dataType:"jsonp", jsonp:"json.wrf", success: function(data) { showresults(data) } } );
            }
        }

        // trigger a search when a filter choice is clicked
        var clickfilterchoice = function(term, data, item) {

            var value = data;
            var name = term;

            // handling accessibility cases
            if(data.match(/accessibility*/)){
                name = data
                value = 'T'
            }

            if (!facethash[name]) facethash[name] = [];
            facethash[name].push(encodeURIComponent(value));
            ld_append_url_hash("f=" + JSON.stringify(facethash));
            options.paging.from = 0

            selectedOpts = facethash;

            dosearch();
        }

        // clear a filter when clear button is pressed, and re-do the search
        var clearfilter = function(term, data) {

            var name = term;
            var value = data;

            // handling accessibility cases
            if(data.match(/accessibility*/)){
                name = data
                value = 'T'
            }

            if(facethash[name]){
              var index = $.inArray(encodeURIComponent(value), facethash[name]);
              facethash[name].splice(index, 1);
              if(facethash[name].length === 0){
                delete facethash[name];
              }
            }

            selectedOpts = facethash;

            if ($.isEmptyObject(facethash)){
                ld_append_url_hash("f=");
            }
            else {
                ld_append_url_hash("f=" + JSON.stringify(facethash));
            }

            dosearch();
        }

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

        var thefacetview = "";
        if ( (options.widget != undefined && options.widget == true) ) {
            // facet object for search widget (map first)
            thefacetview = ' \
               <div id="facetview"> \
                 <div class="row-fluid"> \
                   <div class="span9" id="facetview_rightcol"> \
                       <div id="facetview_searchbar" style="display:inline; float:left;" class="input-prepend input-append"> \
                       <span class="add-on"><i id="search_static" class="icon-search"></i><img id="search_spinner" src="img/spinner.gif" style="display: hidden;" alt="[spinner]"> </span> \
                       <input class="span4" id="facetview_freetext" name="q" value="" placeholder="' + _("search starts automatically after 3 letters") + '" autofocus /> \
                       <div class="btn-group"> \
                          <a id="current-sort" class="btn dropdown-toggle" data-toggle="dropdown" href="#"> \
                            ' + _("Alphabet") + '\
                            <span class="caret"></span> \
                          </a> \
                          <ul id="sort_select" class="dropdown-menu"> \
                            <li><a>' + _("Alphabet") + '</a></li> \
                            <li><a>' + _("Main libraries first") + '</a></li> \
                          </ul> \
                        </div> \
                       </div> \
                       <div id="search_status" style="clear: both;"></div> \
                       <div style="float:left;" id="facetview_selectedfilters"></div> \
                       <div style="float:left;" id="facetview_selectedextrafilters"></div> \
                       <div id="mapcontainer_front" class="openlayers-map"><div id="basicmap"></div><div id="mapcontrol"></div></div> \
                     <table class="table table-striped" id="facetview_results"></table> \
                     <div id="facetview_metadata"></div> \
                   </div> \
                   <div class="span3"> \
				     <div id="mobile_filter_toggle"> \
					 </div> \
                     <div id="facetview_filters"></div> \
                   </div> \
                 </div> \
               </div> \
               ';
        } else {
            // the facet object for normal search (filters first)
            thefacetview = ' \
               <div id="facetview"> \
                 <div class="row-fluid"> \
                   <div class="span3"> \
                     <div id="facetview_filters"> \
                     </div> \
                   </div> \
                   <div class="span9" id="facetview_rightcol"> \
                       <div id="facetview_searchbar" style="display:inline; float:left;" class="input-prepend input-append"> \
                       <span class="add-on"><i id="search_static" class="icon-search"></i><img id="search_spinner" src="img/spinner.gif" style="display: hidden;" alt="[spinner]"> </span> \
                       <input class="span4" id="facetview_freetext" name="q" value="" placeholder="' + _("search starts automatically after 3 letters") + '" autofocus /> \
                        <div class="btn-group"> \
                          <a id="current-sort" class="btn dropdown-toggle" data-toggle="dropdown" href="#"> \
                            ' + _("Alphabet") + '\
                            <span class="caret"></span> \
                          </a> \
                          <ul id="sort_select" class="dropdown-menu"> \
                            <li><a>' + _("Alphabet") + '</a></li> \
                            <li><a>' + _("Main libraries first") + '</a></li> \
                          </ul> \
                        </div> \
                       </div> \
				     <div id="mobile_filter_toggle"> \
					 </div> \
                       <div id="search_status" style="clear: both;"></div> \
                       <div style="float:left;" id="facetview_selectedfilters"></div> \
                       <div style="float:left;" id="facetview_selectedextrafilters"></div> \
                       <div id="mapcontainer_front" class="openlayers-map"><div id="basicmap"></div><div id="mapcontrol"></div></div> \
                     <table class="table table-striped" id="facetview_results"> \
                     </table> \
                     <div id="facetview_metadata"></div> \
                   </div> \
                 </div> \
               </div> \
               ';
        }

        // what to do when ready to go
        var whenready = function() {
            // append the facetview object to this object
            thefacetview = thefacetview.replace(/{{HOW_MANY}}/gi,options.paging.size)
            $(obj).append(thefacetview);

            // resize the searchbar
            function freetext_resize(){
                var thewidth = $('#facetview_searchbar').parent().width()
                $('#facetview_searchbar').css('width',thewidth - 60 + 'px')
                $('#facetview_freetext').css('width', thewidth - 200 + 'px')
            }
            freetext_resize(); // run on initial page load

            // fire each time window size changes
            $(window).resize(function() {
                freetext_resize();
            });

            // check paging info is available
            !options.paging.size ? options.paging.size = 10 : ""
            !options.paging.from ? options.paging.from = 0 : ""

            // check and apply url hash parameters
            var url_data = ld_parse_url_hash();

            // facet parameters
            if (url_data.f != undefined) {
                facethash = JSON.parse(url_data.f);
                selectedOpts = facethash;
                options.paging.from = 0;
            }

            // freetext query param
            if (url_data.q != undefined) {
                // hide introtext if query parameter is present
                //$("#introtext").hide();
                $('#facetview_freetext').val(url_data.q);
            }

             if (url_data.s != undefined) {
                $('a#current-sort').text(decodeURIComponent(url_data.s) + ' ');
                $('<span class="caret"></span>').appendTo('a#current-sort')
                $("#sort_select").val(decodeURIComponent(url_data.s));
            }

			// mobile view triggers and functions
			$('#mobile_filter_toggle').append('<button class="btn mobile_toggler" id="mobile_map_toggle">' + _('Map') + '</button>');
			$('#mobile_filter_toggle').append('<button class="btn mobile_toggler" id="mobile_filters_toggle">' + _('Filter results') + '</button>');

			$('#mobile_map_toggle').bind('click', function(e) {
				e.preventDefault();

				var elem = $('#mapcontainer_front');
				if (elem.css('visibility') == 'hidden') {
					elem.hide();
					elem.css('visibility', 'visible');
					elem.css('position', 'static');
					elem.css('top', 'auto');
					elem.slideToggle();
				} else {
					elem.css('visibility', 'hidden');
					elem.css('position', 'absolute');
					elem.css('top', '-999px');
				}
			});

			$('#mobile_filters_toggle').bind('click', function(e) {
				e.preventDefault();

				var elem = $('#facetview_filters');

				if (elem.css('visibility') == 'hidden') {
					elem.hide();
					elem.css('visibility', 'visible');
					elem.css('position', 'static');
					elem.css('top', 'auto');
					elem.slideToggle();
				} else {
					elem.slideToggle();
				}
			});

            // append the filters to the facetview object
            buildfilters();
            $('#facetview_freetext',obj).bindWithDelay('keyup',function(value){
                if($('#facetview_freetext').val().length > 2 || $('#facetview_freetext').val().length === 0){
                    dosearch();
                }
            },options.freetext_submit_delay);

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

