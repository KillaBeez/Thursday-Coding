App.Views.Popup = App.global.Backbone.View.extend({
	className: 'b-popup-wrapper',
	template: '#popup-template',

	events: {
		'click .b-close': 'unload'
	},

	initialize: function() {
		this.contentBundle = null;

		// Навешиваем событие на глобальное выстреливание mousedown
		$(this.__document)
			.on('mousedown.' + this.__bundleName, this.__bind(this.onMouseDown, this))
			.on('keyup.' + this.__bundleName, this.__bind(function(event) {
				if (event.keyCode == 27) {
					this.unload();
				}
			}, this));
		this.core.observatory.on('load:popup_content', this.setPosition, this);
		this.render();
	},

	render: function() {
		var container = this.$el,
			bundleParams = this.options.bundleParams || {};

		container
			.html(this.template())
			.appendTo(this.core.container)
			.transition({
				opacity: 1
			})
			.addClass(this.options.popupClassName || '');

		this.popupEl = this.$('.b-grey_popup');
		this.setPosition();

		if (this.options.bundleName && !this.core.get(this.options.bundleName).isDummy) {
			// Создаем вью содержимого и сохраняем ее в переменную this.contentBundle
			this.contentBundle = this.core.render(this.options.bundleName, $.extend({
				container: container.find('.b-popup-content')[0]
			}, bundleParams));
		}
	},

	beforeUnload: function() {
		$(this.__document).off('.' + this.__bundleName);
		this.core.observatory.off('load:popup_content');
		return this;
	},

	remove: function() {
		var container = this.$el,
			content = this.contentBundle,
			isRendered = !!container.closest('body').length,
			name = this.options.bundleName;

		if (isRendered) {
			container.transition({
				opacity: 0
			}, function() {
				content && content.view && content.view.unload && content.view.unload();
				container.remove();
			});
		}
		return this;
	},

	onMouseDown: function(event) {
		var target = $(event.target);

		if (!target.closest('.b-popup-wrapper').length) {
			this.unload();
		}
	},

	// Позиционирование попапа относительно цента экрана
	setPosition: function() {
		this.popupEl.css('width', -this.popupEl.outerWidth() / 2);
	}
});