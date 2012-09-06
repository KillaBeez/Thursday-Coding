App.Models.Item = App.global.Backbone.Model.extend({
	idAttribute: 'Id',

	url: function(method) {
		var url = this.core.hosts.request;

		switch(method) {
			case 'read':
				url += 'Item/Get';
				break;
			case 'delete':
				url += '';
				break;
		}
		return url;
	},

	defaults: {
		Id: null,
		Title: null,
		Description: null
	},

	initialize: function() {
		this.on('change:Id', function() {
			this.fetch();
		}, this);

		this.core.observatory.on('list:item_select', function(event, id) {
			this.set('Id', id);
		}, this);
	},

	getData: function() {
		return this.toJSON();
	},

	processRequestData: function(data, method) {
		switch(method) {
			case 'read':
				data = {
					Id: data.Id
				}
				break;
			case 'delete':
				url += '';
				break;
		}
		return data;
	},

	parse: function(response, xhr) {
		if (response.Success) {
			delete response.Response.Id;
			return response.Response;
		}
	}
});