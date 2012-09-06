// version: 1.0.120814

window['WebApp'] || (window['WebApp'] = {});
window['WebApp']['Loader'] = (function(__global) {
	return function(namespace, options, hasConfig) {
		// Объявляем переменные с значениями по умолчанию
		this.app = null;
		this.loader = null;
		this.iframe = null;
		this.rootHost = null;
		this.global = __global;
		this.sandboxWindow = null;
		this.options = options || {};

		// Проверяем существует ли неймспейс который мы хотим инициализировать
		if (!this.global[namespace]) {
			// Если указано что есть дополнительный подгружаемый конфиг то соединяем его с текущим
			if (hasConfig) {
				var config = window[namespace];

				if (typeof(config) === 'object') {
					options.loadOptions || (options.loadOptions = {});
					for(var key in config) {
						if (config.hasOwnProperty(key)) {
							options.loadOptions[key] = config[key];
						}
					}
				}
			}

			// Создаем глобальный объект веб-приложения
			this.global[namespace] = {
				namespace: namespace,
				jsFile: /\.js(?:\|nocache)?$/,
				noCache: '?no_cache=' + (+new Date()),
				loadOptions: this.options.loadOptions,
				cssFile: /\.css(?:\|deployment_prefix)?$/
			};

			if (this.options.loadOptions.locations.app) {
				this.rootHost = this.options.loadOptions.locations.app;
			} else {
				this.rootHost = location.protocol + '//';
				this.rootHost += location.hostname;
				this.rootHost += location.port == '' ? '' : (':' + location.port);
				this.rootHost += '/';
			}
			this.app = this.global[namespace];
		}
		this.appName = this.app.namespace;
		this.appPath = ['apps', this.appName.toLowerCase()].join('/');

		// Инициализируем рантайм загрузки и запуска веб-приложения
		this.init();
	};
})(window['WebApp']);

window['WebApp']['Loader'].prototype = {
	init: function() {
		this.createDefaults();
		this.createSandbox(function(sandboxWindow) {
			this.createLoader(sandboxWindow || window);
			this.loadDependencies(this.bind(this.loadAppCore, this));
		});
	},

	createSandbox: function(callback) {
		this.iframe = document.createElement('iframe');
		this.iframe.style.display = 'none';
		this.iframe.src = 'javascript:0';
		this.iframe.tabIndex = -1;

		// Навешиваем обработчик на событие полной отрисовки iframe и всего его содержимого
		this.iframe.onload = this.bind(function(event) {
			// Получаем и сохраняем ссылку на объект window в созданом sandbox
			this.sandboxWindow = this.iframe.contentWindow;

			// Добавляем пустой элемент script в body iframe для правильной работы yepnope
			this.sandboxWindow.document.body.appendChild(document.createElement('script'));

			if (typeof(callback) === 'function') {
				callback.call(this, this.sandboxWindow);
			}
		}, this);

		// Если не создана оснастка для обределения DomReady, то создаем ее
		if (!window.DomReady) {
			this.setDomReady();
		}

		// Навешиваем обработчик на событие DomReady
		DomReady.ready(this.bind(function() {
			// Вставляем созданный iframe в body
			document.body.appendChild(this.iframe);
		}, this));
	},

	loadDependencies: function(callback) {
		this.loader([
			{
				test: window.JSON,
				nope: 'libs/json2.js'
			},
			{
				test: Object.keys,
				nope: 'libs/es5-shim.min.js'
			},
			{
				test: window.Modernizr,
				nope: 'libs/modernizr.min.js'
			},
			{
				test: !window.$,
				yep: 'libs/jquery/jquery.min.js',
				load: 'libs/jquery/jquery.transit.min.js'
			},
			{
				load: [
					'libs/lodash.min.js',
					'libs/backbone.js',
					'libs/backbone.sync.js',
					'libs/handlebars.js'
				],
				complete: callback || function() {}
			}
		]);
	},

	loadAppCore: function() {
		var exports = {
				'$': true,
				'_': true,
				'NO': true,
				'YES': true,
				'jQuery': true,
				'Handlebars': true
			},
			appName = this.appName.toLowerCase(),
			userExports = this.options.loadOptions.exports;

		this.options.loadOptions.resources.common.push({
			load: [
				// Загружаем библиотеки ядра веб-приложения
				'core.js',
				'app.js',
				([this.appPath, appName + '.js'].join('/'))
			],
			complete: this.bind(function() {
				// Делаем экспорт необходимых неймспейсов в песочницу
				if (userExports) {
					for (var key in userExports) {
						if (userExports.hasOwnProperty(key)) {
							exports[key] = userExports[key];
						}
					}
				}

				for (var key in exports) {
					if (exports.hasOwnProperty(key) && !this.sandboxWindow[key]) {
						this.sandboxWindow[key] = window[key];
					}
				}

				// Прокидываем прототип в основной инстанс так как при инициализации он потеряется
				// [TODO] Подумать как решить эту проблему более хорошим способом... например выстроить 
				//        правильную цепочку прототипов
				for (var key in this.app.prototype) {
					if (this.app.prototype.hasOwnProperty(key) && this.app[key] == null) {
						this.app[key] = this.app.prototype[key];
					}
				}
				delete this.app.prototype;

				// Переходим к инициализации веб-приложения
				this.initApp();
			}, this)
		});
		this.loader(this.options.loadOptions.resources.common);
	},

	createDefaults: function() {
		var resourcesHost = this.options.loadOptions.locations.static || this.rootHost;

		this.app.rootHost = this.rootHost;
		this.app.hosts = {
			services: this.options.loadOptions.locations.services || {}, // Объект с адресами доп сервисов
			request: this.rootHost, // Url на который будет посылаться все запросы
			init: this.options.loadOptions.locations.parent || this.rootHost, // Url на котором будет происходить инициализация калькулятора
			img: resourcesHost + 'static/img/',
			css: resourcesHost + 'static/css/',
			js: resourcesHost + 'static/js/'
		};
		this.app.strictMode = this.options.loadOptions.strictMode;
		this.app.debugMode = this.options.loadOptions.debugMode;
	},

	initApp: function() {
		var app = this.global['App'];

		for (var key in this.app) {
			if (this.app.hasOwnProperty(key)) {
				app.prototype[key] = this.app[key];
			}
		}

		// Создаем инстанс веб-приложения
		this.global[this.appName] = new app;

		// Подготавливаем DOM элемент который будет выступать в качестве контейнера для веб-приложения
		this.global[this.appName].container = $(this.options.loadOptions.containerSelector || '.l-wrapper').empty();
		this.global[this.appName].sandbox = this.sandboxWindow;

		// Расширяем прототип веб-приложения кастомными методами специально для конкретного приложения
		this.sandboxWindow.App = this.global[this.appName];

		// После создания инстанса веб-приложения загружаем оставшиеся ресурсы
		this.options.loadOptions.resources.app.push({
			load: [
				// Загружаем роутинг веб-приложения
				'routes/workspace.js',

				// Загружаем главную вью веб-приложения
				'views/workspace.js'
			],
			complete: this.bind(function() {
				// Инициализируем веб-приложение так же создавая глобальную ссылку на него в объекте window
				window[this.appName] = this.global[this.appName].init(this.options.bootstrapData);
			}, this)
		});
		this.loader(this.options.loadOptions.resources.app, true);
	},

	getFilter: function(resourceObj) {
		resourceObj.attrs = {
				charset: 'utf-8'
			};

			// Допишем адрес хоста
			if (this.app.jsFile.test(resourceObj.url)) {
				resourceObj.url = this.app.hosts.js + resourceObj.url.replace('|nocache', this.app.noCache);
			} else if (this.app.cssFile.test(resourceObj.url)) {
				resourceObj.url = this.app.hosts.css + (/\|deployment_prefix/.test(resourceObj.url) ? (this.options.loadOptions.useDebugCSS ? 'debug_' : 'production_') : '') + resourceObj.url.replace('|deployment_prefix', '');
			}
			return resourceObj;
	},

	createLoader: function(sandbox) {
		var fakeWindow = {
				opera: window.opera,
				document: window.document,
				setTimeout: window.setTimeout
			},
			globalScope = this.createLoaderInstance(fakeWindow),
			sandboxScope = this.createLoaderInstance(sandbox);

		// После инициализации yepnope мы создаем обстрактный объект-загрузчик с которым и будем работать
		this.loader = (function(sandbox, global, self) {
			// Навешиваем фильтры для преобразования относительных ссылок на файлы в абсолютные
			sandbox.yepnope.addFilter(function(resourceObj) {
				resourceObj.url = self.appPath + '/' + resourceObj.url;
				return self.getFilter(resourceObj);
			});
			global.yepnope.addFilter(self.bind(self.getFilter, self));

			// Возвращаем кастомный унифицированный обработчик
			return function(needs, loadToSandbox) {
				if (loadToSandbox) {
					sandbox.yepnope.call(sandbox, needs);
				} else {
					global.yepnope.call(global, needs);
				}
			}
		})(sandboxScope, globalScope, this);

		// Проставляем в инстансе веб-приложения ссылку на личный загрузчик приложения
		this.app._loader = this.loader;
	},

	createLoaderInstance: function(scope) {
		// Инициализируем минифицированную версию yepnope версии 1.5.4 передавая ему вместо в качестве 
		// контекста ссылку на песочницу
		(function(a,b,c){function d(a){return"[object Function]"==o.call(a)}function e(a){return"string"==typeof a}function f(){}function g(a){return!a||"loaded"==a||"complete"==a||"uninitialized"==a}function h(){var a=p.shift();q=1,a?a.t?m(function(){("c"==a.t?B.injectCss:B.injectJs)(a.s,0,a.a,a.x,a.e,1)},0):(a(),h()):q=0}function i(a,c,d,e,f,i,j){function k(b){if(!o&&g(l.readyState)&&(u.r=o=1,!q&&h(),l.onload=l.onreadystatechange=null,b)){"img"!=a&&m(function(){t.removeChild(l)},50);for(var d in y[c])y[c].hasOwnProperty(d)&&y[c][d].onload()}}var j=j||B.errorTimeout,l=b.createElement(a),o=0,r=0,u={t:d,s:c,e:f,a:i,x:j};1===y[c]&&(r=1,y[c]=[]),"object"==a?l.data=c:(l.src=c,l.type=a),l.width=l.height="0",l.onerror=l.onload=l.onreadystatechange=function(){k.call(this,r)},p.splice(e,0,u),"img"!=a&&(r||2===y[c]?(t.insertBefore(l,s?null:n),m(k,j)):y[c].push(l))}function j(a,b,c,d,f){return q=0,b=b||"j",e(a)?i("c"==b?v:u,a,b,this.i++,c,d,f):(p.splice(this.i++,0,a),1==p.length&&h()),this}function k(){var a=B;return a.loader={load:j,i:0},a}var l=b.documentElement,m=a.setTimeout,n=b.getElementsByTagName("script")[0],o={}.toString,p=[],q=0,r="MozAppearance"in l.style,s=r&&!!b.createRange().compareNode,t=s?l:n.parentNode,l=a.opera&&"[object Opera]"==o.call(a.opera),l=!!b.attachEvent&&!l,u=r?"object":l?"script":"img",v=l?"script":u,w=Array.isArray||function(a){return"[object Array]"==o.call(a)},x=[],y={},z={timeout:function(a,b){return b.length&&(a.timeout=b[0]),a}},A,B;B=function(a){function b(a){var a=a.split("!"),b=x.length,c=a.pop(),d=a.length,c={url:c,origUrl:c,prefixes:a},e,f,g;for(f=0;f<d;f++)g=a[f].split("="),(e=z[g.shift()])&&(c=e(c,g));for(f=0;f<b;f++)c=x[f](c);return c}function g(a,e,f,g,h){var i=b(a),j=i.autoCallback;i.url.split(".").pop().split("?").shift(),i.bypass||(e&&(e=d(e)?e:e[a]||e[g]||e[a.split("/").pop().split("?")[0]]),i.instead?i.instead(a,e,f,g,h):(y[i.url]?i.noexec=!0:y[i.url]=1,f.load(i.url,i.forceCSS||!i.forceJS&&"css"==i.url.split(".").pop().split("?").shift()?"c":c,i.noexec,i.attrs,i.timeout),(d(e)||d(j))&&f.load(function(){k(),e&&e(i.origUrl,h,g),j&&j(i.origUrl,h,g),y[i.url]=2})))}function h(a,b){function c(a,c){if(a){if(e(a))c||(j=function(){var a=[].slice.call(arguments);k.apply(this,a),l()}),g(a,j,b,0,h);else if(Object(a)===a)for(n in m=function(){var b=0,c;for(c in a)a.hasOwnProperty(c)&&b++;return b}(),a)a.hasOwnProperty(n)&&(!c&&!--m&&(d(j)?j=function(){var a=[].slice.call(arguments);k.apply(this,a),l()}:j[n]=function(a){return function(){var b=[].slice.call(arguments);a&&a.apply(this,b),l()}}(k[n])),g(a[n],j,b,n,h))}else!c&&l()}var h=!!a.test,i=a.load||a.both,j=a.callback||f,k=j,l=a.complete||f,m,n;c(h?a.yep:a.nope,!!i),i&&c(i)}var i,j,l=this.yepnope.loader;if(e(a))g(a,0,l,0);else if(w(a))for(i=0;i<a.length;i++)j=a[i],e(j)?g(j,0,l,0):w(j)?B(j):Object(j)===j&&h(j,l);else Object(a)===a&&h(a,l)},B.addPrefix=function(a,b){z[a]=b},B.addFilter=function(a){x.push(a)},B.errorTimeout=1e4,null==b.readyState&&b.addEventListener&&(b.readyState="loading",b.addEventListener("DOMContentLoaded",A=function(){b.removeEventListener("DOMContentLoaded",A,0),b.readyState="complete"},0)),a.yepnope=k(),a.yepnope.executeStack=h,a.yepnope.injectJs=function(a,c,d,e,i,j){var k=b.createElement("script"),l,o,e=e||B.errorTimeout;k.src=a;for(o in d)k.setAttribute(o,d[o]);c=j?h:c||f,k.onreadystatechange=k.onload=function(){!l&&g(k.readyState)&&(l=1,c(),k.onload=k.onreadystatechange=null)},m(function(){l||(l=1,c(1))},e),i?k.onload():n.parentNode.insertBefore(k,n)},a.yepnope.injectCss=function(a,c,d,e,g,i){var e=b.createElement("link"),j,c=i?h:c||f;e.href=a,e.rel="stylesheet",e.type="text/css";for(j in d)e.setAttribute(j,d[j]);g||(n.parentNode.insertBefore(e,n),m(c,0))}})(scope,scope.document);

		// Добавляем префиксы для IE на выборочную загрузку.
		// Поддерживаются следующие префиксы: ie, ie5, ie6, ie7, ie8, ie9, iegt5, iegt6, iegt7, iegt8, 
		// ielt7, ielt8, ielt9
		// 
		// Пример:
		//     Загрузка файлов по версиям браузера IE
		//     load: [
		//         'main.css',
		//         'ie!ie.css',
		//         'ie6!ie7!display_fix.css'
		//     ]
		(function(i){var f={}.hasOwnProperty,g;g="undefined"!==typeof f&&"undefined"!==typeof f.call?function(a,b){return f.call(a,b)}:function(a,b){return b in a&&"undefined"===typeof a.constructor.prototype[b]};var a=function(){for(var a=3,b=document.createElement("div"),c=b.getElementsByTagName("i");b.innerHTML="<\!--[if gt IE "+ ++a+"]><i></i><![endif]--\>",c[0];);return 4<a?a:void 0}(),d={ie:!!a,ie5:5===a,ie6:6===a,ie7:7===a,ie8:8===a,ie9:9===a,iegt5:5<a,iegt6:6<a,iegt7:7<a,iegt8:8<a,ielt7:7>a,ielt8:8>
a,ielt9:9>a},h;for(h in d)g(d,h)&&i.addPrefix(h,function(a){var b;a:{b=a.prefixes;var c,e;for(e=0;e<b.length;e++)if(c=b[e],g(d,c)&&d[c]){b=!0;break a}b=!1}b||(a.bypass=!0);return a})})(scope.yepnope);

		// Возвращаем модифицированный scope
		return scope;
	},

	setDomReady: function() {
		(function(){var f,g,h;function e(){if(!d&&(d=!0,c)){for(var a=0;a<c.length;a++)c[a].call(window,[]);c=[]}}function l(a){var i=window.onload;window.onload="function"!=typeof window.onload?a:function(){i&&i();a()}}function j(){if(!k){k=!0;document.addEventListener&&!f&&document.addEventListener("DOMContentLoaded",e,!1);g&&window==top&&function(){if(!d){try{document.documentElement.doScroll("left")}catch(a){setTimeout(arguments.callee,0);return}e()}}();f&&document.addEventListener("DOMContentLoaded",
function(){if(!d){for(var a=0;a<document.styleSheets.length;a++)if(document.styleSheets[a].disabled){setTimeout(arguments.callee,0);return}e()}},!1);if(h){var a;(function(){if(!d)if("loaded"!=document.readyState&&"complete"!=document.readyState)setTimeout(arguments.callee,0);else{if(void 0===a){for(var b=document.getElementsByTagName("link"),c=0;c<b.length;c++)"stylesheet"==b[c].getAttribute("rel")&&a++;b=document.getElementsByTagName("style");a+=b.length}document.styleSheets.length!=a?setTimeout(arguments.callee,
0):e()}})()}l(e)}}var m=window.DomReady={},b=navigator.userAgent.toLowerCase();b.match(/.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/);h=/webkit/.test(b);f=/opera/.test(b);g=/msie/.test(b)&&!/opera/.test(b);/mozilla/.test(b)&&/(compatible|webkit)/.test(b);var k=!1,d=!1,c=[];m.ready=function(a){j();d?a.call(window,[]):c.push(function(){return a.call(window,[])})};j()})();
	},

	bind: function(fn, context) {
		context || (context = window);

		if (typeof(fn) === 'function') {
			return function() {
				return fn.apply(context, arguments);
			}
		}
		return NO;
	}
};