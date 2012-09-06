/**
 * @author Anton Ignatov
 * @description subframework Marrow for Backbone.js from Parcsis (http://www.parcsis.com/)
 */
 
 /* Backbone core custom extends for ver */
	if (Backbone.VERSION.indexOf('0.9') != -1) {
		// Расширяем прототип Backbone.View добавив метод .unload(), который будет вызывать метод .remove()
		// и удалять текущую вью из бандла
		_.extend(Backbone.View.prototype, {
			// Объект на который при использовании датабиндинга навешиваются обработчики событий связанной 
			// модели
			_modelDataBindProxy: null,

			// Метод отвязывающий датабиндинг от модели
			_unbindDataBindProxy: function() {
				if (this._modelDataBindProxy) {
					this._modelDataBindProxy.off();
					this._modelDataBindProxy = null;
				}
			},

			// Метод в котором идет подготовка к уничтожению вью. 
			// Например снятие глобальных событий, добавление/удаление стилей на стороние элементы и т.д.
			beforeUnload: function() {
				return this;
			},

			// Переопределяем метод Backbone.View._configure для того чтоб сделать инъекцию переменной с 
			// предкомпилированным шаблоном до инициализации вью
			_configure: (function(fn) {
				return function(options) {
					// Переносим значение параметра __bundleName в текущий инстанс вью
					if (options.__bundleName != null) {
						this.__bundleName = options.__bundleName;
						delete options.__bundleName;
					}

					// Переносим значение параметра __afterInit в текущий инстанс вью
					if (options.__afterInit != null) {
						this.__afterInit = options.__afterInit;
						delete options.__afterInit;
					}

					// Заменяем значение this.template с селектором на элемент содержащий шаблон, на 
					// предкомпилированный шаблон
					if (typeof(this.template) === 'string' && this.core.Templates[this.template]) {
						this.template = this.core.Templates[this.template];
					}
					return fn.apply(this, arguments);
				}
			})(Backbone.View.prototype._configure),

			// Удаляем вью из контекста бандла переводя его в состояние не отрисованного
			unload: function() {
				// Убираем обработчики событий используемые в датабиндинге
				try {
					this.$el.off('.databinding');
					this._unbindDataBindProxy();
				} catch(e) {};

				// Проверяем есть ли у нас во вью значения __bundleName (имя бандла к которому относится вью) 
				// и core (ссылка на scope приложения).
				if (this.__bundleName != null && this.core != null) {
					// Если бандл с переданым именем не найден значит вью еще не до конца инициализированна и 
					// обработку нужно отложить. Если бандл существует, то делаем его выгрузку
					if (this.core.get(this.__bundleName).isDummy) {
						this.__afterInit.push(this.unload);
					} else {
						this.core.unload(this.__bundleName);
					}
				}
				return this;
			},

			// Метод инициализирующий датабиндинг текущей вью с указанной моделью. Если модель не указана то 
			// будет использоваться текущая.
			// Для правильной работы датабиндинга у связываемой модели обязательно должен быть метод 
			// updateModel(key, attr, value, targetElement) который является адаптером для работы с конкретной структурой каждой модели.
			// 
			// Пример:
			//     Привязываем вью к своей модели по полю 'Value'
			//     this.bindData('Value');
			// 
			//     Привязываем вью к своей модели по набору полей. Ключи объекта это атрибуты DOM элемента и 
			// зарезервированные значения.
			//     this.bindData({
			//         value: 'Value',
			//         enabled: 'IsEdit',
			//         visible: 'IsVisible'
			//     });
			// 
			//     Привязываем вью к источнику данных с именем User по полю 'Value'
			//     this.bindData('Value', 'User');
			// 
			//     Привязываем вью к моделе User по полю 'Value'
			//     this.bindData('Value', this.__aliases._User);
			bindData: function(modelAttr, model) {
				if (typeof(model) === 'string') {
					model = this.__aliases['_' + model];
				}
				model || (model = (this.model || this.collection));

				// Если у бандла нету источников данных и он не передан в аргументах, то выходим из метода
				if (!model) return;

				var reverseAttr = {},
					modelAttrLength = 0,
					proxy = this.core.createEventProxy(model);

				if (typeof(modelAttr) === 'string') {
					modelAttr = {
						value: modelAttr
					};
				} else if (modelAttr == null) {
					modelAttr = {};
				}

				// Создаем обратную коллекцию связки для быстрой обработки во время изменения моделей
				for (var key in modelAttr) {
					if (modelAttr.hasOwnProperty(key)) {
						if (typeof(modelAttr[key]) === 'string') {
							reverseAttr[modelAttr[key]] = key;
							modelAttrLength++;
						} else if (modelAttr[key].push) {
							for (var i = 0, length = modelAttr[key].length; i < length; i++) {
								reverseAttr[modelAttr[key][i]] = key;
								modelAttrLength++;
							}
						}
					}
				}

				// Навешиваем обработчик на изменения всех элементов у которых есть aтрибут name.
				this.$el.on('change.databinding', '[name]', function(event, target) {
					target = $(event.currentTarget);
					model.updateModel(target[0].name, modelAttr.value, target.val(), target);
				});

				// Навешиваем обработчик на изменение модели.
				proxy.on('change', function(model, options) {
					for (var key in options.changes) {
						if (!modelAttrLength || options.changes.hasOwnProperty(key) && reverseAttr[key]) {
							this.changeControl(model.cid, reverseAttr[key], model.get(key), model);
						}
					}
				}, this);

				// Отписываем старую привязку если она была и создаем новую
				this._unbindDataBindProxy();
				this._modelDataBindProxy = proxy;
			},

			// Метод реализующий изменения DOM состовляющей контрола.
			// Для кастомной обработки может быть переопределен во вью.
			changeControl: function(cid, attr, value, model) {
				var target = $('#control-' + cid);

				switch(attr) {
					case 'value':
						target.val(value);
						break;
					case 'datavalue':
						var names = [],
							values = [];

						for (var i = 0, length = value.length; i < length; i++) {
							if (value[i]) {
								values.push(value[i].Id);
								names.push(value[i].Name);
							}
						}
						target
							.val(values)
							.closest('.g-control_container')
							.find('input')
							.val(names.join(', '));
						break;
					case 'visible':
						// Класс g-control_container должен обязательно находится на контейнере контрола чтоб можно 
						// было сделать универсальный траверсинг
						target
							.closest('.g-control_container')
							.toggleClass('g-hidden', !value);
						break;
					case 'enabled':
						target
							.attr('disabled', !value)
							.closest('.g-control_container')
							.toggleClass('g-control--disabled', !value);
						break;
				}
			}
		});

		// Расширяем прототип модели в Backbone.js
		_.extend(Backbone.Model.prototype, {
			// Метод который удалит из колекцию модель состоящую в этой коллекции
			remove: function(options) {
				try {
					this.collection.remove(this.cid, options);
				} catch(e) {}
				return this;
			},

			// Метод который получает оригинальные данные модели вырезает из них служебные поля по префиксу 
			// "_" и запускает на кастомную обработку если это нужно
			toReqJSON: (function(fn) {
				return function(method) {
					var data = fn.apply(this, arguments);

					for (var key in data) {
						if (data.hasOwnProperty(key)) {
							// Если у имени поля есть префикс с подчеркиванием то вырезаем его
							if (!key.indexOf('_')) {
								delete data[key];
							}
						}
					}

					if (typeof (this.processRequestData) === 'function') {
						return this.processRequestData(data, method);
					}
					return data;
				}
			})(Backbone.Model.prototype.toJSON),

			// Метод который можно переопределять в конкретной модели для дополнительной постобработки 
			// обработки данных для отправки на сервис в зависимости от метода запроса
			processRequestData: function(data, method) {
				return data;
			}
		});

		// Расширяем прототип коллекции в Backbone.js
		_.extend(Backbone.Collection.prototype, {
			// Метод который делает вызовы метода model.toReqJSON() у всех содержащихся моделей 
			toReqJSON: function(method) {
				var data = this.map(function(model) {
						return model.toReqJSON(method);
					});

				if (typeof (this.processRequestData) === 'function') {
					return this.processRequestData(data, method);
				}
				return [];
			},

			// Метод который можно переопределять в конкретной модели для дополнительной постобработки 
			// обработки данных для отправки на сервис в зависимости от метода запроса
			processRequestData: function(data, method) {
				return data;
			}
		});

		// Расширяем прототип Backbone.History расширив метод .loadUrl(), который после отрисовки метода 
		// роута будет выстреливать событие об окончании смены роута
		_.extend(Backbone.History.prototype, {
			start: (function(fn) {
				return function(options) {
					// Переносим значение параметра core в текущий инстанс истории
					if (options.core != null) {
						this.core = options.core;
						delete options.core;
					}
					return fn.apply(this, arguments);
				}
			})(Backbone.History.prototype.start),

			loadUrl: (function(fn) {
				return function() {
					var returnData = fn.apply(this, arguments);

					// Тригерим событие об изменении роута передавай в параметрах предыдущий и текущий роут
					this.core.router.trigger('route:after_change', this.core.router.prevRoute, this.core.router.currentRoute);
					return returnData;
				}
			})(Backbone.History.prototype.loadUrl)
		});

		_.extend(Backbone.Router.prototype, {
			// Добавляем префикс #!/ в выставляемый url и тригерим событие об изменении роута
			navigate: function(fragment, options) {
				var section = this.core.getHashUrl().section;

				// Делаем предобработку фрагмента вырезая из него хешбэнг если он был передан
				fragment = fragment.replace(/^#!\/(.*)$/, '$1');

				// Вызываем изменение роута
				Backbone.history.navigate('!/' + fragment, options);

				// Тригерим событие о начале изменения роута передавая в параметрах текущий и будующий роут
				this.trigger('route:before_change', this.currentRoute, section);

				// Изменяем предидущий и текущий роут
				this.prevRoute = this.currentRoute;
				this.currentRoute = section;
			},

			// Добавляем обработку префикса #!/
			_routeToRegExp: function(route) {
				route = route.replace(this.escapeRegExp, '\\$&')
					.replace(this.namedParam, '([^\/]+)')
					.replace(this.splatParam, '(.*?)');
				return new RegExp('^(?:!\/)?\/?' + route + '$');
			}
		});
	}
/* Backbone core custom extends */

/* Core */
	// Объявляем лексические сокращения для true и false
	var YES = !0,
		NO = !1;

	window['WebApp'] || (window['WebApp'] = {});
	window['WebApp']['Core'] = {
		// Версия фреймворка Marrow. Составляется из полной версии backbone.js + дата последнего 
		// изменения в формате: yymmdd)
		version: '0.9.2.120904',

		// Ссылка для получения из песочницы объекта window основного документа в котором 
		// инициализируется веб-приложение
		global: window,

		// Список зарегистрирвоанных в системе бандлов
		list: [],

		// Метод, который будет позволять замерять производительность выполнения скриптов.
		// [TODO] Оттестировать на реальных условиях
		perf: function() {
			this.startTime;
			this.fn = window.performance.now || window.performance.webkitNow || window.performance.msNow || window.performance.mozNow || Date.now;
			this.start = function() {
				this.startTime = this.fn();
			};
			this.end = function() {
				if (!this.startTime) {
					return 0;
				}
				return this.fn() - this.startTime;
			};
		},

		// Метод который полностью подменяет контекст вызова у переданной функции на тот что был передан 
		// в параметрах.
		// Более быстрая альтернатива универсальному fn.bind(context) (http://jsperf.com/bind-experiment-2)
		// 
		// Пример: 
		//     var a = {
		//         handler: core.bind(fn, context)
		//     }
		bind: function(fn, context) {
			context || (context = window);

			if (typeof(fn) === 'function') {
				return function() {
					return fn.apply(context, arguments);
				}
			}
			return NO;
		},

		// Метод который регистрирует и возвращает псевдонимы в которых указанны ссылки на переданные 
		// объекты.
		// 
		// Пример:
		//     Получение коллекции всех ссылок. Имеет аналог в виде core.aliases
		//     core.links();
		// 
		//     Получение ссылки зарегистрированной по передаваемому псвдониму.
		//     core.links('aliasName');
		// 
		//     Регистрация ссылки на объект/переменную/фукцию под переданным псевдонимом
		//     core.links('aliasName', link);
		links: function(aliasName, link) {
			this._global_links || (this._global_links = {});

			var hasName = !!aliasName,
				hasLink = !!link;

			if (hasLink && hasName) {
				if (typeof(aliasName) === 'string') {
					if (!this._global_links[aliasName]) {
						this._global_links[aliasName] = link;
					} else {
						return NO;
					}
				} else {
					return NO;
				}
			} else if (hasName) {
				return this._global_links[aliasName];
			} else if (hasLink) {
				return NO;
			}
			return this._global_links;
		},

		// Метод который позволяет создать jQuery DOM элемент с переданным набором параметров. 
		// Работает быстрее чем $('<div>').
		// 
		// Пример: 
		//     core.domBuilder('div', {
		//         id: 'id',
		//         name: 'name',
		//         class: 'className',
		//         html: 'text'
		//     });
		domBuilder: function(tagName, options) {
			var domEl = [document.createElement(tagName)];

			$.fn.attr.call(domEl, options, YES);
			return $.merge($(), domEl);
		},

		// Метод по переданному селектору получает текст шаблона и делает его компиляцию возвращая 
		// объект шаблонизатора
		compileTemplate: function(selector) {
			return Handlebars.compile($(selector).html());
		},

		// Метод упрощающий работу с хелперами в Handlebars
		renderHelper: function(name, data) {
			var helper = Handlebars.helpers[name];

			if (helper) {
				return Handlebars.helpers[name](data).toString();
			}
		},

		// Метод который получает текущий роутинг и выдает его в более удобном формате для работы 
		// разбивая на:
		//     section - основная часть роута
		//     parameters - остальные параметры присутсвующие в урле. Чаще всего служебная информация 
		// для вьюх
		getHashUrl: function() {
			var reg = /(?:!\/)?([^\/]+)\/?(.*)/,
				regData = Backbone.History.started && reg.exec(Backbone.history.getFragment()) || [];

			return {
				section: regData[1],
				parameters: regData[2]
			}
		},

		// Объект реализующий паттерн pub/sub с полной поддержкой событий jquery но работающий на много 
		// быстрее (http://jsperf.com/custom-pub-sub-test)
		// 
		// Пример:
		//     Выстреливает глобальное событие event_name и передает в обработчик два аргумента;
		//     core.observatory.trigger('event_name', [argument1, argument2]) 
		// 
		//     Создание обработчика на глобальное событие event_name, который принимает в качестве 
		// аргументов объект jQuery события и два аргумента переданные при выстреливании события
		//     core.observatory.on('event_name', function(event, argument1, argument2) {
		//         code here
		//     });
		
		//     Создание обработчика на глобальное событие event_name, который принимает в качестве 
		// аргументов объект jQuery события и два аргумента переданные при выстреливании события, 
		// а так же обработчик вызывается с указаным контекстом (передается третьим аргументом)
		//     core.observatory.on('event_name', function(event, argument1, argument2) {
		//         code here
		//     }, this);
		// 
		//     Отписываемся от события
		//     core.observatory.off('event_name');
		observatory: (function() {
			var regex = /\.([^.]+)$/,
				eventMap = {
					global: {}
				},
				rebuild = function() {
					cache = {};

					for (var namespace in eventMap) {
						if (eventMap.hasOwnProperty(namespace)) {
							var events = eventMap[namespace];

							for (var key in events) {
								if (events.hasOwnProperty(key) && events[key] && events[key].length) {
									if (namespace === 'global') {
										cache[key] = events[key];
									} else {
										cache[key] || (cache[key] = []);
										cache[key] = cache[key].concat(events[key]);

										cache['.' + namespace] || (cache['.' + namespace] = []);
										cache['.' + namespace] = cache['.' + namespace].concat();

										cache[key + '.' + namespace] = events[key];
									}
								}
							}
						}
					}
				},
				cache = {};

			return {
				on: function(eventName, handler, context) {
					var parts = eventName.split(/\.([^.]+)$/),
						target = eventMap.global;

					if (!eventName || !handler || typeof(handler) !== 'function') return this;

					if (!parts[parts.length - 1]) {
						parts.pop();
					}

					if (parts[0]) {
						if (parts.length > 1) {
							target = eventMap[parts[1]] || (eventMap[parts[1]] = {});
						}
						target[parts[0]] || (target[parts[0]] = []);
						target[parts[0]].push({
							h: handler,
							c: context
						});
					}
					rebuild();
					return this;
				},
				off: function(eventName, handler, context) {
					var parts = eventName.split(/\.([^.]+)$/),
						parseList = function(list) {
							var newList = [];

							for (var i = 0, length = list.length; i < length; i++) {
								var bundle = list[i];

								if (!(bundle.h == handler && (context != null && bundle.c == context || context == null))) {
									newList.push(bundle);
								}
							}
							return newList;
						},
						target = [],
						list;

					if (!parts[parts.length - 1]) {
						parts.pop();
					}

					for (var namespace in eventMap) {
						if (eventMap.hasOwnProperty(namespace) && (!parts[1] || parts[1] == namespace)) {
							var events = eventMap[namespace];

							if (typeof(handler) === 'function') {
								if (events[parts[0]]) {
									events[parts[0]] = parseList(events[parts[0]]);
								} else {
									for (var key in events) {
										if (events.hasOwnProperty(key) && events[key] && events[key].length) {
											events[key] = parseList(events[key]);
										}
									}
								}
							} else {
								if (events[parts[0]]) {
									delete events[parts[0]];
								} else if (parts[1]) {
									delete eventMap[namespace];
								}
							}
						}
					}
					rebuild();
					return this;
				},
				trigger: function(eventName, params) {
					var events = cache[eventName];

					if (events) {
						for (var i = 0, length = events.length; i < length; i++) {
							var bundle = events[i],
								handler = bundle.h,
								context = bundle.c;

							if (typeof(handler) === 'function') {
								if (context == null) {
									context = this;
								}
								handler.apply(context, [eventName].concat(params));
							}
						}
					}
					return this;
				}
			}
		})(),

		// Самый быстрый метод глубокого клонирования. Не поддерживает ссылки, функции и объекты с 
		// методами
		clone: function(obj) {
			return JSON.parse(JSON.stringify(obj));
		},

		// Метод добавляющий в начале числа нули равное указанному значеню разрядов
		formatDate: function(digit, count, dummy) {
			dummy = [];
			count || (count = 2);
			dummy.length = count;

			return (dummy.join('0') + digit).slice(-count);
		},

		// Метод который делает анимацию списка jquery объектов с помощью css3 анимацию с промежутками 
		// между анимациями
		animateWithChainFx: function(list, params, options, self, count) {
			if (!$.transit) {
				throw 'For using core.animateWithChainFx method you need to include jquery.transit library';
				return NO;
			}
			count || (count = 1);

			if (list.length) {
				options || (options = {
					speed: 200,
					timeout: 50
				});
				options.speed || (options.speed = 200);
				options.timeout || (options.timeout = 50);
				self || (self = this.animateWithChainFx);
				list
					.eq(0)
					.transition(params.push ? params[0] : params, options.speed, function() {
						if (typeof(options.callback) === 'function') {
							options.callback.apply(this);
						}

						if (list.length == 1 && typeof(options.final) === 'function') {
							options.final.apply(this);
						}
					});
				setTimeout(function() {
					params.push && params.shift();
					self(list.not(list.eq(0)), params, options, self, count + 1);
				}, options.timeout);
			} else if (count == 1 && typeof(options.final) === 'function') {
				options.final.apply(this);
			}
		},

		// Упрощенный метод для перемещения по роутам
		// 
		// Пример:
		//     Переход на роут 'user' с запуском механизма роутинга
		//     Результат: http://site.com/#!/user
		//     core.navigate('user');
		// 
		//     Переход на роут 'user' с запуском механизма роутинга и перезаписыванием последнего шага 
		// истории.
		//     Результат: http://site.com/#!/user
		//     core.navigate('user', YES);
		// 
		//     Переход на роут 'user' с запуском механизма роутинга и последующим указанием дочернего урла
		//     Результат: http://site.com/#!/user/edit
		//     core
		//         .navigate('user')
		//         .navigate('edit', NO, {
		//             silent: YES,
		//             isSubRoute: YES
		//         });
		// 
		navigate: function(fragment, replace, params) {
			params || (params = {});
			this.router.navigate((params.isSubRoute ? this.getHashUrl().section + '/' : '') + fragment.replace(/^\/+/, ''), {
				trigger: !params.silent && YES,
				replace: !!replace
			});
			return this
		},

		// Метод позволяющи работать с датой в формате timestamp форматирую ее для дальнейшей работы.
		// Принимает следующие параметры которые влияют на результат выполнения метода:
		//     time - Время в формате timestamp или в строковом формате который может распарсить 
		// Date.parse() (см. http://www.w3schools.com/jsref/jsref_parse.asp). Если параметр не передан, 
		// то будет использовать время на момент вызова метода.
		//     format - строковый формат в котором необходимо вернуть указанное время. 
		// 
		// Пример: 'dd.mm.HH'. 
		// Результат: '28.1.2011'
		//     asArray - булевый аргумент указывающий на то в каком виде возвращать отформатированую дату. 
		// Если он положителен то вернется массив, если нет то строка.
		// 
		// Если не передан аргумент format или он является falsy значением то методом будет возвращен 
		// объект в котором содержиться разобранная дата по параметрам
		dateUTC: function(time, format, asArray) {
			var splitReg = /[:.-]/,
				date,
				d;

			// Задаем переданное время
			if (time) {
				d = new Date(time);
			}

			// Если время небыло задано или был передан не правильный формат, то создаем объект текущей даты
			if (!+d) {
				d = new Date();
			}
			date = {
				wd: d.getUTCDay(),
				dd: d.getUTCDate(),
				h: d.getUTCHours(),
				mm: d.getUTCMonth(),
				m: d.getUTCMinutes(),
				s: d.getUTCSeconds(),
				hh: d.getUTCFullYear(),
				ms: d.getUTCMilliseconds(),
				WD: this.formatDate(d.getUTCDay()),
				DD: this.formatDate(d.getUTCDate()),
				H: this.formatDate(d.getUTCHours()),
				M: this.formatDate(d.getUTCMinutes()),
				S: this.formatDate(d.getUTCSeconds()),
				MM: this.formatDate(d.getUTCMonth() + 1),
				HH: this.formatDate(d.getUTCFullYear(), 4),
				MS: this.formatDate(d.getUTCMilliseconds(), 3),
				timestamp: d.valueOf()
			};

			if (format) {
				var partialDate = format.split(splitReg),
					symbolResult = splitReg.exec(format),
					delimeterSymbol = symbolResult ? symbolResult[0] : '',
					formatedDate = [];

				for (var i = 0, length = partialDate.length; i < length; i++) {
					formatedDate.push(date[partialDate[i]]);
				}
				return asArray ? formatedDate : formatedDate.join(delimeterSymbol);
			}
			return date;
		},

		// Метод эмулирующий работу метода core.requestWrapper(), поддерживая полностью его апи.
		// Для генерации фейковых данных использует библиотеку $.mockJSON.
		// Шаблоны запросов формируются в файле models/mock.js.
		// Метод никак не взаимодействует с глобальными коллекциями запросов.
		fakeRequestWrapper: function(target, method, data, params) {
			var options = params.options || {},
				fakeXHR = {
					abort: function() {}
				};

			fakeXHR.userData = $.extend({}, params, params.appendData && {
				sendedData: data
			});
			target.action = params.action;

			// Эмулируем временную задержку перед получением данных
			setTimeout(function() {
				$.getJSON(target.url(), function(json) {
					target.parse(json, fakeXHR);

					if (typeof(options.success) === 'function') {
						options.success(json, 'success', fakeXHR);
					}

					if (typeof(options.complete) === 'function') {
						options.success(fakeXHR, 'success');
					}
				});
			}, 1000);
		},

		// Обертка над запросом которая позваляет "продавливать" переданные параметры
		// в объект xhr который приходит в метод parse модели или коллекции.
		// 
		// Возможные параметры:
		// params: {
		//     uniqueness - (string) При передаче уникального id канала запросов в котором выполняется 
		// запрос он будет отменен и начат новый.
		//     synchronous - (string) При передаче уникального id канала запросов в котором выполняется 
		// запрос новые попытка выполнения запросов будут проигнорированы до завершения текущего
		//     options - (object) Набор параметров передаваемые напрямую в $.ajax
		//     action - (string) Название экшена, который необходимо вызвать. Определяет на какой урл 
		// будет сделан запрос и каким обработчиком после завершения запроса данные будут обрабатываться
		//     appendData - (bool) Указывает на то необходимо ли добавить отправляемые на сервер данные 
		// в объект запроса с последующей возможность их получения в обработчике запроса
		// }
		// 
		// Пример:
		//     Вызов запроса с экшеном create_policy, передачей данных, ключом уникальности и дополнительным обработчиком 
		// по завершению запроса
		//     core.requestWraper(this, 'send', {
		//         Name: 'vBrand'
		//     }, {
		//         action: 'create_policy',
		//         uniqueness: 'create_policy',
		//         options: {
		//             success: function(model, response) {}
		//         }
		//     });
		requestWrapper: function(target, method, data, params) {
			this._req || (this._req = {});

			if (target && method && typeof(target[method]) === 'function') {
				data || (data = {});
				params || (params = {});

				// Если у нас передан уникальный ключ запроса, параметр synchronous и уже выполняется запрос 
				// с таким же uniqueness, то новый запрос игнорируется, до окончания старого
				if (params.uniqueness && params.synchronous) {
					var req = this._req[params.uniqueness];

					if (req) {
						return NO;
					}
				}

				// Если требуется то делаем предобработку данных для всех запросов
				if (typeof(this.preProcessRequestWrapperData) === 'function') {
					var processedData = this.preProcessRequestWrapperData(data);

					if (processedData) {
						data = processedData;
					}
				}

				var app = this,
					xhr = null,
					arguments = [data],
					options = params.options || {},
					errorStatuses = {
						'error': YES,
						'timeout': YES,
						'parsererror': YES
					},
					getErrorText = this.getErrorText,
					beatTheHeart = this.bind(function() {
						if (this.heartbeatState && typeof(this.startHeartbeat) === 'function') {
							if (typeof(this.stopHeartbeat) === 'function') {
								this.stopHeartbeat();
							}
							this._heartbeatTimer = setTimeout(this.bind(function() {
								this.startHeartbeat();
								beatTheHeart();
							}, this), this.heartbeatTimout * 1000 * 60); // Время указывается в минутах
						}
					}, this);

				// Если обработчик метода complete не был передан, то заменяем его на функцию-пустышку
				options.complete || (options.complete = function() {});

				// Делаем обертки для методов success и error чтоб после окончания запроса
				// можно было запустить "биение сердца"
				if (typeof(options.success) === 'function') {
					options.success = (function(originalSuccessHandler, uniqueness) {
						return function() {
							// Удаляем выполненый запрос из коллекции
							if (app._req[uniqueness]) {
								delete app._req[uniqueness];
							}
							originalSuccessHandler.apply(this, arguments);
						}
					})(options.success, params.uniqueness);
				}

				if (typeof(options.complete) === 'function') {
					options.originalCompleteHandler = options.complete;

					options.complete = function(xhr, textStatus) {
						xhr.userData || (xhr.userData = {});

						var uniqueness = xhr.userData.uniqueness,
							options = xhr.userData.options;

						if (options && options.originalCompleteHandler) {
							options.originalCompleteHandler.apply(this, arguments);
						}

						// Как бы не закончился запрос (ошибкой или успехом) запускаем
						// "биение сердца" для поддержания сессии
						beatTheHeart();

						// Если статус запроса вернулся равным error, timeout или parsererror,
						// то значит произошла какая-то ошибка и нужно вывести сообщение об этом
						if (errorStatuses[textStatus] && typeof(getErrorText) === 'function') {
							if (typeof(app.error) === 'function') {
								app.error(getErrorText());
							}
						}
					}
				}
				options.timeout || (options.timeout = 3 * 1000 * 60); // таймаут ожидания в минутах (3 мин)

				// Добавляем обработанные опции в список аргументов
				arguments.push(options);

				if (method == 'fetch') {
					arguments.shift();
				}
				target.action = params.action;

				// Остановка "биения сердца" если запрос выполняется долго, чтоб не было паралельного запроса
				if (typeof(this.stopHeartbeat) === 'function') {
					this.stopHeartbeat();
				}

				// Выполняем запрос с параметрами
				xhr = target[method].apply(target, arguments);
				xhr.userData = $.extend({}, params, params.appendData && {
					sendedData: data
				});

				// Если передан этот параметр то под его значением мы сохраняем запрос
				// в коллекцию и при повторном вызове запроса с таким значение сбросит
				// старый запрос сохраненный в коллекции записав на его место новый
				if (params.uniqueness) {
					this.abortRequest(params.uniqueness);
					this._req[params.uniqueness] = xhr;
				}
			} else {
				if (params.options && typeof(params.options.error) === 'function') {
					params.options.error({}, 'error', 'Unknown request method: ' + method);
				}
			}
		},

		// Метод обрывающий выполняемый запрос по его id. Выполняется по требованию
		abortRequest: function(id) {
			if (id) {
				var req = this._req[id];

				req || (req = {});

				// Если в коллекции есть активный запрос, то отменяем его и удаляем из коллекции
				if (typeof(req.abort) === 'function') {
					req.abort();
					delete this._req[id];
				}
			}
		},

		// Метод, который преобразует объект в массив. В массив добавляется элемент формата:
		// {
		//     name: key,
		//     value: object[key]
		// }
		// 
		// Если будет передан массив, то он веренется без изменения.
		toArray: function(data) {
			var returnData = [];

			if (data) {
				if (data.length) {
					returnData = data.slice(0);
				} else {
					for (var key in data) {
						if (data.hasOwnProperty(key)) {
							returnData.push({
								name: key,
								value: data[key]
							});
						}
					}
				}
			}
			return returnData;
		},

		// Метод, который преобразует массив в объект. Массив должен приходить формата:
		// [{
		//     name: 'a',
		//     value: 1
		// },{
		//     name: 'b',
		//     value: 2
		// }]
		// 
		// На выходе получим:
		// {
		//     a: 1,
		//     b: 2
		// }
		// 
		// Если будет передан объект, то он вернется без обработки.
		toObject: function(data) {
			var returnData = {};

			if (data) {
				if (data.push && data.length) {
					for (var i = 0, length = data.length, item, itemData; i < length; i++) {
						item = data[i];
						itemData = returnData[item.name];

						if (itemData) {
							if (!itemData.push) {
								returnData[item.name] = [itemData];
							}
							returnData[item.name].push(item.value);
						} else {
							returnData[item.name] = item.value;
						}
					}
				} else {
					returnData = data;
				}
			}
			return returnData;
		},

		// Метод для создания и получения куков.
		// Если в качестве аргумента передан массив, то метод вернет значения переданных значений в том 
		// же порядке в каком они находились в массиве.
		// Если передан объект со значения, то метод создаст переменные с названиями как ключи полей и 
		// значениями что указанны в этих полях
		// 
		// Пример:
		//     Запись значений в куки
		//     core.cookie({
		//         firstName: 'Jon',
		//         lastName: 'Doe'
		//     });
		//     Результат: ['Jon', 'Doe']
		// 
		//     Получение значений из кук
		//     core.cookie(['firstName', 'lastName']);
		//     Результат: ['Jon', 'Doe']
		// 
		//     Получение значений из кук
		//     core.cookie('firstName, lastName');
		//     Результат: ['Jon', 'Doe']
		// 
		//     Получение значений из кук
		//     core.cookie('firstName, lastName, middleName');
		//     Результат: ['Jon', 'Doe', null]
		// 
		//     Удаление значения из кук
		//     core.cookie({
		//         lastName: null,
		//         middleName: false
		//     });
		//     core.cookie('firstName, lastName, middleName');
		//     Результат: ['Jon', null, false]
		// 
		//     Запись значений в куки только на открытую сессию (после закрытия окна кука будет удалена)
		//     core.cookie({
		//         firstName: 'Jon',
		//         lastName: 'Doe'
		//     }, true);
		// 
		//     Запись в куку объекта
		//     core.cookie({
		//         city: {
		//             name: 'Samara',
		//             location: []
		//         }
		//     });
		//     Результат: [{name: 'Samara', location: []}]
		cookie: function(params, isSessionCookie) {
			var get = function(name) {
					var reg = new RegExp(name.replace(/\s+/, '') + '=([^;]*)', 'gi'),
						result = reg.exec(document.cookie);

					return result && JSON.parse(result[1]);
				},
				addedParams = [];

			// Если параметр не передан, то возвращаем весь объект кук
			if (!params) {
				return document.cookie;
			}

			// Обработка на случай если аргумент передали в качестве строки
			if (typeof(params) === 'string') {
				params = params.split(',');
			}

			if (params instanceof Array) {
				var list = [];

				for (var i = 0, length = params.length; i < length; i++) {
					list.push(get(params[i]));
				}
				return list;
			} else {
				for (var key in params) {
					if (params.hasOwnProperty(key)) {
						var cookieArr = [key + '=' + JSON.stringify(params[key]), 'path=/', 'expires=Mon, 01-Jan-' + (params[key] == null ? '1900' : '2100') + ' 00:00:00 GMT'];

						// Если у нас кука должна быть сессионной, то мы удаляем дату expires
						if (isSessionCookie) {
							cookieArr.pop();
						}
						addedParams.push(key);

						// Записываем значение куки
						document.cookie = cookieArr.join(';');
					}
				}
				return arguments.callee(addedParams);
			}
		},

		// Метод возвращающий дополнительное строковое значение для IE во избежания кеширования
		getCacheReset: function() {
			return $.browser.msie ? '?ajax=' + this.dateUTC().timestamp : '';
		},

		// Метод создающий объект-пустышку для проксирования абсолютно всех событий с переданного 
		// источника данных.
		// Может потребоваться когда на один источник данных подписывается несколько обработчиков на 
		// одно и то же событие и во избежания отписывания всех обработчиков при отписывания одного из 
		// них стоит использовать проксирование событий, так как кадый обработчик будет навешен на свой 
		// собственный источник и никак не влиять на других.
		createEventProxy: function(dataSource) {
			var proxy = _.extend({}, Backbone.Events);

			// Подписываем прокси-объект как обработчик всех событий источника данных
			dataSource.on('all', function() {
				proxy.trigger.apply(proxy, arguments);
			});
			return proxy;
		},

		// Метод создающий бандл на основе вью и связанной с ней источником данных.
		// Источником данных может быть как модель так и коллекция.
		// На основе переданных параметров меняется поведение функционирования вью заключенной в бандле.
		// При создании бандла источник данных инициализируется сразу и в бандл сохраняется ссылка на 
		// его инстанс. В случае передача ссылки на источник данных она просто присвается как собственная.
		// 
		// Параметры:
		//     name - (string) Имя создаваемого бандла. Обычно совпадает с именем вью и источника данных
		//     params = {
		//         model - (string/object) Ссылка на модели коллекции для ее создания и линкования в бандл 
		// в качестве источника данных. Так же может передаваться строковое название модели, в таком случае 
		// конструктор будет искаться в глобальной коллекции моделей.
		//         isCollection - (bool) Указывает на то является ли источником данных коллекция. Сокращает 
		// запись если вместо модели используется коллекция как источник данных.
		//         multiple - (bool) Указывает на то можем ли мы создать несколько инстансов вью 
		// завязанных на один и тот же источников данных.
		//         initData - (object/array) Данные с которыми будет инициализирован источник данных.
		//         standalone - (bool) Указывает на то удалиться ли вью при вызове метода core.unload(). 
		// Вью в бандле с таким параметром можно будет удалить только вызвав core.unload(<имя бандла>).
		//         collection - (string/object) Ссылка на конструктор коллекции для ее создания и 
		// линкования в бандл в качестве источника данных. Так же может передаваться строковое название 
		// коллекции, в таком случае конструктор будет искаться в глобальной коллекции коллекций
		//         dataSource - (string) Имя бандла чьей источник данных будет слинкован как источник 
		// данных создаваемого бандла
		//         view - (string/object) Ссылка на конструктор вьюкоторый будет использоваться для 
		// создания вью. Так же может передаваться строковое название вью, в таком случае конструктор 
		// будет искаться в глобальной коллекции вьюшек
		//     }
		// 
		// Пример:
		//     Регестрирование бандла включающего в себя вью с именем User и модель с таким же именем
		//     core.set('User');
		// 
		//     Регестрирование бандла включающего в себя вью с именем User и модель c именем Bandit
		//     core.set('User', {
		//         model: App.Models.Bandit
		//     });
		// 
		//     Регестрирование бандла у которого в качестве источника данных используется коллекция имя 
		// которой совпадает с именем вью.
		//     core.set('UserList', {
		//         isCollection: true
		//     });
		// 
		//     Регестрирование бандла включающего в себя только модель User + бандл Header который 
		// использует источник данных User для вывода информации о пользователе
		//     core
		//         .set('User', {
		//             view: false
		//         })
		//         .set('Header', {
		//             dataSource: 'User'
		//         });
		set: function(name, params) {
			params = params || {};

			var view = params.view,
				model = params.model,
				collection = params.isCollection ? this.Collections[name] : params.collection,
				dataSource = params.dataSource,
				initData = params.initData,
				initOptions = params.initOptions,
				data = {
					parent: YES,
					multiple: !!params.multiple,
					standalone: !!params.standalone,
					dontAbortOnUload: !!params.dontAbortOnUload
				},
				exeptionList = {
					'view': YES,
					'_view': YES,
					'multiple': YES,
					'eventProxy': YES,
					'standalone': YES
				};

			if (dataSource) {
				var object = this.get(dataSource);

				for (var key in object) {
					if (object.hasOwnProperty(key) && !exeptionList[key]) {
						data[key] = object[key];
					}
				}
			} else {
				if (collection) {
					// Прописываем в коллекцию ссылку на объект веб-приложения
					collection.prototype.core = this;
					collection.prototype.__bind = this.bind;
					collection.prototype.__links = this.bind(this.links, this);
					collection.prototype.__aliases = this.aliases;
					collection.prototype.__bundleName = name;

					// Если к коллекции слинкована модель то расширяем ее прототип аналогично коллекции
					if (collection.prototype.model != null) {
						collection.prototype.model.prototype.core = this;
						collection.prototype.model.prototype.__bind = this.bind;
						collection.prototype.model.prototype.__links = this.bind(this.links, this);
						collection.prototype.model.prototype.__aliases = this.aliases;
						collection.prototype.model.prototype.__bundleName = name;
					}

					// Создаем инстанс коллекции и записываем его в бандл
					data.collection = new collection(initData, initOptions);
				} else {
					// Если модель не передана, то ищем ее по имени бандла
					if (model == null && this.Models[name]) {
						model = this.Models[name];
					}

					// Если модель передана как строка, то ищем ее по переданной строке
					if (typeof(model) === 'string') {
						model = this.Models[model];
					}

					// Если модель существует, то создаем ее инстанс и записываем в бандл
					if (model) {
						// Прописываем в модель ссылку на объект веб-приложения
						model.prototype.core = this;
						model.prototype.__bind = this.bind;
						model.prototype.__links = this.bind(this.links, this);
						model.prototype.__aliases = this.aliases;
						model.prototype.__bundleName = name;

						// Создаем инстанс модели и записываем его в бандл
						data.model = new model(initData, initOptions);
					}
				}
			}

			if (data.model || data.collection) {
				data.eventProxy = this.createEventProxy(data.model || data.collection);
			}

			// Если вью не передана, то ищем ее по имени бандла
			if (view == null && this.Views[name]) {
				view = this.Views[name];
			}

			// Если вью передана как строка, то ищем ее по переданной строке
			if (typeof(view) === 'string' && this.Views[view]) {
				view = this.Views[view];
			}

			// Если вью существует, то записываем ссылку на конструктор в бандл
			if (view) {
				data._view = view;
			}

			// Проставляем во вью имя бандла к которому она относится.
			// Необходимо для работы метода .unload() внутри вью.
			if (data._view != null) {
				data._view.prototype.core = this;
				data._view.prototype.__bind = this.bind;
				data._view.prototype.__links = this.bind(this.links, this);
				data._view.prototype.__aliases = this.aliases;
				data._view.prototype.__document = this.global.document;
			}

			// Если имя бандла было передано и не равно null, undefined или false то сохраняем его в 
			// коллекцию бандлов иначе просто возвращаем объект бандла
			if (name != null && name !== NO) {
				this['__' + name] = data;
				this.list.push(name);

				// Обязательно создаем ссылку в App.aliases на модель или коллекцию если они используются в
				// бандле
				if (data.model || data.collection) {
					this.links('_' + name, (data.model || data.collection));
				}
			} else {
				// Если бандл не записывается в глобальную коллекцию, то для упрощения работы с ним добавляем метод render
				data.render = this.bind(function(params) {
					params || (params = {});

					if (this.view == null && typeof(this._view) === 'function') {
						this.view = new this._view($.extend(params, this));
						return this.view;
					}
				}, data);
				data.unload = this.bind(function() {
					if (this.view != null) {
						this.view.core.unload(this);
					}

					// Если у бандла есть модель, то мы ее уничтожаем
					if (this.model != null) {
						// Если у модели есть активные запросы, то обрываем их
						if (!this.dontAbortOnUload) {
							Backbone.sync('abort', this.model);
						}
						this.model = null;
					}

					// Если у бандла есть коллекция, то мы ее уничтожаем
					if (this.collection != null) {
						// Если у коллекции есть активные запросы, то обрываем их
						if (!this.dontAbortOnUload) {
							Backbone.sync('abort', this.collection);
						}
						this.collection = null;
					}

					// Если у бандла есть eventProxy, то мы отписываем все события и тоже удаляем
					if (this.eventProxy != null) {
						this.eventProxy.off();
						this.eventProxy = null;
					}
				}, data);
				return data;
			}
			return this;
		},

		// Метод создает локальный бандл (он не появляется в списке бандлов так как не поднимается в 
		// глобальную область видимости) с моделью чье имя передается в аргументах после чего возвращает 
		// модель из бандла которая отличается от обычного инстанса Backbone.Model расширеными свойствами.
		// 
		// Пример:
		//     Создание локальной версии модели User
		//     core.setModel('User');
		// 
		//     Создание локальной версии модели User c параметрами
		//     core.setModel('User', {
		//         initData: {
		//             FirstName: 'Jon',
		//             LastName: 'Doe'
		//         }
		//     });
		setModel: function(name, params) {
			params || (params = {});
			params.model = this.Models[name];
			return this.set(null, params).model;
		},

		// Метод создает локальный бандл (он не появляется в списке бандлов так как не поднимается в 
		// глобальную область видимости) с моделью чье имя передается в аргументах после чего возвращает 
		// модель из бандла которая отличается от обычного инстанса Backbone.Model расширеными свойствами.
		// 
		// Пример:
		//     Создание локальной версии коллекции для валидаторов
		//     core.setCollection('Validators');
		// 
		//     Создание локальной версии коллекции для валидаторов с бутстрапом изначального списка
		//     core.setCollection('Validators', {
		//         initData: model.get('Validators')
		//     });
		setCollection: function(name, params) {
			params || (params = {});
			params.collection = this.Collections[name];
			return this.set(null, params).collection;
		},

		// Метод который генерирует уникальный 5 значный ID
		generateId: function() {
			return (Math.floor(Math.random() * 10000) + '00000').slice(0, 5);
		},

		// Метод который отрисовывает вью бандла по его имени передавая в созданный инстанс вью 
		// указанные параметры.
		// Если указан параметр multiple, то каждый раз будет создаваться новый временный параметр 
		// который будет наследоваться от первоначального и иметь имя родителя + рендомное число
		// 
		// Пример:
		//     Отрисока бандла по его имени
		//     core.render('Menu');
		// 
		//     Отрисовка бандла по его имени с передачей дополнительно параметров
		//     core.render('Menu', {
		//         context: 'agent'
		//     });
		render: function(name, params) {
			params || (params = {});
			this._multiplyCollection || (this._multiplyCollection = {});

			var data = this.get(name),
				viewData = $.extend(params, data, {
					__afterInit: [],
					__bundleName: name
				});

			if (data && data._view && !data.view) {
				if (data.multiple) {
					var tmpName = name + this.generateId(),
						dummyBundle = $.extend({}, data);

					// Указываем потомку кто у него родитель
					this._multiplyCollection[name] || (this._multiplyCollection[name] = {});
					this._multiplyCollection[name][tmpName] = YES;
					dummyBundle.parentName = name;
					dummyBundle.parent = NO;
					viewData.__bundleName = tmpName;
					name = tmpName;
					dummyBundle.view = new dummyBundle._view(viewData);

					this['__' + name] = dummyBundle;
					this.list.push(name);

					// Перезаписываем оригинальный объект data на вновь созданный
					data = dummyBundle;
				} else {
					this['__' + name].view = new data._view(viewData);
				}

				if (data.view && data.view.__afterInit && data.view.__afterInit.length) {
					for (var i = 0, length = data.view.__afterInit.length, fn; i < length; i++) {
						fn = data.view.__afterInit[i];

						if (typeof(fn) === 'function') {
							fn.call(data.view);
						}
					}
				}
			}
			return data;
		},

		// Метод позволяющий передавать массив имен бандлов с параметрами или без к которым при 
		// отрисовке будут примен общий набор параметров
		// 
		// Пример:
		//     Отрисока нескольких бандлов с передачей в каждый из них одного и того же набора параметров
		//     core.renderStream(['Menu', 'Content', 'Footer'], {
		//         context: 'agent'
		//     });
		// 
		//     Отрисока нескольких бандлов с передачей в каждый из них одного и того же набора 
		// параметров + дополнительной передачей кастомного набора параметров в один из бандлов
		//     core.renderStream([{
		//         name: 'Menu',
		//         params: {
		//             params: params,
		//             value: value
		//         }
		//     }, 'Content', 'Footer'], {
		//         context: 'agent'
		//     });
		renderStream: function(bundlesList, params) {
			params || (params = {});

			for (var i = 0, length = bundlesList.length, bundle, name; i < length; i++) {
				bundle = bundlesList[i];
				name = '';

				if (typeof(bundle) === 'string') {
					name = bundle;
				} else if (bundle.name != null) {
					name = bundle.name;
				}
				this.render(name, $.extend({}, params, bundle.params));
			}
			return this;
		},

		// Метод получения бандла по его имени. 
		// Если бандла с таким именем не существует то вернется пустой бандл
		// 
		// Пример:
		//     Получение бандла по имени
		//     core.get('User');
		get: function(name) {
			var bundle = this['__' + name] || {
					parent: NO,
					isDummy: YES,
					multiple: NO,
					standalone: NO,
					dontAbortOnUload: NO,
					_view: Backbone.View
				};


			if (typeof(name) !== 'string') {
				delete bundle.isDummy;
				delete bundle.eventProxy;

				// Если переданное имя бандла на самом деле является моделью, то присваиваем ее в соответсвующее
				// поле bundle.model
				if (name instanceof Backbone.Model) {
					bundle.model = name;
				}

				// Если переданное имя бандла на самом деле является коллекцией, то присваиваем ее в 
				// соответсвующее поле bundle.collection
				if (name instanceof Backbone.Collection) {
					bundle.collection = name;
				}
			}
			return bundle;
		},

		// Метод который делает выгрузку всех отрисованых бандлов у которых не указан параметр standalone
		// Для выгрузки самодостаточных бандлов необходимо в метод передать имя бандла в качестве 
		// аргумента.
		// При выгрузке бандлов с параметром multiple все бандлы потомки будут выгруженны и удалены.
		// 
		// Пример:
		//     Выгрузка всех отрисованых бандлов
		//     core.unload();
		// 
		//     Выгрузка конкретного бандла по его имени
		//     core.unload('Header');
		unload: function(viewName) {
			var list = viewName ? [viewName] : this.list,
				currentHashUrl = window.location.hash.replace('/', '');

			for (var i = 0, length = list.length, name; i < length; i++) {
				name = list[i];

				if (name != null) {
					var object = typeof(name) === 'string' ? this.get(name) : name,
						isStandalone = !!object.standalone,
						multiplies = this._multiplyCollection || {},
						view = object.view;

					if (isStandalone && object.standalone.push) {
						for (var j = 0, jlength = object.standalone.length, name; j < length; j++) {
							if (currentHashUrl.indexOf(object.standalone[j].replace('/', '')) >= 0) {
								isStandalone = YES;
								break;
							}
						}
					}

					if (!isStandalone || !!viewName) {
						if (view) {
							// Если вью существует и мы ее выгружаем, то отпишем любые обработчики событий навешиваемые 
							// на eventProxy
							if (object.eventProxy) {
								object.eventProxy.off();
							}

							// Обрываем все активные запросы у бандла
							if (!object.dontAbortOnUload && (object.model || object.collection)) {
								// Если у модели или коллекции есть активные запросы, то обрываем их
								Backbone.sync('abort', object.model || object.collection);
							}

							// Если существует метод beforeUnload и он является функцией, то выполняем его
							if (typeof(view.beforeUnload) === 'function') {
								view.beforeUnload();
							}
							view.remove();
							delete object.view;
						}

						if (!object.parent) {
							var parentList = multiplies[object.parentName];

							if (parentList) {
								parentList[name] = NO;
							}
							delete this['__' + name];
						} else {
							var children = multiplies[name];

							if (children) {
								for (var child in children) {
									if (children.hasOwnProperty(child) && children[child]) {
										this.unload(child);
									}
								}
							}
						}
					}
				}
			}
			return this;
		}
	};
/* Core */

/* Native js custom extends */
	if (window.console == null) {
		window.console = {};
		console.log = console.info = console.warn = console.debug = console.group = console.groupEnd = console.error = console.time = console.timeEnd = function() {};
	} else if (typeof(window.console) === 'object' && ($.browser.msie && $.browser.version == 8)) {
		console.debug = console.group = console.groupEnd = console.time = console.timeEnd = function() {};
	}
/* Native js custom extends */