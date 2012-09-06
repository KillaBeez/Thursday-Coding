App.Models.ListItem = App.global.Backbone.Model.extend({
	idAttribute: 'Id',

	url: function(method) {
		var url = this.core.hosts.request;
		
		switch(method) {
			case 'delete':
				url += '';
				break;
		}
		return url;
	},

	defaults: {
		Id: null,
		Title: null,
		Description: null,
		_active: NO
	}
});