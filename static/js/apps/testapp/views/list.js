App.Views.List = App.global.Backbone.View.extend({
	className: 'b-list',
	template: '#list-template',

	events: {
		'click .b-list_item': 'selectItem'
	},

	initialize: function() {
		this.options.eventProxy.on('list:render', this.render, this);

		this.core.observatory.on('list:item_select', this.setActive, this);

		this.bindData();
		this.model.fetch();
	},

	render: function() {
		console.log(123);
		this.$el
			.html(this.template(this.model.getData()))
			.appendTo(this.__aliases.layouts.contents);
	},

	setActive: function(event, id, state) {
		this.$('#list-item-' + id).toggleClass('b-active', !!state);
	},

	selectItem: function(event) {
		var target = $(event.currentTarget)

		this.model.selectItem(target.data('id'));
		return NO;
	},

	beforeUnload: function() {
		this.options.eventProxy.off();
		return this;
	}
});