App.Models.List = App.global.Backbone.Model.extend({
	url: function(method) {
		var url = this.core.hosts.request;
		
		switch(method) {
			case 'read':
				url += 'List/Get';
				break;
			case 'delete':
				url += '';
				break;
		}
		return url;
	},

	defaults: {
		q: ''
	},

	selectItem: function(id) {
		this.list.map(function(item) {
			item.set('_active', item.id == id);
		});
	},

	initialize: function() {
		this.list = this.core.setCollection('Lists');

		this.on('change:q', function(model, value, options) {
			this.trigger('list:render');
		});

		this.list
			.on('change:_active', function(model, value) {
				this.core.observatory.trigger('list:item_select', [model.id, value]);
			}, this)
			.on('reset', function() {
				this.trigger('list:render');
			}, this);
	},

	getData: function() {
		var q = this.get('q'),
			data = _.filter(this.list.toJSON(), function(item) {
				return item.Title.indexOf(q) >= 0;
			});

		return {
			list: data
		};
	},

	updateModel: function(key, attr, value, element) {
		this.set(key, value);
	},

	parse: function(response, xhr) {
		if (response.Success) {
			this.list.reset(response.Response);
		}
	}
});