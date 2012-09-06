App.Models.User = App.global.Backbone.Model.extend({
	/*url: function() {
		var flagList = {
				control_changed: function() {
					return this.core.hosts.request + 'Policy/ControlChanged';
				}
			},
			action = flagList[this.action] || function() {
				return this.core.hosts.request;
			};

		return action();
	},
	action: null,*/

	defaults: {
		FirstName: null,
		LastName: null,
		Email: null
	},

	getData: function() {
		return this.toJSON();
	}/*,

	parse: function(response, xhr) {
		xhr.userData || (xhr.userData = {});

		var actionName = xhr.userData.action,
			actionList = {
				control_changed: function(data, xhr) {
					var changedItems = [];

					if (data.ChangedItems) {
						$(data.ChangedItems).each(function(i, item) {
							if (exeptionList[item.Name]) {
								var dummy = {},
									modelItem = exeptionList[item.Name].attributes[item.Name];

								for (var key in item) {
									if (item.hasOwnProperty(key) && item[key] == null) {
										item[key] = modelItem[key];
									}
								}
								dummy[item.Name] = item;
								exeptionList[item.Name].set(dummy);
							} else {
								changedItems.push(item);
							}
						});
						data.ChangedItems = changedItems;
					}
					Calc.parseResponse.apply(this, arguments);
				}
			},
			action = actionList[actionName || this.action] || function() {};

		this.action = null;
		return action.apply(this, arguments);
	}*/
});
