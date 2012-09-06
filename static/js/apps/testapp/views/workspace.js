App.Views.Workspace = App.global.Backbone.View.extend({
	className: 'l-content-container l-content',
	template: '#workspace-template',

	initialize: function() {
		this.layouts = {};

		// Регистрируем кастомные анимации для $.transit
		$.cssEase['bounce'] = 'cubic-bezier(0,1,0.5,1.3)';

		// Создаем кастомные хелперы которые будут использоваться шаблонизации приложения
		this.createTemplateHelpers();

		// Отрисовываем главную вью создавая каркас приложения
		this.render();

		// Навешиваем класс говорящий о том что приложение полностью инициализировалось
		this.core.container.addClass('l-app_is_ready');
	},

	setListeners: function() {
		this.core.router.on('route:after_change', this.onChangeRoute, this);
	},

	onMouseDown: function(event) {
		this.core.observatory.trigger('global.mousedown', event);
	},

	render: function() {
		this.$el
			.append(this.template())
			.appendTo(this.core.container);

		// Создаем объект лэйаута с сылками на ключевые элементы
		this.layouts = {
			header: this.$el.find('#l-header'),
			contents: this.$el.find('#l-body'),
			footer: this.$el.find('#l-footer'),
			start: this.__bind(function() {
				this.recalc();
			}, this),
			stop: this.__bind(function() {
				this.recalc(YES);
			}, this)
		};

		// Создаем ссылки в App.aliases на список лэйаутов и метод пересчета лэйаута
		this.__links('layouts', this.layouts);
		this.__links('recalc', this.__bind(this.recalc, this));
	},

	recalc: function(reset) {
		var footerHeight = reset ? 0 : this.layouts.footer.outerHeight();

		this.layouts.footer.css({
			height: footerHeight,
			marginTop: -footerHeight
		});
		this.layouts.contents.css('padding-bottom', footerHeight);
	},

	onChangeRoute: function(prevRoute, newRoute) {
		this.core.container
			.removeClass('l-' + prevRoute + '_route')
			.addClass('l-' + newRoute + '_route');
		this.recalc();
	},

	createTemplateHelpers: function() {
		var photo = this.core.compileTemplate('#photo-template'),
			switcher = this.core.compileTemplate('#switcher-template'),
			infoPhoto = this.core.compileTemplate('#info-photo-template');

		Handlebars.registerHelper('photo', function(data, options) {
			data || (data = {});
			options || (options = {});

			for (var key in options.hash) {
				if (options.hash.hasOwnProperty(key)) {
					data[key] = options.hash[key];
				}
			}

			// Для унификации работы с шаблоном прокидываем объект position в основной объект
			if (data.position != null) {
				for (var key in data.position) {
					if (data.position.hasOwnProperty(key)) {
						data[key] = data.position[key];
					}
				}
			}

			// Добавление обработки итеративных классов для ускорения выборок DOM элементов с кешированием
			if (data.iterateClass != null) {
				if (typeof(data.className) !== 'string') {
					options.hash.className = '';
				}
				data.className += ' b-photo-id' + data.id;
			}
			return new Handlebars.SafeString(photo(data));
		});

		Handlebars.registerHelper('switcher', function(data, options) {
			return new Handlebars.SafeString(switcher(data));
		});

		Handlebars.registerHelper('infoPhoto', function(data, options) {
			return new Handlebars.SafeString(infoPhoto(data));
		});
	}
});