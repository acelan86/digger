window.Digger = window.Digger || (function (win, doc, def_opts) {
    //保存所有监控配置
    // {name : options}
    // digger为script中配置的name值，没有配置的话，全局使用name=default的配置
    var E = encodeURIComponent,
        ref = doc.referrer,
        loc = win.location,
        top = win.top.location.href;

    //配置的事件类型对应的绑定事件类型
    var BIND_MAP = {
        'click' : 'click',
        'move'  : 'mousemove',
        'enter' : 'mouseover',
        'leave' : 'mouseout'
    };

    //获取全局传递参数，通过url传入
    var gloPar = (function () {
        var s = loc.search,
            i = 0,
            kv,
            r = [];
        if (s) {
            s = s.substring(1).split('&');
            while (kv = s[i++]) {
                if (kv.indexOf('_dg_') === 0) {
                    r.push(kv.replace('_dg_', ''));
                }
            }
        }
        return r.join('&');
    })();

    var util = {
        /**
         * 判断是否是ie浏览器，返回版本号
         */
        ie : /msie (\d+\.\d)/i.test(navigator.userAgent),

        /**
         * 随机数生成，生成一个随机数的36进制表示方法
         */
        rnd : function () {
            return Math.floor(Math.random() * 2147483648).toString(36);
        },
        /**
         * 生成min-max的随机整数,包括min和max
         */
        rand: function (min, max) {
            return Math.floor(min + Math.random() * (max - min + 1));
        },
        /**
         * 根据页面window.location.href生成唯一值
         */
        uid: function () {
            var hash = 0,
                i = 0,
                w,
                s = loc.href;

            for(; !isNaN(w = s.charCodeAt(i++));) {
                hash = ((hash << 5) - hash) + w;
                hash = hash & hash;
            }

            return Math.abs(hash).toString(36);
        },

        forEach: Array.prototype.forEach ? function (src, fn) {
            src.forEach(fn);
        } : function (src, fn) {
            var i = 0,
                item;
            while (item = src[i++]) {
                fn(item, i);
            }
        },

        findDom: function (tn, an, av) {
            var doms = Array.prototype.slice.call(document.getElementsByTagName(tn), 0),
                r = [];
            util.forEach(doms, function (dom, i) {
                if (dom.getAttrubite && dom.hasAttribute && av ? dom.getAttribute(an) === av : dom.hasAttribute(an)) {
                    r.push(dom);
                }
            });
            return r.length > 0 ? r : null;
        },

        findParent: function (dom, an) {
            while(dom.parentNode && dom !== doc.body && dom.hasAttribute && !dom.hasAttribute(an)) {
                dom = dom.parentNode;
            }
            return dom;
        },
        /**
         * 事件代理
         * 判断当前事件触发元素是否有data-tag声明的属性，如果有，触发type指定类型事件的回调方法
         * @param  {DOM}        dom      全局代理元素节点
         * @param  {String}     type     事件类型
         * @param  {Function}   callback 回调方法
         *                               @param {Event} 事件对象
         * @param  {String}     tag      代理的节点标识
         */
        delegate : function (dom, type, callback, tag) {
            util.on(dom, type, function (e) {
                var target = e.target;
                if (tag) {
                    while (target !== this.parentNode && target !== doc.body) {
                        if (target.hasAttribute(tag)) {
                            e.delegateTarget = target;
                            callback.call(this, e);
                        }
                        target = target.parentNode;
                    }
                } else {
                    callback.call(this, e);
                }
            });
        },
        /**
         * 冒泡方式为某个dom节点添加事件
         * @param  {DOM}        dom      事件绑定元素
         * @param  {String}     type     事件类型
         * @param  {Function}   callback 回调方法
         */
        on : function (dom, type, callback) {
            var handler = function (e) {
               e = e || window.event;
               e.delegateTarget = e.srcElement || e.target;
               e.relTarget = e.relatedTarget || e.toElement || e.fromElement || null;
               callback.call(dom, e);
            }
            //@todo 为ie添加兼容
            if (dom.addEventListener) {
                dom.addEventListener(type, handler, false);
            } else if (dom.attachEvent) {
                dom.attachEvent('on' + type, handler);
            }
        },
        /**
         * dom ready方法
         * @param  {[type]} doc [description]
         * @param  {[type]} win [description]
         * @return {[type]}     [description]
         */
        ready : (function (doc, win) {
            var isReady = 0,
                isBind = 0,
                fns = [],
                testEl = doc.createElement('p');

            function bindReady() {
                if (isBind) return;
                isBind = 1;

                // Catch cases where domReady is called after the browser event has already occurred.
                // readyState: "uninitalized"、"loading"、"interactive"、"complete" 、"loaded"
                if (doc.readyState === "complete") {
                    init();
                } else if (doc.addEventListener) {
                    doc.addEventListener("DOMContentLoaded", function () {
                        doc.removeEventListener("DOMContentLoaded", arguments.callee, false);
                        init();
                    }, false);
                    win.addEventListener("onload", init, false);
                } else if(doc.attachEvent) {
                    // In IE, ensure firing before onload, maybe late but safe also for iframes.
                    doc.attachEvent("onreadystatechange", function() {
                        if (doc.readyState === "complete") {
                            doc.detachEvent("onreadystatechange", arguments.callee);
                            init();
                        }
                    });
                    win.attachEvent("onload", init);

                    // If IE and not a frame, continually check to see if the document is ready.
                    if(testEl.doScroll && win == win.top){
                        doScrollCheck();
                    }
                }
            };

            // Process items when the DOM is ready.
            function init() {
                isReady = 1;

                // Make sure body exists, at least, in case IE gets a little overzealous.
                // This is taked directly from jQuery's implementation.
                if (!doc.body) {
                    setTimeout(init, 10);
                    return;
                }

                for (var i = 0, l = fns.length; i < l; i++) {
                    fns[i]();
                }
                fns = [];
            };

            function doScrollCheck() {
                if(isReady) return;

                try {
                    // If IE is used, use the trick by Diego Perini
                    // http://javascript.nwbox.com/IEContentLoaded/
                    testEl.doScroll('left');
                } catch (e) {
                    setTimeout(doScrollCheck, 10);
                    return;
                }

                init();
            }

            return function(fn){
                bindReady(fn);

                if (isReady) {
                    fn();
                } else {
                    fns.push(fn);
                }
            };

        })(doc, win),
        /**
         * 获取dom中data-name 标识的属性值
         * @param  {DOM}    dom  要获取属性的节点 
         * @param  {String} name 要获取的属性名中data-后面的部分
         * @return {String}      属性值
         */
        getAttr : function (dom, name) {
            return dom.getAttribute(name) || '';
        },
        hasAttr : function (dom, name) {
            return dom.hasAttribute(name);
        },        

        /**
         * 序列化json对象的方法
         * @param  {JSON}   json 要序列化的json对象
         * @return {String}      序列化后的字符串，以&连接
         */
        serialize : function (json) {
            var str = [];
            for (var key in json) {
                str.push(key + '=' + json[key]);
            }
            return str.join('&');
        },
        /**
         * 获取鼠标位置
         * @param   {Event}     e   事件对象
         * @return  {Object}        {x: xxx, y: xxx}
         */
        getPos : function (e) {
            var e = e || win.event;
            var targetX, targetY, offsetX, offsetY, scrollTop, scrollLeft;
            scrollTop = Math.max(doc.documentElement.scrollTop, doc.body.scrollTop);
            scrollLeft = Math.max(doc.documentElement.scrollLeft, doc.body.scrollLeft);
            if (util.ie) {
                targetX = e.clientX + scrollLeft;
                targetY = e.clientY + scrollTop;
            } else {
                targetX = e.pageX;
                targetY = e.pageY;
            }
            if (this.documentWidth) {
                var clientWidth = Math.max(doc.documentElement.clientWidth, doc.body.clientWidth);
                offsetX = (clientWidth - this.documentWidth) / 2;
                offsetY = 0;
            } else {
                offsetX = 0;
                offsetY = 0;
            }

            function getRelativePos(targetX, targetY) {
                return {
                    x : targetX - offsetX,
                    y : targetY - offsetY
                };
            }
            var pos = getRelativePos(targetX, targetY);
            targetX = Math.round(pos.x / 10) * 10;
            targetY = Math.round(pos.y / 10) * 10;
            return {
                x : targetX,
                y : targetY
            };
        }
    };


    function Digger(options) {
        this._tracks = {};

        this._inited = {};

        this.uid = util.uid();

        this.url = options.url;
        this.max = options.max;
        this.type = options.type;

        this.init();
    }

    Digger.prototype = {
        init : function () {
            var thiz = this,
                start = +new Date(),
                types = this.type,
                max = this.max,
                tag = this.tag;

            for (var key in types) {
                type = types[key] || {};

                //初始化该事件类型的缓冲区
                this._tracks[key] = this._tracks[key] || [];

                //绑定,这里会排除onload跟unload两个事件类型，后面特殊处理
                //且如果全局未绑定tag + event_type
                //这里如果绑定过max重新指定不起作用
                if (BIND_MAP[key]) {
                    //设置每个事件类型的监控标识符tag和最大缓冲数量
                    //如果类型中没有配置，则使用全局配置
                    //全局配置默认使用DEFAULT_CONFIG的值
                    type.tag = type.tag || tag;
                    type.max = type.max || max;
                    type.type = type.type || key;

                    util.delegate(doc.body, BIND_MAP[key], this._getCallbackHandler(type), type.tag);
                }
            }

            //在页面卸载前把没有发出的数据发出
            util.on(win, 'beforeunload', function () {
                for (var key in thiz._tracks) {
                    thiz.send(key, 0);
                }

                if (types.unload) {
                    for (var id in thiz._inited) {
                        var end = +new Date();
                        thiz.log(thiz.format({
                            _dur    : end - start,
                            _ev     : 'unload',
                            _t      : end,
                            _bid    : id
                        }));
                    }
                }
            });
        },
        register : function (id) {
            var thiz = this,
                types = this.type,
                id = id || this.uid;

            if (types.load) {
                if (!this._inited[id]) {
                    this.log(this.format({
                        _et : 'load',
                        _t : +new Date(),
                        _bid : id
                    }));
                }
            }

            this._inited[id] = 1;
        },
        /**
         * 将obj转成string的方法, 可被重载，用于生成满足需求格式的数据内容
         * @params  {Object}    data    json形式的数据对象
         */
        format : util.serialize,
        /**
         * 获取发送日志的url, 如果时数组的话，选取随机的某个url进行发送
         * 防止对某一个url的请求过大
         *
         */
        getUrl: function () {
            var len;
            if ((this.url instanceof Array) && (len = this.url.length)) {
                return this.url[util.rand(0, len - 1)];
            } else if ('string' === typeof this.url) {
                return this.url;
            } else {
                throw new Error("url must string or array, and array must not empty.");
            }
        },

        getMsg : function (type, target, pos, tag, uid) {
            var i = 0,
                k,
                v,
                thiz = this,
                msg = {
                    '_id' : target.id || 'noid' + (+new Date()),
                    '_tagn' : target.tagName || 'notagname',
                    '_x' : pos.x,
                    '_y' : pos.y,
                    '_t' : +new Date(),
                    '_ev' : type,
                    '_bid' : uid || this.uid
                };
            //获取mo-tag上的携带数据，如果与默认提交数据重名, 则覆盖
            (function (msg, target, tag) {
                var exmsg = Digger.strProp2jsonProp(util.getAttr(target, tag));
                for (var k in exmsg) {
                    msg[k] = E(exmsg[k]);
                }
            })(msg, target, tag);

            //获取额外数据, 如果存在，覆盖
            (function (exdata, msg, target) {
                var i = 0,
                    list = exdata.glo || [],
                    tn = exdata.tagname || {},
                    k,
                    v;

                if (tn[target.tagName.toUpperCase()]) {
                    list = list.concat(tn[target.tagName.toUpperCase()]);
                }
                while (k = list[i++]) {
                    (v = util.getAttr(target, k)) && (msg[k] = E(v));
                }
            })(this.exdata || {}, msg, target);

            return msg;
        },

        /**
         * 使用img发送msg内容
         * @param {String} msg 需要发送的字符串形式的信息
         */
        log : function (msg) {
            var img = new Image(1, 1),
                key = this.uid + '_' + util.rnd(),
                info,
                url = this.getUrl();

            window[key] = img;
            img.onload = img.onerror = img.onabort = function () {
                img.onload = img.onerror = img.onabort = null;
                window[key] = null;
                img = null;
            };

            img.src = url + '?log=' + this.uid + (info ? '&' + info : '') + '&ref=' + E(ref) + '&top=' + E(top) + (gloPar ? '&' + gloPar : '') + '&t=' + (+new Date()) + '&msg=' + E(msg);
        },

        /**
         * 判断是否达到最大缓冲数量，并发送，传入类型与最大数
         * @param {String} type 从this._tracks中挑出type类型的数据
         * @param {Number} max  缓冲区最大数量，max为0表示立刻发送所有数据
         */
        send : function (type, max) {
            var msgs = [],
                msg = '',
                tracks = this._tracks[type];

            if (!max) {
                while (msg = tracks.shift()) {
                    msgs.push(msg);
                }
                msgs.length > 0 && this.log(msgs.join('|'));
            } else if (tracks.length >= max) {
                while (((max--) > 0) && (msg = tracks.shift())) {
                    msgs.push(msg);
                }
                msgs.length > 0 && this.log(msgs.join('|'));
            }
        },
        _getCallbackHandler : function (obj) {
            var thiz = this,
                type = obj.type,
                max = obj.max,
                tag = obj.tag;
            return function (e) {
                var area = util.findParent(e.delegateTarget, 'digger');
                area = util.getAttr(area, 'digger');
                var pos = util.getPos(e);
                thiz._tracks[type].push(thiz.format(thiz.getMsg(type, e.delegateTarget, pos, tag, area)));
                thiz.send(type, max)
            };
        }
    };

    /**
     * 将a:b;c:d格式的数据转成对象
     * @param  {[type]} str [description]
     * @return {[type]}     [description]
     */
    Digger.strProp2jsonProp = function (str) {
        var i = 0,
            result = {},
            prop;

        if (!str) return null;

        str = str.split(';');

        while (prop = str[i++]) {
            if (prop) {
                prop = prop.split(':');
                result[prop[0]] = prop[1];
            }
        }
        return result;
    };

    var digger;

    Digger.register = function () {
        util.ready(function () {
            var scripts = util.findDom('script', 'digger');

            util.forEach(scripts, function (script, i) {
                !digger && (digger = new Digger(def_opts));
                digger.register(util.getAttr(script, 'digger'));
            });
        });
    };

    return Digger;
})(window, document, {
    //点击日志接受地址
    url     : 'http://localhost/github/digger/log.data',
    //缓冲区大小，可以被事件类型中的配置覆盖
    max     : 1,
    //全局监控标签，可以被事件类型中配置覆盖
    tag     : 'mo',
    //全局静态数据
    info    : '',
    //监控事件类型
    type    : {
        'click': {},
        'enter' : {
            'max' : 10
        },
        'leave' : {
            'max' : 30
        },
        'load' : {},
        'unload' : {}
    },
    //附加数据配置
    exdata : {
        glo : ['remarks'],
        tagname : {
            'A' : ['href']
        }
    }
});
window.Digger.register();