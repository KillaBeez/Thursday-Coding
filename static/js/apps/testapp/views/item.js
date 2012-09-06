App.Views.Item = App.global.Backbone.View.extend({
	className: 'b-list',
	template: '#item-template',

	events: {},

	initialize: function() {
		this.options.eventProxy.on('change:Title', this.render, this);
	},

	render: function() {
		this.$el
			.html(this.template(this.model.getData()))
			.appendTo(this.__aliases.layouts.contents);
	},

	beforeUnload: function() {
		this.options.eventProxy.off();
		return this;
	}
});