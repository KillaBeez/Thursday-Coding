// version: 1.0.120821

window['WebApp'] || (window['WebApp'] = {});

// Создание конструктора веб приложения
// -------------

// Объявление глобальной переменной для быстрого доступа к конструктору
window['WebApp']['App'] = function() {
	// Создание глобальных коллекция для хранения вью, роутеров, моделей и коллекций
	this.Views = {};
	this.Models = {};
	this.Routers = {};
	this.Templates = {};
	this.Collections = {};

	// Объявление начальных значений для переменных
	this.view = null;
	this.router = null;
	this.aliases = null;

	// Метод инициалзиации рантайма веб-приложения.
	// Метод this.bind() заменяет контекст у функции на глобальный объект веб-приложения
	this.init = this.bind(function(initData) {
		var path = '/',
			template,
			view;

		// Проверяем создан ли кастомный обработчик ошибок
		if (this.errorHandler && typeof(this.errorHandler) === 'function') {
			// Если не создан, то записываем его на прямую
			if (!window.onerror) {
				window.onerror = this.bind(this.errorHandler, this);
			} else {
				// Если есть уже какой-то обработчик то мы делаем обертку которая при
				// вызове сначала вызовет старый обработчик с переданными параметрами
				// и лишь потом будет вызван наш обработчик
				var oldHandler = window.onerror;

				window.onerror = this.bind(function() {
					oldHandler.apply(window, arguments);
					this.errorHandler.apply(this, arguments);
				}, this);
			}
		}

		// Проверяем если this.beforeInit функция, то делаем его вызов с параметрами переданными 
		// в метод this.init()
		if (typeof(this.beforeInit) === 'function') {
			this.beforeInit.apply(this, arguments);
		}

		// Если в настройках загрузчкика указан кастомный пусть запуска вебприложения то записываем его 
		// в переменную path для дальнейшей проверки
		try {
			if (this.loadOptions.locations.customPath) {
				path = this.loadOptions.locations.customPath;
			}
		} catch(e) {}

		// Регистрируем короткую ссылку на колекцию псевдонимов (алиасов)
		this.aliases = this.links();

		// Если у нас существует конструктор роутинга, то расширяем его прототип
		if (this.Routers.Workspace) {
			// Прописываем главной вью ссылку на объект веб-приложения
			this.Routers.Workspace.prototype.core = this;
			this.Routers.Workspace.prototype.__bind = this.bind;
			this.Routers.Workspace.prototype.__links = this.bind(this.links, this);
			this.Routers.Workspace.prototype.__aliases = this.aliases;

			// Инициализируем инстанс роутинга, сохраняя его в переменную this.router для быстрого доступа
			this.router = new this.Routers.Workspace();

			// Вызываем метод для создания бандлов используемых в веб-приложении передавая аргументом 
			// данные для бутстрапа
			try {
				this.router.createBundles(initData);
			} catch(e) {
				// Если упало создание какого-то бандла то об этом точно стоит знать
				throw(e);
			}
		}

		// Делаем прекомпиляцию и кеширование шаблонов у зарегистрированных в приложении вьюх
		for (view in this.Views) {
			if (this.Views.hasOwnProperty(view)) {
				template = this.Views[view].prototype.template;

				if (typeof(template) === 'string') {
					this.Templates[template] = this.compileTemplate(template);
				}
			}
		}

		// Если у нас существует конструктор главной вью, то расширяем его прототип
		if (this.Views.Workspace) {
			// Прописываем главной вью ссылку на объект веб-приложения
			this.Views.Workspace.prototype.core = this;
			this.Views.Workspace.prototype.__bind = this.bind;
			this.Views.Workspace.prototype.__links = this.bind(this.links, this);
			this.Views.Workspace.prototype.__aliases = this.aliases;

			// Инициализируем инстанс главной вью, сохраняя его в переменную this.view для быстрого доступа
			this.view = new this.Views.Workspace();
		}

		// Если в главной вью есть метод view.setListeners() который навешивает глобальный события, то 
		// выполняем его.
		this.view && this.view.setListeners && this.view.setListeners();

		// Инициализируем ядро backbone.js
		this.global.Backbone.history.start({
			root: path,
			core: this
		});

		// Проверяем если this.afterInit функция, то делаем его вызов с параметрами переданными 
		// в метод this.init()
		if (typeof(this.afterInit) === 'function') {
			this.afterInit.apply(this, arguments);
		}

		// Если включен режим дебага, то возвращаем весь объект веб-приложения
		if (this.debugMode && !this.strictMode) {
			return this;
		}

		// По умолчанию возвращаем версию библиотеки Marrow
		return {
			version: this.version
		};
	}, this);
};

// Указываем прототип у объекта веб-приложения
window['WebApp']['App'].prototype = window['WebApp']['Core'];