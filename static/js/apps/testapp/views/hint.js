/** Описание возможных параметров:
 * 
 * this.options = {
 *     // Ссылка на переменную в которую будет сохранен апи по работе с вызваным хинтом
 *     api: link,
 * 
 *     // Текст необходимый отобразить в хинте. Имеет минимальный приоритет отрисовки если передан 
 *     // innerHTML или innerView
 *     text: '',
 * 
 *     // Ссылка на элемент относительно которого нужно спозиционировать хинт
 *     target: $el/el/coords -> ({x:num, y:num}),
 * 
 *     // Если необходимо отображать хинт при работе с большими списками, то удобнее и 
 *     // производительней будет использовать фабрику хинтов, при создании которой будут создаваться 
 *     // свои делегированные события и вестись обработка отображения и позиционирования хинтов 
 *     // внитри самой вью.
 *     targetFabric: {
 *         container: $el,
 *         target: selectors,
 *         parent: selector,
 *         timeout: miliseconds
 *     },
 * 
 *     // Дополнительный класс добавляемый на контейнер хинта. Необходим для кастомной стилизации 
 *     // хинта
 *     customClassName: '',
 * 
 *     // Верстка вставляемая в хинт. Имеет средний приоритет если передан text или innerView
 *     innerHTML: '',
 * 
 *     // Строковое название вью для вставки в хинт. Имеет максимальный приоритет если передан text 
 *     // или innerHTML
 *     innerView: '', 
 * 
 *     // Параметры передаваемые во вставляемую вью при инициализации
 *     innerViewParams: {},
 * 
 *     // Позиция хинта относительно элемента-цели
 *     position: 'left/top/right/bottom/custom',
 * 
 *     // Смещение хинта по горизонтали и вертикали
 *     shift: {
 *         x: 0,
 *         y: 0
 *     },
 * 
 *     // Способ анимации при показе хинта
 *     animate: 'fade/scale/',
 * 
 *     // Если вызывается хинт для одного и того же элемента с одними и теми же опциями то этот 
 *     // параметр определяет что делать в таком случае скрывать или игнорировать вызов
 *     onRepeat: 'close/ignore',
 *     events: {
 *         // Если передан true то хинт скроется при нажатии кнопки Esc.
 *         // Если передана функция то хинт закроется только если функция вернет значение равное true.
 *         closeOnEsc: fn()/bool,
 * 
 *         // Если передан true то хинт скроется при клике в любом месте кроме этого хинта.
 *         // Если передана функция то хинт закроется только если функция вернет значение равное true.
 *         closeOnClick: fn()/bool,
 * 
 *         // Если передана функция то хинт закроется только если функция вернет значение равное true.
 *         closeOnKeypress: fn(),
 * 
 *         // Обработчик по закрытию хинта
 *         onClose: fn()
 *     }
 */

App.Views.Hint = App.global.Backbone.View.extend({
	className: 'b-hint',
	template: '#hint-template',

	// Глобальная коллекция хинтов
	hintsCache: {},

	createFakeTarget: function(options) {
		options || (options = {});
		return {
			0: {},
			dimensions: {
				top: options.y || 0,
				left: options.x || 0
			},
			outerWidth: function() {
				return 1;
			},
			outerHeight: function() {
				return 1;
			},
			offset: function() {
				return this.dimensions;
			}
		};
	},

	initialize: function() {
		var events = this.options.events || {},
			target = this.options.target;

		this.isFabric = NO;
		this.content = null;
		this.innerView = null;
		this.core.hintIdCount || (this.core.hintIdCount = 1);

		if (target) {
			if (target.x && target.y && !(target instanceof $)) {
				this.target = this.createFakeTarget(target);
			} else {
				this.target = $(target);
			}
		} else if (this.options.targetFabric) {
			this.target = this.initializeFabric();
		} else {
			this.unload();
			return NO;
		}

		// Приводиим значения параметров смещения в нужный формат
		this.options.shift = $.extend({
			x: 0,
			y: 0
		}, this.options.shift);

		// генерируем уникальный хеш на основе переданных параметров и цели
		this.hintHash = this.createHashString();

		// Проверяем по кешу хинтов был ли у нас хинт с текущими настройками отрисован
		if (this.hintsCache[this.hintHash]) {
			switch (this.options.onRepeat) {
				case 'ignore':
					this.unload();
					return NO;
					break
				default:
					this.hide.apply(this.hintsCache[this.hintHash]);
					break
			}
		}

		// Записываем в кеш текущий бандл, который мы отрисовываем
		this.hintsCache[this.hintHash] = this;

		// Если переданны дополнительные классы то навешиваем их на контейнер хинта
		if (this.options.customClassName) {
			this.$el.addClass(this.options.customClassName);
		}

		// Отрисовываем хинт
		this.render();
		this.arrow = this.$el.find('.b-hint-corner_container');

		// Если не используется фабрика хинтов то позиционируем и показываем хинт
		if (!this.isFabric) {
			// Позиционируем хинт относительно элемента-цели учитывая параметры позиционирования
			this.positionHint(this.options.position);
			this.show();
		}

		// Навешиваем обработчики событий события
		if (events.closeOnEsc) {
			switch (typeof(events.closeOnEsc)) {
				case 'function':
					$(this.__document).on('keyup.' + this.__bundleName, this.__bind(function(event) {
						if (event.keyCode == 27) {
							if (!!events.closeOnEsc(event, event.keyCode)) {
								this.hide();
							}
						}
					}, this));
					break
				case 'boolean':
					$(this.__document).on('keyup.hint_view', this.__bind(function(event) {
						if (event.keyCode == 27) {
							this.hide();
						}
					}, this));
					break
			}
		}

		if (events.closeOnClick) {
			switch (typeof(events.closeOnClick)) {
				case 'function':
					$(this.__document).on('mousedown.' + this.__bundleName, this.__bind(function(event) {
						if (!$(event.target).closest(this.$el).length) {
							if (!!events.closeOnClick(event)) {
								this.hide();
							}
						}
					}, this));
					break
				case 'boolean':
					$(this.__document).on('mousedown.' + this.__bundleName, this.__bind(function(event) {
						if (!$(event.target).closest(this.$el).length) {
							this.hide();
						}
					}, this));
					break
			}
		}

		if (typeof(events.closeOnKeypress) === 'function') {
			$(this.__document).on('keypress.' + this.__bundleName, this.__bind(function(event) {
				if (!!events.closeOnKeypress(event)) {
					this.hide();
				}
			}, this));
		}

		if (typeof(this.options.api) === 'function') {
			this.options.api({
				el: this.$el,
				id: this.hintHash,
				target: this.target,
				remove: this.__bind(this.hide, this)
			});
		}
	},

	initializeFabric: function() {
		var options = this.options.targetFabric,
			target = this.createFakeTarget(),
			onEnter = function(event) {
				var trigger = $(event.target),
					parent = trigger.closest(options.parent),
					isHint;

				target.dimensions = {
					top: event.clientY,
					left: event.clientX
				};
				showTimer && clearTimeout(showTimer);

				if (hideTimer) {
					clearTimeout(hideTimer);
					hideTimer = null;
					isHint = !!trigger.closest(this.$el).length;

					if (prevParent && parent[0] != prevParent[0] && !isHint) {
						showTimer = setTimeout(this.__bind(function() {
							this.positionHint(this.options.position, target);
						}, this), options.timeout || 0);
					}
				} else {
					showTimer = setTimeout(this.__bind(function() {
						this.positionHint(this.options.position, target);
						this.show();
					}, this), options.timeout || 0);
				}
				prevParent = parent;
			},
			onLeave = function(event) {
				hideTimer && clearTimeout(hideTimer);
				hideTimer = setTimeout(this.__bind(function() {
					hideTimer = null;
					this.$el.fadeOut(200);
				}, this), 100);
			},
			prevParent = null,
			showTimer = null,
			hideTimer = null;

		// Выставляем флаг о том что мы используем фабрику хинтов
		this.isFabric = YES;

		// Навешиваем делегированные события отслеживания движение мышки на переданный контейнер и 
		// селекторы
		options.container
			.on('mouseenter.hint', options.target, this.__bind(onEnter, this))
			.on('mouseleave.hint', options.target, this.__bind(onLeave, this))
			.on('mousemove.hint', function(event) {
				target.dimensions = {
					top: event.clientY,
					left: event.clientX
				};
			});

		// Во избежание скрытия хинта при наведение на него самого навешиваем теже самые события и на сам 
		// хинт
		this.$el
			.on('mouseenter.hint', this.__bind(onEnter, this))
			.on('mouseleave.hint', this.__bind(onLeave, this));
		return options.container;
	},

	render: function() {
		var innerViewParams = this.options.innerViewParams || {},
			text = '' + this.options.text,
			content = '';

		this.content = this.$el
				.html(this.template())
				.appendTo(this.__aliases.layouts.contents)
				.find('.b-hint-content');

		// Добавляем метод unload в параметры отрисовываемой вью на случай если какие-то действия вью 
		// должны закрыть хинт со всем содержимым
		innerViewParams.unload = this.__bind(this.hide, this);

		if (this.options.innerView != null && !this.core.get(this.options.innerView).isDummy) {
			innerViewParams.el = this.content[0];
			this.innerView = this.core.render(this.options.innerView, innerViewParams).view;
		} else if (this.options.innerHTML != null && ('' + this.options.innerHTML).length) {
			content = this.options.innerHTML;
		} else {
			if (text == null || !text.length) {
				text = 'Empty hint';
			}
			content = text;
		}

		if (!this.content.children().length) {
			this.content.html(content);
		}
	},

	show: function(fxType) {
		switch (fxType || this.options.animate) {
			case 'scale':
				var shiftX = this.$el.width() / 2,
					shiftY = this.$el.height() / 2,
					direction = this.options.position || 'bottom';

				// Кастомная анимация для каждого из типов направлений
				switch (direction) {
					case 'bottom':
						this.$el
							.css({
								y: '-=' + shiftY,
								opacity: 0,
								scale: 0
							})
							.transition({
								y: '+=' + shiftY,
								opacity: 1,
								scale: 1
							}, 200);
						break
					case 'add-item-top-left':
						this.$el
							.css({
								x: '-=' + (shiftX - 15),
								y: '-=' + (shiftY - 15),
								opacity: 0,
								scale: 0
							})
							.transition({
								x: '+=' + (shiftX - 15),
								y: '+=' + (shiftY - 15),
								opacity: 1,
								scale: 1
							}, 400);
						break
					case 'show-item-bottom-right':
						this.$el
							.css({
								x: '+=' + (shiftX - 70),
								y: '+=' + (shiftY - 35),
								opacity: 0,
								scale: 0
							})
							.transition({
								x: '-=' + (shiftX - 70),
								y: '-=' + (shiftY - 35),
								opacity: 1,
								scale: 1
							}, 200);
						break
				}
				break
			default:
				// Скрываем хинт для последующей плавной анимации появления
				this.$el
					.hide()
					.fadeIn(200);
				break
		}
	},

	hide: function(fxType) {
		delete this.hintsCache[this.hintHash];
		switch (fxType || this.options.animate) {
			case 'scale':
				var shiftX = this.$el.width() / 2,
					shiftY = this.$el.height() / 2,
					direction = this.options.position || 'bottom';

				// Кастомная анимация для каждого из типов направлений
				switch (direction) {
					case 'bottom':
						this.$el
							.transition({
								y: '-=' + shiftY,
								opacity: 0,
								scale: 0
							}, 200, this.__bind(this.unload, this));
						break
					case 'add-item-top-left':
						this.$el
							.transition({
								x: '-=' + (shiftX - 15),
								y: '-=' + (shiftY - 15),
								opacity: 0,
								scale: 0
							}, 400, this.__bind(this.unload, this));
						break
					case 'show-item-bottom-right':
						this.$el
							.transition({
								x: '+=' + (shiftX - 70),
								y: '+=' + (shiftY - 35),
								opacity: 0,
								scale: 0
							}, 200, this.__bind(this.unload, this));
						break
				}
				break
			default:
				this.$el.fadeOut(this.__bind(this.unload, this));
				break
		}
	},

	beforeUnload: function() {
		var events = this.options.events || {};

		if (this.isFabric) {
			this.target.off('.hint');
			this.$el.off('.hint');
			this.isFabric = NO;
		}

		if (this.innerView) {
			this.innerView.unload();
			this.innerView = null;
		}

		// Выстреливаем событие о закрытии хинта
		if (typeof(events.onClose) === 'function') {
			events.onClose(this.hintHash);
		}
		$(this.__document).off('.' + this.__bundleName);
		return this;
	},

	createHashString: function() {
		if (!this.target) return;

		var hashParams = {
				id: $.data(this.target[0], 'hint-id'),
				text: this.options.text,
				customClassName: this.options.customClassName,
				innerHTML: this.options.innerHTML,
				innerView: this.options.innerView,
				position: this.options.position
			};

		if (hashParams.id == null) {
			hashParams.id = 'hint-id-' + this.core.hintIdCount;
			this.core.hintIdCount++;
			$.data(this.target[0], 'hint-id', hashParams.id);
		}
		return JSON.stringify(hashParams);
	},

	positionHint: function(direction, target) {
		target || (target = this.target);
		typeof(direction) !== 'string' && (direction = 'bottom');

		if (!target) return;

		var borderIndent = 10,
			elWidth = this.$el.outerWidth(),
			elHeight = this.$el.outerHeight(),
			targetWidth = target.outerWidth(),
			targetHeight = target.outerHeight(),
			targetOffset = target.offset(),
			containerOffset = this.__aliases.layouts.contents.offset(),
			windowWidth = this.__document.body.clientWidth,
			overShift = 0;

		switch (direction) {
			case 'bottom':
				targetOffset.top += targetHeight;
				targetOffset.top += 10; // 10px отступ для правильного позиционирования хинта вместе со стрелкой
				targetOffset.left -= containerOffset.left;

				// Позиционируем хинт по середине элемента-цели
				targetOffset.left -= elWidth / 2;
				targetOffset.left += targetWidth / 2;
				break
			case 'right-top':
				this.arrow.addClass('b-hint-corner_container--left');
				targetOffset.top -= 25; // 25px отступ от контрола
				targetOffset.left += targetWidth + borderIndent;
				break
			case 'add-item-top-left':
				targetOffset.top -= 5; // 5px отступ от контрола
				targetOffset.left -= 5 // 5px отступ от контрола
				targetOffset.left -= containerOffset.left;
				break
			case 'show-item-bottom-right':
				targetOffset.top -= elHeight;
				targetOffset.top += 40;
				targetOffset.left -= elWidth;
				targetOffset.left += targetWidth;
				targetOffset.left += 15;
				break
		}

		// Добавляем пользовательское смещение
		targetOffset.top += this.options.shift.y;
		targetOffset.left += this.options.shift.x;

		if (targetOffset.left < 0) {
			overShift = 0 - targetOffset.left + borderIndent;
		}

		if (targetOffset.left + elWidth > windowWidth) {
			overShift = windowWidth - (targetOffset.left + elWidth) - borderIndent;
		}
		targetOffset.left += overShift;

		if (direction != 'left' || direction != 'right') {
			this.arrow.css('margin-left', parseInt(this.arrow.css('margin-left'), 10) - overShift);
		}

		// Позиционируем хинт
		this.$el.css(targetOffset);
	}
});