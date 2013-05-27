var Tracker = (function (win, doc, conf) {
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
        extend : function (des, ext) {
            for (var key in ext) {
                des[key] = ext[key];
            }
        },
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
        }
    };






    
    function Tracker(options) {
        //监控标记的名称，用来配置一块监控区域
        this.tag = options.tag || 'sadt';

        //监控事件类型
        this.types = options.types || ['click', 'enter', 'leave', 'load', 'unload'];

        this.url = options.url;

        this.exdata = options.exdata;

        this._initData(options);

        //挂接页面卸载前的处理事件
        util.on(win, 'beforeunload', this._getUnloadHandle());

    };

    Tracker.EVENT_MAP = {
        'click' : {
            bind : 'click',
            max : 1
        },
        'move'  : {
            bind : 'mousemove',
            max : 5
        },
        'enter' : {
            bind : 'mouseover',
            max : 5
        },
        'leave' : {
            bind : 'mouseout',
            max : 5
        }
    };

    //获取全局传递参数，通过url传入以_dg_开头
    Tracker.gloPar = (function () {
        var s = util.loc.search,
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

    Tracker._getCookieInfo = function (keys) {
        var r = [];
        util.forEach(keys, function (key, i) {
            var value = util.cookie.get(key);
            if (value) {
                r.push(key + '=' + value);
            }
        });
        return r.join(';');
    };

    Tracker.uid = util.uid();

    Tracker.prototype = {
        _initData : function (options) {
            var max, filter;

            //监控位置和相应配置映射表初始化，不应该被从外部改动
            this._list = {};

            this._cache = {};


            for (var type in Tracker.EVENT_MAP) {
                this._cache[type] = [];

                this._list['_default_event_' + type] = {
                    max : options[type] ? (options[type].max || Tracker.EVENT_MAP[type].max) : Tracker.EVENT_MAP[type].max,
                    filter : options[type] ? (options[type].filter || Tracker.EVENT_MAP[type].filter) : Tracker.EVENT_MAP[type].filter
                };
            }

            //初始化cookie
            this._ck = Tracker._getCookieInfo(options.cookie || []);
        },
        _getUnloadHandle : function () {
            var thiz = this;
            return function () {
                var now = +new Date();

                //页面卸载时立刻发送缓冲区所有数据
                for (var type in thiz._cache) {
                    thiz.send(type, 0);
                }
            }
        },

        monitor : function (name, types, options) {
            var thiz = this,
                types = types || this.types,
                options = options || {},
                now = +new Date();

            //注册每个监控区域的事件代理
            util.forEach(types, function (type, i) {

                if (type === 'load') {
                    thiz._list[name + 'load'] = now;
                    thiz.log(thiz.format({
                        _ev : 'load',
                        _t : now,
                        _bid : name
                    }));
                }

                if (type === 'unload') {
                    util.on(win, 'beforeunload', function () {
                        //发送卸载日志，停留时间
                        thiz.log(thiz.format({
                            _dur    : now - thiz._list[name + 'load'],
                            _ev     : 'unload',
                            _t      : now,
                            _bid    : name
                        }));
                    });
                }

                if (Tracker.EVENT_MAP[type]) {
                    thiz._list[name + type] = {
                        max : options[type] ? (options[type].max || thiz._list['_default_event_' + type].max) : thiz._list['_default_event_' + type].max,
                        filter : options[type] ? (options[type].filter || thiz._list['_default_event_' + type].filter) : thiz._list['_default_event_' + type].filter
                    };
                    //注册name区域的type监控事件
                    thiz._monitor(name, type);
                }
            });
        },


        /**
         * 注册监控区域交互事件
         * @param  {[type]} type [description]
         * @return {[type]}      [description]
         */
        _monitor : function (name, type) {
            var thiz = this,
                tag = this.tag;

            util.delegate(
                doc,
                Tracker.EVENT_MAP[type].bind,
                thiz._getMonitorHandler(name, type),
                function (dom) {
                    return util.attr(dom, tag) === name;
                }
            );
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
        },
        _getMonitorHandler : function (name, type) {
            var thiz = this,
                conf = this._list[name + type];
            return function (e) {
                //如果没有filter, 则取当前触发的元素位监控元素
                var monitorTarget = conf.filter ? 
                        thiz.findTarget(e.realTarget, e.delegateTarget, conf.filter) :
                        e.realTarget;

                if (monitorTarget) {
                    var pos = util.getPos(e);
                    thiz._cache[type].push(thiz.format(thiz.getMsg(type, monitorTarget, pos, name)));
                    thiz.send(type, conf.max)
                }
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

        getMsg : function (type, target, pos, uid) {
            var i = 0,
                k,
                v,
                thiz = this,
                msg = {
                    '_id' : target.id || 'noid' + util.rnd(), //触发目标id
                    '_tagn' : target.tagName || 'notagname',   //触发目标的tagName
                    '_x' : pos.x,                              //触发x坐标
                    '_y' : pos.y,                              //触发y坐标
                    '_t' : +new Date(),                        //触发时间
                    '_ev' : type,                              //事件类型
                    '_bid' : uid || Tracker.uid                   //触发的块区域id,如果没有即body区域，本面的uid
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
                key = Tracker.uid + '_' + util.rnd(),
                info,
                url = this.getUrl();

            window[key] = img;
            img.onload = img.onerror = img.onabort = function () {
                img.onload = img.onerror = img.onabort = null;
                window[key] = null;
                img = null;
            };
            img.src = url
                + '?log=' + Tracker.uid
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

    return new Tracker(conf);

})(window, document, {
    //点击日志接受地址
    url: [
        'http://localhost./github/digger/log1.data',
        'http://localhost./github/digger/log2.data',
        'http://localhost./github/digger/log3.data'
    ],
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
        max : 5,
        filter : function (dom) {
            return dom.getAttribute('enter') !== null;
        }
    },
    leave : {
        max : 5,
        filter : function (dom) {
            return dom.getAttribute('leave') !== null;
        }
    }
});