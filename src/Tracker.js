(function (win, doc, conf) {
    var conf = conf || {};
    var util = {

    };

    function Tracker() {

    };

    Tracker.prototype = {

    };

    new Tracker(conf);

    return Tracker;
})(window, document, {

});

if (!window.Digger) {
    var script = document.createElement('script');
    script.onload = function () {
        window.Tracker.use();
    };
    document.body.insertBefore(script, document.body.lastChild);
    script.src = './Tracker.js';
} else {
    window.Tracker.use();
}