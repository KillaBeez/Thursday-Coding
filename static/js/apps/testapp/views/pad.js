App.Views.Pad = App.global.Backbone.View.extend({
	template: '#pad-template',

	events: {
		'click .b-numpad-el': 'onClick'
	},

	initialize: function() {
		this.caretPos = {};
		this.render();
		this.options.input.on('mouseup.' + this.__bundleName + ' keyup.' + this.__bundleName, this.__bind(function(event) {
			this.caretPos = this.options.input.caret();
		}, this))
	},

	render: function() {
		this.$el.html(this.template());
	},

	beforeUnload: function() {
		this.options.input.off('.' + this.__bundleName);
		return this;
	},

	onClick: function(event) {
		var trigger = $(event.currentTarget),
			digit = trigger.data('id');

		switch(digit) {
			case 'ok':
				if (typeof(this.options.onConfirm) === 'function') {
					this.options.onConfirm();
				}
				break
			case ',':
				if (!/,/.test(this.options.input.val())) {
					this.save(digit);
				}
				break
			default:
				this.save(digit);
				break
		}
	},

	save: function(value) {
		var input = this.options.input;

		input.caret(this.caretPos);
		this.caretPos = input.caret();
		this.caretPos.start++;
		this.caretPos.end++;

		input
			.val(this.caretPos.replace(value))
			.caret(this.caretPos);
	}
});
