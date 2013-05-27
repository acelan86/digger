var Tracker = (function (win, doc, DEFAULT_CONFIG) {
    var util = {
        E : win.encodeURIComponent,
        ref : doc.referrer,
        loc : win.location,
        ifr : win.self != win.top ? 1 : 0,
        top : (function () {
            var top;
            try {
                top = win.top.location.href;
            } catch (e) {
                top = util.ref;
            }
            return top;
        })(),
        cookie : {
            getRaw : function (key) {
                var reg = new RegExp("(^| )" + key + "=([^;]*)(;|\x24)"),
                    result = reg.exec(document.cookie);
                     
                if (result) {
                    return result[2] || null;
                }
            },
            get : function (key) {
                var value = util.cookie.getRaw(key);
                if ('string' == typeof value) {
                    value = decodeURIComponent(value);
                    return value;
                }
                return null;
            }
        },
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
        rand : function (min, max) {
            return Math.floor(min + Math.random() * (max - min + 1));
        },
        /**
         * 根据页面window.location.href生成唯一值
         */
        uid : function () {
            var hash = 0,
                i = 0,
                w,
                s = util.loc.href;

            for(; !isNaN(w = s.charCodeAt(i++));) {
                hash = ((hash << 5) - hash) + w;
                hash = hash & hash;
            }

            return Math.abs(hash).toString(36);
        },
        //获取属性，没有属性或者不支持则返回null, 返回null表示!hasAttr()
        attr : function (dom, attrName) {
            return dom.getAttribute ? dom.getAttribute(attrName) : null;
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
         * 将a:b;c:d格式的数据转成对象
         * @param  {[type]} str [description]
         * @return {[type]}     [description]
         */
        strProp2jsonProp : function (str) {
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
        },
        forEach : function (arr, iterator) {
            var i = 0, 
                item;
            if (arr) {
                while (item = arr[i++]) {
                    iterator && iterator(item, i);
                }
            }
        },
        inArray : function (arr, item) {
            var r = false;
            for (var len = arr.length - 1; len >=0; len--) {
                if (arr[len] === item) {
                    r = true;
                }
            }
            return r;
        },
        delegate : function (dom, type, callback, filter) {
            util.on(dom, type, function (e) {
                var target = e.realTarget;
                if ('function' === typeof filter) {
                    while (target && target !== dom) {
                        if (filter(target)) {
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
               e.realTarget = e.srcElement || e.target;
               e.relTarget = e.relatedTarget || e.toElement || e.fromElement || null;
               callback.call(dom, e);
            };

            //@todo 为ie添加兼容
            if (dom.addEventListener) {
                dom.addEventListener(type, handler, false);
            } else if (dom.attachEvent) {
                dom.attachEvent('on' + type, handler);
            }
        },
        findTarget : function (from, to, filter) {
            //从from节点往外面找知道to节点，找到符合filter的节点返回，如果没有，返回空
            while (from && from !== to) {
                if (filter(from)) {
                    return from;
                }
                from = from.parentNode;
            }
            if (filter(from)) {
                return from;
            }
            return null;
        }
    };


    function Tracker(bid, types, opt_conf) {
        var config = opt_conf || {},
            THIS = this,
            _obj;

        //监控区域id
        this.bid = bid;
        //监控区域标识
        this.tag = config.tag || Tracker.DEFAULT_CONFIG.tag || 'sadt';
        //数据发送地址
        this.url = config.url || Tracker.DEFAULT_CONFIG.url;
        //额外发送数据配置
        this.exdata = config.exdata || Tracker.DEFAULT_CONFIG.exdata;

        /*
         * 初始化监控位
         */
        //缓存数据
        this._cache = [];
        //事件类型配置
        this._events = {};
        //监控初始化时间
        this._loadtime = +new Date();
        //cookie获取
        this._cookie = (function (keys) {
            var r = [];
            util.forEach(keys, function (key, i) {
                var value = util.cookie.get(key);
                if (value) {
                    r.push(key + '=' + value);
                }
            });
            return r.join(';');
        })(config.cookie || Tracker.DEFAULT_CONFIG.cookie || []);


        /**
         * 初始化监控事件，并发送初始化加载记录
         */
        util.forEach(types, function (type, i) {
            //发送加载记录
            if (type === 'load') {
                THIS.log(THIS.format({
                    _ev : 'load',
                    _t : THIS._loadtime,
                    _bid : THIS.bid
                }));
            }
            //绑定卸载时记录
            if (type === 'unload') {
                util.on(win, 'beforeunload', function () {
                    var now = +new Date();
                    //发送卸载日志，停留时间
                    THIS.log(THIS.format({
                        _dur    : now - THIS._loadtime,
                        _ev     : 'unload',
                        _t      : now,
                        _bid    : THIS.bid
                    }));
                });
            }

            //绑定页面交互记录
            if (Tracker.BIND_MAP[type]) {
                _obj = opt_conf[type] || Tracker.DEFAULT_CONFIG[type] || {};

                THIS._cache[type] = [];
                THIS._events[type] = {
                    max : _obj.max || 1,
                    filter : _obj.filter
                };

                util.delegate(
                    doc,
                    Tracker.BIND_MAP[type], 
                    THIS._getMonitorHandle(type),
                    THIS._getFilter(bid)
                );
            }
        });

        /**
         * 页面卸载前发送所有剩余数据
         */
        util.on(win, 'beforeunload', function () {
            //页面卸载时立刻发送缓冲区所有数据
            for (var type in THIS._cache) {
                THIS.send(type, 0);
            }
        });

    }

    Tracker.prototype = {
        //交互事件句柄
        _getMonitorHandle : function (type) {
            var THIS = this;
            return function (e) {
                var msg,
                    pos,
                    conf = THIS._events[type];
                    monitorTarget = conf.filter ? util.findTarget(e.realTarget, e.delegateTarget, conf.filter) : e.realTarget;

                if (monitorTarget) {
                    pos = util.getPos(e);
                    msg = THIS.getMessage(type, monitorTarget, pos);
                    THIS._cache[type].push(THIS.format(msg));
                    THIS.send(type, conf.max)
                }
            };
        },
        //获取代理判断条件
        _getFilter : function (name) {
            var THIS = this;
            return function (dom) {
                return util.attr(dom, THIS.tag) === name;
            };
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
            var len,
                url = this.url;
            if ((url instanceof Array) && (len = url.length)) {
                return url[util.rand(0, len - 1)];
            } else if ('string' === typeof url) {
                return url;
            } else {
                throw new Error("url must string or array, and array must not empty.");
            }
        },

        getMessage : function (type, target, pos) {
            var i = 0,
                k,
                v,
                msg = {
                    '_id' : target.id || 'noid' + util.rnd(), //触发目标id
                    '_tagn' : target.tagName || 'notagname',   //触发目标的tagName
                    '_x' : pos.x,                              //触发x坐标
                    '_y' : pos.y,                              //触发y坐标
                    '_t' : +new Date(),                        //触发时间
                    '_ev' : type,                              //事件类型
                    '_bid' : this.bid                   //触发的块区域id,如果没有即body区域，本面的uid
                };

            //获取额外数据, 如果存在，覆盖
            //即glo中指出的标签，例如remarks,
            //<div mo remarks="xxx"></div>
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
                    (v = util.attr(target, k)) && (msg[k] = util.E(v));
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
                key = Tracker.UID + '_' + util.rnd(),
                info,
                url = this.getUrl();

            window[key] = img;
            img.onload = img.onerror = img.onabort = function () {
                img.onload = img.onerror = img.onabort = null;
                window[key] = null;
                img = null;
            };
            img.src = url
                + '?log=' + Tracker.UID
                + '&ifr=' + util.ifr
                + '&ref=' + util.E(util.ref)
                + '&top=' + util.E(util.top)
                + (Tracker.gloPar ? '&' + Tracker.gloPar : '')
                + '&t=' + (+new Date())
                + (this._ck ? '&ck=' + util.E(this._ck) : '')
                + '&msg=' + util.E(msg);

        },

        /**
         * 判断是否达到最大缓冲数量，并发送，传入类型与最大数
         * @param {String} type 从this._cache中挑出type类型的数据
         * @param {Number} max  缓冲区最大数量，max为0表示立刻发送所有数据
         */
        send : function (type, max) {
            var msgs = [],
                msg = '',
                tracks = this._cache[type];
            if (!max) {
                while (msg = tracks.shift()) {
                    msgs.push(msg);
                }
                msgs.length > 0 && this.log(msgs.join('|'));
            } else if (tracks.length >= max) {
                while (max-- > 0 && (msg = tracks.shift())) {
                    msgs.push(msg);
                }
                msgs.length > 0 && this.log(msgs.join('|'));
            }
        }
    };

    Tracker.manager = {};

    Tracker.UID = util.uid();

    Tracker.BIND_MAP = {
        "click" : "click",
        "move" : "mousemove",
        "enter" : "mouseover",
        "leave" : "mouseout"
    };

    Tracker.DEFAULT_CONFIG = DEFAULT_CONFIG;



    return function (bid, types, opt_conf) {
        new Tracker(bid, types || Tracker.DEFAULT_CONFIG.types, opt_conf || {});
    };
})(window, document, {
    //点击日志接受地址
    url: [
        'http://localhost./github/digger/log1.data',
        'http://localhost./github/digger/log2.data',
        'http://localhost./github/digger/log3.data'
    ],
    types: ["click", "enter", "leave", "load", "unload"],
    exdata : {
        glo : ["remarks"],
        tagname : {
            "A" : ["href"]
        }
    },
    cookie: ["SINAGLOBAL"],
    click : {
        max : 1,
        filter : function (dom) {
            return dom.getAttribute('clk') !== null;
        }
    },
    enter : {
        max : 100,
        filter : function (dom) {
            return dom.getAttribute('enter') !== null;
        }
    },
    leave : {
        max : 100,
        filter : function (dom) {
            return dom.getAttribute('leave') !== null;
        }
    }
});
