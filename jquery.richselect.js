/**
 * Display a nice easy to use rich select list
 * @Version: 1.0.0
 * @Author: 1datr
 * @Contact: the1datr@ya.ru
 * @Source: https://github.com/nobleclem/jQuery-MultiSelect
 *
 * Usage:
 *     $('select[multiple]').richselect();
 *     $('select[multiple]').richselect({ texts: { placeholder: 'Select options' } });
 *     $('select[multiple]').richselect('reload');
 *     $('select[multiple]').richselect( 'loadOptions', [{
 *         name   : 'Option Name 1',
 *         value  : 'option-value-1',
 *         checked: false,
 *         attributes : {
 *             custom1: 'value1',
 *             custom2: 'value2'
 *         }
 *     },{
 *         name   : 'Option Name 2',
 *         value  : 'option-value-2',
 *         checked: false,
 *         attributes : {
 *             custom1: 'value1',
 *             custom2: 'value2'
 *         }
 *     }]);
 * Options with html code
 *     <select>
 *     <option>{#a href="yandex.ru"#}Yandex{#/a#}</option>
 *     <option>{#a href="rambler.ru"#}Rambler{#/a#}</option>
 *     </select>
 *
 **/
(function($){
    var defaults = {
        columns: 1,     // how many columns should be use to show options
        search : false, // include option search box

        // search filter options
        searchOptions : {
            delay        : 250,                  // time (in ms) between keystrokes until search happens
            showOptGroups: false,                // show option group titles if no options remaining
            searchText   : true,                 // search within the text
            searchValue  : false,                // search within the value
            onSearch     : function( element ){} // fires on keyup before search on options happens
        },

        // plugin texts
        texts: {
            placeholder    : 'Select options', // text to use in dummy input
            search         : 'Search',         // search input placeholder text
            selectedOptions: ' selected',      // selected suffix text
            selectAll      : 'Select all',     // select all text
            unselectAll    : 'Unselect all',   // unselect all text
            noneSelected   : 'None Selected'   // None selected text
        },

        // general options       
        selectAll          : false, // add select all option
        selectGroup        : false, // select entire optgroup
        minHeight          : 200,   // minimum height of option overlay
        maxHeight          : null,  // maximum height of option overlay
        maxWidth           : null,  // maximum width of option overlay (or selector)
        maxPlaceholderWidth: null,  // maximum width of placeholder button
        maxPlaceholderOpts : 10,    // maximum number of placeholder options to show until "# selected" shown instead
        showCheckbox       : true,  // display the checkbox to the user
        checkboxAutoFit    : false,  // auto calc checkbox padding
        optionAttributes   : [],    // attributes to copy to the checkbox from the option element
        // my options
        src				   : null,
        values			   : null,
        multiple		   : true,


        // Callbacks
        onLoad        : function( element ){},           // fires at end of list initialization
        onOptionClick : function( element, option ){},   // fires when an option is clicked
        onControlClose: function( element ){},           // fires when the options list is closed
        onSelectAll   : function( element, selected ){}, // fires when (un)select all is clicked
    };

    var rsCounter    = 1; // counter for each select list
    var rsOptCounter = 1; // counter for each option on page   

    // FOR LEGACY BROWSERS (talking to you IE8)
    if( typeof Array.prototype.map !== 'function' ) {
        Array.prototype.map = function( callback, thisArg ) {
            if( typeof thisArg === 'undefined' ) {
                thisArg = this;
            }

            return $.isArray( thisArg ) ? $.map( thisArg, callback ) : [];
        };
    }
    if( typeof String.prototype.trim !== 'function' ) {
        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g, '');
        };
    }
        
    function MultiSelect( element, options )
    {
        this.element           = element;
        this.options           = $.extend( true, {}, defaults, options );
        this.updateSelectAll   = true;
        this.updatePlaceholder = true;
        this.listNumber        = rsCounter;
        
        // from attributes
        var _src=$(this.element).attr('src');
        if(_src!==undefined)
        	this.options.src = _src;
        
        var _values=$(this.element).attr('values');
        if(_values!==undefined)
        	this.options.values = _values;
        
    
        this.rsMode		 	   = 'radio';
        if (typeof $(this.element).attr('multiple') !== "undefined") 
        {
        	this.rsMode		   = 'checkbox';
        }
        

        rsCounter = rsCounter + 1; // increment counter

        /* Make sure its a richselect list */
        /*
        if( !$(this.element).attr('multiple') ) {
            throw new Error( '[jQuery-MultiSelect] Select list must be a richselect list in order to use this plugin' );
        }
*/
        /* Options validation checks */
        if( this.options.search ){
            if( !this.options.searchOptions.searchText && !this.options.searchOptions.searchValue ){
                throw new Error( '[jQuery-MultiSelect] Either searchText or searchValue should be true.' );
            }
        }

        /** BACKWARDS COMPATIBILITY **/
        if( 'placeholder' in this.options ) {
            this.options.texts.placeholder = this.options.placeholder;
            delete this.options.placeholder;
        }
        if( 'default' in this.options.searchOptions ) {
            this.options.texts.search = this.options.searchOptions['default'];
            delete this.options.searchOptions['default'];
        }
        /** END BACKWARDS COMPATIBILITY **/

        // load this instance
        this.load();
        
       
    }

    MultiSelect.prototype = {
        /* LOAD CUSTOM MULTISELECT DOM/ACTIONS */
        load: function() {
            var instance = this;

            // make sure this is a select list and not loaded
            if( (instance.element.nodeName != 'SELECT') || $(instance.element).hasClass('jqmsLoaded') ) {
                return true;
            }

            // sanity check so we don't double load on a select element
            $(instance.element).addClass('jqmsLoaded rs-list-'+ instance.listNumber ).data( 'plugin_richselect-instance', instance );

            var str_classes=$(instance.element).attr('class');
            // add option container
            /*
            <p style="text-overflow:ellipsis;overflow:hidden;margin-bottom:0px;">ОТДЕЛ ПРОДАЖ (общий), ОТДЕЛ ПРОДАЖ (Испания), ЭКСПО (Логистика)</p> 
             * */
            $(instance.element).after('<div id="rs-list-'+ instance.listNumber +'" class="rs-options-wrap"><button type="button"  class="'+str_classes+'"><p style="text-overflow:ellipsis;overflow:hidden;margin-bottom:0px;">None Selected</p></button>'+
            		'<div class="rs-options"><div class="rs-ul-before"><div class="rs-ul"><ul></ul></div></div></div></div>');

            var placeholder = $(instance.element).siblings('#rs-list-'+ instance.listNumber +'.rs-options-wrap').find('> button:first-child');
            var optionsWrap = $(instance.element).siblings('#rs-list-'+ instance.listNumber +'.rs-options-wrap').find('> .rs-options');
            var o_l_width = $(instance.element).attr('olwidth');
            var o_l_height = $(instance.element).attr('olheight');
            if(o_l_width!==undefined)
            	$(optionsWrap).find('.rs-ul').css('width',o_l_width);
            
            if(o_l_height===undefined)
            	o_l_height = '350px';
            $(optionsWrap).find('.rs-ul').css('height',o_l_height);
            
            var optionsList = optionsWrap.find('.rs-ul > ul');

            // don't show checkbox (add class for css to hide checkboxes)
            if( !instance.options.showCheckbox ) {
                optionsWrap.addClass('hide-'+instance.rsMode+'');
            }
            else if( instance.options.checkboxAutoFit ) {
                optionsWrap.addClass(''+instance.rsMode+'-autofit');
            }

            // check if list is disabled
            if( $(instance.element).prop( 'disabled' ) ) {
                placeholder.prop( 'disabled', true );
            }

            // set placeholder maxWidth
            if( instance.options.maxPlaceholderWidth ) {
                placeholder.css( 'maxWidth', instance.options.maxPlaceholderWidth );
            }

            // override with user defined maxHeight
            if( instance.options.maxHeight ) {
                var maxHeight = instance.options.maxHeight;
            }
            else {
                // cacl default maxHeight
                var maxHeight = ($(window).height() - optionsWrap.offset().top + $(window).scrollTop() - 20);
            }

            // maxHeight cannot be less than options.minHeight
            maxHeight = maxHeight < instance.options.minHeight ? instance.options.minHeight : maxHeight;

            optionsWrap.find('.rs-ul').css({
                maxWidth : instance.options.maxWidth,
             //   minHeight: instance.options.minHeight,
             //   maxHeight: maxHeight,
            });

            // isolate options scroll
            // @source: https://github.com/nobleclem/jQuery-IsolatedScroll
            optionsWrap.on( 'touchmove mousewheel DOMMouseScroll', function ( e ) {
                if( ($(this).outerHeight() < $(this)[0].scrollHeight) ) {
                    var e0 = e.originalEvent,
                        delta = e0.wheelDelta || -e0.detail;

                    if( ($(this).outerHeight() + $(this)[0].scrollTop) > $(this)[0].scrollHeight ) {
                        e.preventDefault();
                        this.scrollTop += ( delta < 0 ? 1 : -1 );
                    }
                }
            });

            // hide options menus if click happens off of the list placeholder button
            $(document).off('click.rs-hideopts').on('click.rs-hideopts', function( event ){
            	            	            	
                if( !$(event.target).closest('.rs-options-wrap').length ) {
                    $('.rs-options-wrap.rs-active > .rs-options').each(function(){
                    	
                    	if( $(event.target).closest('.modal').get(0)==$(this).closest('.modal').get(0) )
                    	{
                    		$(this).closest('.rs-options-wrap').removeClass('rs-active');
                    	}

                        var listID = $(this).closest('.rs-options-wrap').attr('id');

                        var thisInst = $(this).parent().siblings('.'+ listID +'.jqmsLoaded').data('plugin_richselect-instance');

                        // USER CALLBACK
                        if( typeof thisInst.options.onControlClose == 'function' ) {
                            thisInst.options.onControlClose( thisInst.element );
                        }
                    });
                }
            // hide open option lists if escape key pressed
            }).on('keydown', function( event ){
                if( (event.keyCode || event.which) == 27 ) { // esc key
                    $(this).trigger('click.rs-hideopts');
                }
            });

            // handle pressing enter|space while tabbing through
            placeholder.on('keydown', function( event ){
                var code = (event.keyCode || event.which);
                if( (code == 13) || (code == 32) ) { // enter OR space
                    placeholder.trigger( 'mousedown' );
                }
            });

            // disable button action
            placeholder.on( 'mousedown', function( event ){
                // ignore if its not a left click
                if( event.which && (event.which != 1) ) {
                    return true;
                }

                // hide other menus before showing this one
                $('.rs-options-wrap.rs-active').each(function(){
                    if( $(this).siblings( '.'+ $(this).attr('id') +'.jqmsLoaded')[0] != optionsWrap.parent().siblings('.rs-list-'+ instance.listNumber +'.jqmsLoaded')[0] ) {
                        $(this).removeClass('rs-active');

                        var thisInst = $(this).siblings( '.'+ $(this).attr('id') +'.jqmsLoaded').data('plugin_richselect-instance');

                        // USER CALLBACK
                        if( typeof thisInst.options.onControlClose == 'function' ) {
                            thisInst.options.onControlClose( thisInst.element );
                        }
                    }
                });

                // show/hide options
                optionsWrap.closest('.rs-options-wrap').toggleClass('rs-active');

                // recalculate height
                if( optionsWrap.closest('.rs-options-wrap').hasClass('rs-active') ) {
                //    optionsWrap.find('.rs-ul').css( 'maxHeight', '' );

                    // override with user defined maxHeight
                    if( instance.options.maxHeight ) {
                        var maxHeight = instance.options.maxHeight;
                    }
                    else {
                        // cacl default maxHeight
                        var maxHeight = ($(window).height() - optionsWrap.offset().top + $(window).scrollTop() - 20);
                    }

                    if( maxHeight ) {
                        // maxHeight cannot be less than options.minHeight
                        maxHeight = maxHeight < instance.options.minHeight ? instance.options.minHeight : maxHeight;

                     //   optionsWrap.find('.rs-ul').css( 'maxHeight', maxHeight );
                    }
                }
                else if( typeof instance.options.onControlClose == 'function' ) {
                    instance.options.onControlClose( instance.element );
                }
            }).click(function( event ){ event.preventDefault(); });

            // add placeholder copy
            if( instance.options.texts.placeholder ) {
                //placeholder.find('span').text( instance.options.texts.placeholder );
                placeholder.find('p').text( instance.options.texts.placeholder );
            }

            // add search box
            if( instance.options.search ) {
                //optionsList.before('<div class="rs-search"><input type="text" value="" placeholder="'+ instance.options.texts.search +'" /></div>');
            	optionsWrap.prepend($('<div class="rs-search"><input type="text" value="" placeholder="'+ instance.options.texts.search +'" /></div>'));	
                
                var search = optionsWrap.find('.rs-search input');
                search.on('keyup', function(){
                    // ignore keystrokes that don't make a difference
                    if( $(this).data('lastsearch') == $(this).val() ) {
                        return true;
                    }

                    // pause timeout
                    if( $(this).data('searchTimeout') ) {
                        clearTimeout( $(this).data('searchTimeout') );
                    }

                    var thisSearchElem = $(this);

                    $(this).data('searchTimeout', setTimeout(function(){
                        thisSearchElem.data('lastsearch', thisSearchElem.val() );

                        // USER CALLBACK
                        if( typeof instance.options.searchOptions.onSearch == 'function' ) {
                            instance.options.searchOptions.onSearch( instance.element );
                        }

                        // search non optgroup li's
                        var searchString = $.trim( search.val().toLowerCase() );
                        if( searchString ) {
                            optionsList.find('li[data-search-term*="'+ searchString +'"]:not(.optgroup)').removeClass('rs-hidden');
                            optionsList.find('li:not([data-search-term*="'+ searchString +'"], .optgroup)').addClass('rs-hidden');
                        }
                        else {
                            optionsList.find('.rs-hidden').removeClass('rs-hidden');
                        }

                        // show/hide optgroups based on if there are items visible within
                        if( !instance.options.searchOptions.showOptGroups ) {
                            optionsList.find('.optgroup').each(function(){
                                if( $(this).find('li:not(.rs-hidden)').length ) {
                                    $(this).show();
                                }
                                else {
                                    $(this).hide();
                                }
                            });
                        }

                        instance._updateSelectAllText();
                    }, instance.options.searchOptions.delay ));
                });
            }

            // add global select all options
            if( instance.options.selectAll ) {
                optionsList.before('<a href="#" class="rs-selectall global">' + instance.options.texts.selectAll + '</a>');
            }

            // handle select all option
            optionsWrap.on('click', '.rs-selectall', function( event ){
                event.preventDefault();

                instance.updateSelectAll   = false;
                instance.updatePlaceholder = false;

                var select = optionsWrap.parent().siblings('.rs-list-'+ instance.listNumber +'.jqmsLoaded');

                if( $(this).hasClass('global') ) {
                    // check if any options are not selected if so then select them
                    if( optionsList.find('li:not(.optgroup, .selected, .rs-hidden)').length ) {
                        // get unselected vals, mark as selected, return val list
                        optionsList.find('li:not(.optgroup, .selected, .rs-hidden)').addClass('selected');
                        optionsList.find('li.selected input[type="'+instance.rsMode+'"]:not(:disabled)').prop( 'checked', true );
                    }
                    // deselect everything
                    else {
                        optionsList.find('li:not(.optgroup, .rs-hidden).selected').removeClass('selected');
                        optionsList.find('li:not(.optgroup, .rs-hidden, .selected) input[type="'+instance.rsMode+'"]:not(:disabled)').prop( 'checked', false );
                    }
                }
                else if( $(this).closest('li').hasClass('optgroup') ) {
                    var optgroup = $(this).closest('li.optgroup');

                    // check if any selected if so then select them
                    if( optgroup.find('li:not(.selected, .rs-hidden)').length ) {
                        optgroup.find('li:not(.selected, .rs-hidden)').addClass('selected');
                        optgroup.find('li.selected input[type="'+instance.rsMode+'"]:not(:disabled)').prop( 'checked', true );
                    }
                    // deselect everything
                    else {
                        optgroup.find('li:not(.rs-hidden).selected').removeClass('selected');
                        optgroup.find('li:not(.rs-hidden, .selected) input[type="'+instance.rsMode+'"]:not(:disabled)').prop( 'checked', false );
                    }
                }

                var vals = [];
                optionsList.find('li.selected input[type="'+instance.rsMode+'"]').each(function(){
                    vals.push( $(this).val() );
                });
                select.val( vals ).trigger('change');

                instance.updateSelectAll   = true;
                instance.updatePlaceholder = true;

                // USER CALLBACK
                if( typeof instance.options.onSelectAll == 'function' ) {
                    instance.options.onSelectAll( instance.element, vals.length );
                }

                instance._updateSelectAllText();
                instance._updatePlaceholderText();
            });

            // add options to wrapper
            var options = [];
            $(instance.element).children().each(function(){
                if( this.nodeName == 'OPTGROUP' ) {
                    var groupOptions = [];

                    $(this).children('option').each(function(){
                        var thisOptionAtts = {};
                        for( var i = 0; i < instance.options.optionAttributes.length; i++ ) {
                            var thisOptAttr = instance.options.optionAttributes[ i ];

                            if( $(this).attr( thisOptAttr ) !== undefined ) {
                                thisOptionAtts[ thisOptAttr ] = $(this).attr( thisOptAttr );
                            }
                        }
                        
                        var the_html = $(this).text().replace(/{#/g,'<').replace(/\#\}/g,'>');
                        var the_text = '';
                        try 
                        {
                        	the_text = $(the_html).text();
                            if(the_text=="") 
                            	the_text=the_html;
                        } 
                        catch (err) 
                        {
                        	the_text=the_html;
                        }

                        groupOptions.push({
                            name   : the_text,
                            value  : $(this).val(),
                            checked: $(this).prop( 'selected' ),
                            attributes: thisOptionAtts,
                            html	  : the_html,
                        });
                    });

                    options.push({
                        label  : $(this).attr('label'),
                        options: groupOptions
                    });
                }
                else if( this.nodeName == 'OPTION' ) {
                    var thisOptionAtts = {};
                    for( var i = 0; i < instance.options.optionAttributes.length; i++ ) {
                        var thisOptAttr = instance.options.optionAttributes[ i ];

                        if( $(this).attr( thisOptAttr ) !== undefined ) {
                            thisOptionAtts[ thisOptAttr ] = $(this).attr( thisOptAttr );
                        }
                    }

                    var the_html = $(this).text().replace(/{#/g,'<').replace(/\#\}/g,'>');
                    var the_text = '';
                    try 
                    {
                    	the_text = $(the_html).text();
                        if(the_text=="") 
                        	the_text=the_html;
                    } 
                    catch (err) 
                    {
                    	the_text=the_html;
                    }
                    
                    $(this).text(the_text);
                    options.push({
                        name      : the_text,                        
                        value     : $(this).val(),
                        checked   : $(this).prop( 'selected' ),
                        attributes: thisOptionAtts,
                        html	  : the_html,
                    });
                }
                else {
                    // bad option
                    return true;
                }
            });
            instance.loadOptions( options, true, false );

            // BIND SELECT ACTION
            optionsWrap.on( 'click', 'input[type="'+instance.rsMode+'"]', function(){
                $(this).closest( 'li' ).toggleClass( 'selected' );

                var select = optionsWrap.parent().siblings('.rs-list-'+ instance.listNumber +'.jqmsLoaded');

                if(instance.rsMode=='radio')
                {	
                	$(this).closest('ul').find('input:radio:not(:checked)').removeClass('selected');
                	$(this).closest('ul').find('input:radio:checked').addClass('selected');                	
                }

                
                // toggle clicked option
                select.find('option[value="'+ $(this).val() +'"]').prop(
                    'selected', $(this).is(':checked')
                ).closest('select').trigger('change');

                // USER CALLBACK
                if( typeof instance.options.onOptionClick == 'function' ) {
                    instance.options.onOptionClick(instance.element, this);
                }

                instance._updateSelectAllText();
                instance._updatePlaceholderText();
            });

            // BIND FOCUS EVENT
            optionsWrap.on('focusin', 'input[type="'+instance.rsMode+'"]', function(){
                $(this).closest('label').addClass('focused');
            }).on('focusout', 'input[type="'+instance.rsMode+'"]', function(){
                $(this).closest('label').removeClass('focused');
            });

            // USER CALLBACK
            if( typeof instance.options.onLoad === 'function' ) {
            	
            	if(this.options.src!=undefined)
                {
                 	curr_obj = this;
                 	$.getJSON( this.options.src, function( data ) {
                 		if(instance.options.values!=null)
                 		{
                 			var sel_vals = instance.options.values.split(",");
                 			
                 			for(j=0;j<data.length;j++)
                 			{
                 				data[j]['checked'] = sel_vals.find( function(e)
                 					{
                 						return (data[j].value==e);
                 					}
                 				);
                 			}
                 			
                 		}
                 		instance.options.onLoad( instance.element );
                 		$(instance.element).richselect('loadOptions', data );
                 	});
                }
            	else
            		instance.options.onLoad( instance.element );
            }

            // hide native select list
            $(instance.element).hide();
        },

        /* LOAD SELECT OPTIONS */
        loadOptions: function( options, overwrite, updateSelect ) {
            overwrite    = (typeof overwrite == 'boolean') ? overwrite : true;
            updateSelect = (typeof updateSelect == 'boolean') ? updateSelect : true;

            var instance    = this;
            var select      = $(instance.element);
            var optionsList = select.siblings('#rs-list-'+ instance.listNumber +'.rs-options-wrap').find('> .rs-options > .rs-ul-before  > .rs-ul > ul');
            var optionsWrap = select.siblings('#rs-list-'+ instance.listNumber +'.rs-options-wrap').find('> .rs-options');

            if( overwrite ) {
                optionsList.find('> li').remove();

                if( updateSelect ) {
                    select.find('> *').remove();
                }
            }

            var containers = [];
            for( var key in options ) {
                // Prevent prototype methods injected into options from being iterated over.
                if( !options.hasOwnProperty( key ) ) {
                    continue;
                }

                var thisOption      = options[ key ];
                var container       = $('<li/>');
                var appendContainer = true;

                // OPTION
                if( thisOption.hasOwnProperty('value') ) {
                    if( instance.options.showCheckbox && instance.options.checkboxAutoFit ) {
                        container.addClass('rs-reflow');
                    }

                    // add option to ms dropdown
                    instance._addOption( container, thisOption );

                    if( updateSelect ) {
                        var selOption = $('<option value="'+ thisOption.value +'">'+ thisOption.name +'</option>');

                        // add custom user attributes
                        if( thisOption.hasOwnProperty('attributes') && Object.keys( thisOption.attributes ).length ) {
                            selOption.attr( thisOption.attributes );
                        }

                        // mark option as selected
                        if( thisOption.checked ) {
                            selOption.prop( 'selected', true );
                        }

                        select.append( selOption );
                    }
                }
                // OPTGROUP
                else if( thisOption.hasOwnProperty('options') ) {
                    var optGroup = $('<optgroup label="'+ thisOption.label +'"></optgroup>');

                    optionsList.find('> li.optgroup > span.label').each(function(){
                        if( $(this).text() == thisOption.label ) {
                            container       = $(this).closest('.optgroup');
                            appendContainer = false;
                        }
                    });

                    // prepare to append optgroup to select element
                    if( updateSelect ) {
                        if( select.find('optgroup[label="'+ thisOption.label +'"]').length ) {
                            optGroup = select.find('optgroup[label="'+ thisOption.label +'"]');
                        }
                        else {
                            select.append( optGroup );
                        }
                    }

                    // setup container
                    if( appendContainer ) {
                        container.addClass('optgroup');
                        container.append('<span class="label">'+ thisOption.label +'</span>');
                        container.find('> .label').css({
                            clear: 'both'
                        });

                        // add select all link
                        if( instance.options.selectGroup ) {
                            container.append('<a href="#" class="rs-selectall">' + instance.options.texts.selectAll + '</a>');
                        }

                        container.append('<ul/>');
                    }

                    for( var gKey in thisOption.options ) {
                        // Prevent prototype methods injected into options from
                        // being iterated over.
                        if( !thisOption.options.hasOwnProperty( gKey ) ) {
                            continue;
                        }

                        var thisGOption = thisOption.options[ gKey ];
                        var gContainer  = $('<li/>');
                        if( instance.options.showCheckbox && instance.options.checkboxAutoFit ) {
                            gContainer.addClass('rs-reflow');
                        }

                        // no clue what this is we hit (skip)
                        if( !thisGOption.hasOwnProperty('value') ) {
                            continue;
                        }

                        instance._addOption( gContainer, thisGOption );

                        container.find('> ul').append( gContainer );

                        // add option to optgroup in select element
                        if( updateSelect ) {
                            var selOption = $('<option value="'+ thisGOption.value +'">'+ thisGOption.name +'</option>');

                            // add custom user attributes
                            if( thisGOption.hasOwnProperty('attributes') && Object.keys( thisGOption.attributes ).length ) {
                                selOption.attr( thisGOption.attributes );
                            }

                            // mark option as selected
                            if( thisGOption.checked ) {
                                selOption.prop( 'selected', true );
                            }

                            optGroup.append( selOption );
                        }
                    }
                }
                else {
                    // no clue what this is we hit (skip)
                    continue;
                }

                if( appendContainer ) {
                    containers.push( container );
                }
            }
            optionsList.append( containers );

            // pad out label for room for the checkbox
            if( instance.options.checkboxAutoFit && instance.options.showCheckbox && !optionsWrap.hasClass('hide-'+instance.rsMode+'') ) {
                var chkbx = optionsList.find('.rs-reflow:eq(0) input[type="'+instance.rsMode+'"]');
                if( chkbx.length ) {
                    var checkboxWidth = chkbx.outerWidth();
                        checkboxWidth = checkboxWidth ? checkboxWidth : 15;

                    optionsList.find('.rs-reflow label').css(
                        'padding-left',
                        (parseInt( chkbx.closest('label').css('padding-left') ) * 2) + checkboxWidth
                    );

                    optionsList.find('.rs-reflow').removeClass('rs-reflow');
                }
            }

            // update placeholder text
            instance._updatePlaceholderText();

            // RESET COLUMN STYLES
            optionsWrap.find('ul').css({
                'column-count'        : '',
                'column-gap'          : '',
                '-webkit-column-count': '',
                '-webkit-column-gap'  : '',
                '-moz-column-count'   : '',
                '-moz-column-gap'     : ''
            });

            // COLUMNIZE
            if( select.find('optgroup').length ) {
                // float non grouped options
                optionsList.find('> li:not(.optgroup)').css({
                    'float': 'left',
                    width: (100 / instance.options.columns) +'%'
                });

                // add CSS3 column styles
                optionsList.find('li.optgroup').css({
                    clear: 'both'
                }).find('> ul').css({
                    'column-count'        : instance.options.columns,
                    'column-gap'          : 0,
                    '-webkit-column-count': instance.options.columns,
                    '-webkit-column-gap'  : 0,
                    '-moz-column-count'   : instance.options.columns,
                    '-moz-column-gap'     : 0
                });

                // for crappy IE versions float grouped options
                if( this._ieVersion() && (this._ieVersion() < 10) ) {
                    optionsList.find('li.optgroup > ul > li').css({
                        'float': 'left',
                        width: (100 / instance.options.columns) +'%'
                    });
                }
            }
            else {
                // add CSS3 column styles
                optionsList.css({
                    'column-count'        : instance.options.columns,
                    'column-gap'          : 0,
                    '-webkit-column-count': instance.options.columns,
                    '-webkit-column-gap'  : 0,
                    '-moz-column-count'   : instance.options.columns,
                    '-moz-column-gap'     : 0
                });

                // for crappy IE versions float grouped options
                if( this._ieVersion() && (this._ieVersion() < 10) ) {
                    optionsList.find('> li').css({
                        'float': 'left',
                        width: (100 / instance.options.columns) +'%'
                    });
                }
            }

            // update un/select all logic
            instance._updateSelectAllText();
        },

        /* UPDATE MULTISELECT CONFIG OPTIONS */
        settings: function( options ) {
            this.options = $.extend( true, {}, this.options, options );
            this.reload();
        },

        /* RESET THE DOM */
        unload: function() {
            $(this.element).siblings('#rs-list-'+ this.listNumber +'.rs-options-wrap').remove();
            $(this.element).show(function(){
                $(this).css('display','').removeClass('jqmsLoaded');
            });
        },

        /* RELOAD JQ MULTISELECT LIST */
        reload: function() {
            // remove existing options
            $(this.element).siblings('#rs-list-'+ this.listNumber +'.rs-options-wrap').remove();
            $(this.element).removeClass('jqmsLoaded');

            // load element
            this.load();
        },

        // RESET BACK TO DEFAULT VALUES & RELOAD
        reset: function() {
            var defaultVals = [];
            $(this.element).find('option').each(function(){
                if( $(this).prop('defaultSelected') ) {
                    defaultVals.push( $(this).val() );
                }
            });

            $(this.element).val( defaultVals );

            this.reload();
        },

        disable: function( status ) {
            status = (typeof status === 'boolean') ? status : true;
            $(this.element).prop( 'disabled', status );
            $(this.element).siblings('#rs-list-'+ this.listNumber +'.rs-options-wrap').find('button:first-child')
                .prop( 'disabled', status );
        },

        /** PRIVATE FUNCTIONS **/
        // update the un/select all texts based on selected options and visibility
        _updateSelectAllText: function(){
            if( !this.updateSelectAll ) {
                return;
            }

            var instance = this;

            // select all not used at all so just do nothing
            /*
            if( !instance.options.selectAll && !instance.options.selectGroup ) {
                return;
            }            
*/
            var optionsWrap = $(instance.element).siblings('#rs-list-'+ instance.listNumber +'.rs-options-wrap').find('> .rs-options');

            // update un/select all text
            optionsWrap.find('.rs-selectall').each(function(){
                var unselected = $(this).parent().find('li:not(.optgroup,.selected,.rs-hidden)');

                $(this).text(
                    unselected.length ? instance.options.texts.selectAll : instance.options.texts.unselectAll
                );
            });
        },

        // update selected placeholder text
        _updatePlaceholderText: function(){
            if( !this.updatePlaceholder ) {
                return;
            }

            var instance       = this;
            var select         = $(instance.element);
            var selectVals     = select.val() ? select.val() : [];
            var placeholder    = select.siblings('#rs-list-'+ instance.listNumber +'.rs-options-wrap').find('> button:first-child');
            //var placeholderTxt = placeholder.find('span');
            var placeholderTxt = placeholder.find('p');
            var optionsWrap    = select.siblings('#rs-list-'+ instance.listNumber +'.rs-options-wrap').find('> .rs-options');

            // if there are disabled options get those values as well
            if( select.find('option:selected:disabled').length ) {
                selectVals = [];
                select.find('option:selected').each(function(){
                    selectVals.push( $(this).val() );
                });
            }

            // get selected options
            var selOpts = [];
            
            if(instance.rsMode=='radio')
            {
            	selOpts.push(
	                    $.trim( select.find('option[value="'+ selectVals +'"]').text() )
	                );
            }
            else
            {
	            for( var key in selectVals ) 
	            {
	                // Prevent prototype methods injected into options from being iterated over.
	                if( !selectVals.hasOwnProperty( key ) ) {
	                    continue;
	                }
	
	                selOpts.push(
	                    $.trim( select.find('option[value="'+ selectVals[ key ] +'"]').text() )
	                );
	
	                if( selOpts.length >= instance.options.maxPlaceholderOpts ) {
	                    break;
	                }
	            }
	
	            // UPDATE PLACEHOLDER TEXT WITH OPTIONS SELECTED
	            placeholderTxt.text( selOpts.join( ', ' ) );
            }
            
            if( selOpts.length ) {
                optionsWrap.closest('.rs-options-wrap').addClass('rs-has-selections');
            }
            else {
                optionsWrap.closest('.rs-options-wrap').removeClass('rs-has-selections');
            }

            // replace placeholder text
            if( !selOpts.length ) {
                placeholderTxt.text( instance.options.texts.placeholder );
            }
            else if(instance.rsMode=='radio')
            {
            	if(selOpts.length>0)
            		{
            			if(selOpts[0]=='')
            				placeholderTxt.text( selectVals.length + instance.options.texts.selectedOptions );
            			else
            				placeholderTxt.text(selOpts[0]);
            		}
            	else
            		placeholderTxt.text( selectVals.length + instance.options.texts.selectedOptions );
            }
            // if copy is larger than button width use "# selected"
            else if( (placeholderTxt.width() > placeholder.width()) || (selOpts.length != selectVals.length) ) {
                placeholderTxt.text( selectVals.length + instance.options.texts.selectedOptions );
            }
        },
        
        // Add option to the custom dom list
        _addOption: function( container, option ) {
            var instance = this;
            
            var thisOption = $('<div/>', {
                for : 'rs-opt-'+ rsOptCounter,
               // text: option.name
               // html : '<div class="rs-item-html" for="rs-opt-'+ rsOptCounter+'">'+option.html+'</div>',
            }).append($('<div class="rs-item-html" for="rs-opt-'+ rsOptCounter+'">'+option.html+'</div>'));
            
            var html_block = $(thisOption).find('.rs-item-html');
            
            
            thisOption.addClass('rs-item');
            
            var thisCheckbox = $('<input>', {
                type : ''+instance.rsMode+'',
                title: option.name,
                id   : 'rs-opt-'+ rsOptCounter,
                value: option.value,                
            });
            
            $(thisCheckbox).addClass('selcontrol');
            
            if(instance.rsMode=='radio')
            {
            	thisCheckbox.attr('name',"rs-list-items"+instance.listNumber);
            }
            

            // add user defined attributes
            if( option.hasOwnProperty('attributes') && Object.keys( option.attributes ).length ) {
                thisCheckbox.attr( option.attributes );
            }

            if( option.checked ) {
                container.addClass('default selected');
                thisCheckbox.prop( 'checked', true );
            }

            thisOption.prepend( thisCheckbox );
            
            var a_obj=this;
            thisOption.on('click',function(e){
            	if($(e.target).is('input[type='+a_obj.rsMode+'].selcontrol'))
            		return;
            	$(this).closest('li').find('input[type=checkbox]').trigger('click');
            	
            	$(this).closest('li').find('input[type=radio]').prop("checked",true);
            	$(this).closest('li').find('input[type=radio]').trigger('change');
            	$(this).closest('li').find('input[type=radio]').trigger('click'); //click();
            	
            });
            
            $(html_block).find('*').click(function(e) {
                e.stopPropagation();
           });
            /*
            $(thisOption).find('input[type=radio]').click(function(e) {
                e.stopPropagation();
                $(this).closest('.rs-options').trigger('click'); 
           });*/
          /*  if(option.addition_html!==undefined)
            {
            	thisOption.append( $('<a>'+option.addition_html+'</a>') );
            }*/
            
            var searchTerm = '';
            if( instance.options.searchOptions.searchText ) {
                searchTerm += ' ' + option.name.toLowerCase();
            }
            if( instance.options.searchOptions.searchValue ) {
                searchTerm += ' ' + option.value.toLowerCase();
            }

            container.attr( 'data-search-term', $.trim( searchTerm ) ).prepend( thisOption );

            rsOptCounter = rsOptCounter + 1;
        },

        // check ie version
        _ieVersion: function() {
            var myNav = navigator.userAgent.toLowerCase();
            return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
        }
    };

    // ENABLE JQUERY PLUGIN FUNCTION
    $.fn.richselect = function( options ){
        if( !this.length ) {
            return;
        }
        
        
        
	        var args = arguments;
	        var ret;
	
	        // menuize each list
	        if( (options === undefined) || (typeof options === 'object') ) {
	            return this.each(function(){
	                if( !$.data( this, 'plugin_richselect' ) ) {
	                    $.data( this, 'plugin_richselect', new MultiSelect( this, options ) );
	                }
	            });
	        } else if( (typeof options === 'string') && (options[0] !== '_') && (options !== 'init') ) {
	            this.each(function(){
	                var instance = $.data( this, 'plugin_richselect' );
	
	                if( instance instanceof MultiSelect && typeof instance[ options ] === 'function' ) {
	                    ret = instance[ options ].apply( instance, Array.prototype.slice.call( args, 1 ) );
	                }
	
	                // special destruct handler
	                if( options === 'unload' ) {
	                    $.data( this, 'plugin_richselect', null );
	                }
	            });
	
	            return ret;
	        }
	        	       
        
    };
    
    $(document).on("modal_load",'[role=dialog]',function(e){
    	//$('select[multiple]')
    //	var selects = $('select[multiple]');
    	var selects = $('select:not(.classic)');
    	var attrlist = {'placeholder':'string','columns':'number',
    	                'search':'boolean','src':'string','values':'string',
    	                'placeholder_search':'struct',
    			//'selectGroup',
    	                //'selectAll',
    	                'minHeight':'number','maxWidth':'number','minSelect':'number','maxSelect':'number','maxHeight':'string',
    	                //'showCheckbox'
    	}; 
    	for(var i=0;i<selects.length;i++)
    	{
    		var opts = {
    				searchOptions : {
    		            'default'    : 'Search',             // search input placeholder text
    		            showOptGroups: false,                // show option group titles if no options remaining
    		            onSearch     : function( element ){
    		            	//alert($(element).val());
    		            } // fires on keyup before search on options happens
    		        },
    				
    		};
    		//jQuery.each(attrlist, function() 
    		for(_attr in attrlist) {
    			var attr_val = $(selects[i]).attr(_attr);  
    			if(attr_val !== undefined)
    			{
    				if(attrlist[_attr]=='number')
    					opts[_attr]=Number(attr_val);
    				else
    				{
    					if(attrlist[_attr]=='boolean')
    						opts[_attr]=new Boolean(attr_val);
    					else
    					{
    						if(attrlist[_attr]=='string')
    						{
    							opts[_attr]=attr_val;
    						}
    						else
    						{
    							if(_attr=='placeholder_search')
    							{
    								opts.searchOptions.default=attr_val;
    							}
    						}
    					}
    				}
    			}
    		}
    		$(selects[i]).richselect(opts);
    		
        };    	
	});
    
}(jQuery));
