var Behaviors = Behaviors ? Behaviors : {};

// Plugin setup goes here
(function ( $ ) {

    $.fn.transporter = function( options ) {

        // This is the easiest way to have default options.
        var settings = $.extend({
            // These are the defaults.
            animation: "linear",
            transporterColor: "black",
            slideInDirection: "left",
            delay: 500,
            disableScroll: false
        }, options );

        // Transporter the collection based on the settings variable.
        return settings;

    };

}( jQuery ));


Behaviors.transporter = function(context) {
    /*
      Setup our variables
    */
    var transportURL = $('body', context).data('url');
    var $bodyObject = $('body', context);
    var $transporterWrapper = $('#transporter-wrapper', context);
    var $transporter = $('.transporter', context);

    var transporterTimeout;

    /*
      Dynamically generated elements that are cached once these elements
      are initialized.
    */
    var $transporterBuffer = $();
    var $transporterContent = $();

    var offset;
    var transporterTriggerOffset;
    var transportCompleteOffset;
    var responseCache;

    var inTransporterMotion = false;
    var transporterActivated = false;
    var loadedHTML = false;

    var scriptIndex = 0;
    var scripts = [];

    /*
      If our body class does not have 'transport', that means this page does
      not use the Transporter.
    */
    if(!$bodyObject.hasClass('transport')) {
      return;
    }

    if(!window.transported) {
      $(window).on('load', initialize);
    } else {
      initialize();
    }

    function initialize() {
      $bodyObject.wrapInner('<div id="transporter-wrapper" />'); //Styling purposes
      $transporterWrapper = $('#transporter-wrapper', context);
      var bodyClasses = $bodyObject.attr('class');
      var bodyStyles = $bodyObject.attr('style');

      /*
        Make our transporter wrapper have the same styling and classes as our body
        so that the loaded content looks smooth
      */
      $transporterWrapper.attr('class', bodyClasses);
      $transporterWrapper.attr('style', bodyStyles);

      /*
        Sometimes our body has a height set to it, so make sure our transporter-wrapper
        has a height of auto no matter what.
      */
      $transporterWrapper.height('auto');
      /*
        Add a buffer that allows us to scroll a full window.Height() so that our content
        below appears pinned until we scroll past this buffer.
      */
      $transporterWrapper.after('<div id="transporter-content"></div>');
      $transporterContent = $('#transporter-content', context);
      $transporter.show();
      window.transporterActivated = false;
      window.transported = false;
      handleScroll();
      $transporter.hide();
    }

    function calculateOffsets() {
      if($transporterWrapper.height() <= 0) {
        return;

      }

      transportCompleteOffset = $('body').height();
      transporterTriggerOffset = transportCompleteOffset - $(window).height();

    }

    /*
      Handle our scrolling functionality. Once we're past a certain offset, load the HTML of the URL that we are
      transporting to.
    */
    function handleScroll() {
      loadedHTML = false;
      $(window).off('scroll.transporter');
      if(window.transported || inTransporterMotion) {
        return;
      }
      $(window).on('scroll.transporter', function() {
        if(inTransporterMotion) {
          return;
        }
        checkWindowPosition();
      });
    }

    function checkWindowPosition() {
      if($('body').hasClass('pinned')) {
        return false;
      }
      calculateOffsets();
      var windowPosition = $(window).scrollTop();
      if(windowPosition < transporterTriggerOffset) {
        return;
      }
      if(!window.transporterActivated) {
        transportLoad();
      } else if(windowPosition >= transportCompleteOffset) {
        completeTransport();
      }
    }

    function revealTransporter() {
      if(inTransporterMotion || window.transporterActivated) {
        return;
      }
      $(window).disablescroll();
      window.transporterActivated = true;
      inTransporterMotion = true;
      $transporter.show();
      $("html, body").animate({ scrollTop: $('body').height() - $(window).height() }, "slow").promise().done(function() {
        inTransporterMotion = false;
        if(!$transporterContent.hasClass('theme--inverted')) {
          $transporterContent.fadeTo(300, 0.3);
        }
        $transporter.fadeTo(200, 1, function() {
          $transporter.css({'margin-bottom': ($(window).height()*2)});
        });
        $(window).disablescroll('undo');
      });
    }

    function completeTransport() {
      if(inTransporterMotion) {
        return;
      }
      swapBodyWithTransport();
    }

    function transportLoad() {
      if(loadedHTML) {
        return;
      }
      loadedHTML = true;
      $transporterContent.load(transportURL /* + ' .site-content,.site-header,.site-footer,.button--to-top, .transporter',*/, function(response) {
        responseCache = response;

        /*
          Find the body tag and replace it with <div>, so that we can retrieve its class attribute.
          jQuery removes the <body> and <head> so we can't access it.

          http://stackoverflow.com/questions/7001926/cannot-get-body-element-from-ajax-response
        */
        var dataBody = response.match(/<\s*body.*>[\s\S]*<\s*\/body\s*>/ig).join("");
        dataBody  = dataBody.replace(/<\s*body/gi,"<div");
        dataBody  = dataBody.replace(/<\s*\/body/gi,"</div");
        var bodyClasses = $(dataBody).attr('class');
        var bodyStyles = $(dataBody).attr('style');
        $transporterContent.attr('style', bodyStyles).attr('class', bodyClasses);
        var newTransportURL = $(dataBody).data('url');
        if(typeof newTransportURL !== "undefined") {
          $('body', context).attr('data-url', newTransportURL);
          transportURL = newTransportURL;
        }
      });
      revealTransporter();
    }

    function swapBodyWithTransport() {
      if(window.transported === true) {
        return;
      }
      window.transported = true;
      $(window).off('scroll.singleImageModules');
      $transporterContent.fadeTo(300, 1, function() {
        $transporterWrapper.hide().remove();
        $('body').attr('class', $transporterContent.attr('class'));
        $('body').attr('style', $transporterContent.attr('style')).css({'opacity': 1});
        $(window).off('scroll.transporter');
        $transporterContent.attr('id', '').attr('style', '').attr('class', '');

        var History = window.History;
        var newPageTitle = responseCache.match("<title>(.*?)</title>")[1];
        History.replaceState(null, newPageTitle, $bodyObject.data('url'));

        $(responseCache).filter('script').each(function(i){
          if(typeof $(this).attr('src') !== "undefined") {
            scripts[scriptIndex] = $(this).attr('src');
            scripts[scriptIndex] = scripts[scriptIndex].substr(0, scripts[scriptIndex].length - 3);
            scriptIndex++;
          }
        });
        scriptIndex = 0;
        load_scripts();
      });
    }

    //setup a function that loads scripts
    function load_scripts() {

        //make sure the current index is still a part of the array
        while (scriptIndex < scripts.length) {
          var script = scripts[scriptIndex];

          //get the script at the current index
          Behaviors.loadJS(scripts[scriptIndex], true);

          if(scriptIndex == scripts.length - 1) {
            $('html,body').css({'position': 'relative', 'height': 'auto', 'width': 'auto'});
          }
          scriptIndex++;
        }
        /*
          Done
        */
        $('html, body').scrollTop(0);
    }
};

Behaviors.transporter(document);
