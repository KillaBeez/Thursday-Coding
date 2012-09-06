App.Routers.Workspace = App.global.Backbone.Router.extend({
	defaultPage: 'index',
	namedParam: /:\w+/g,
	splatParam: /\*\w+/g,
	escapeRegExp: /[-[\]{}()+?.,\\^$|#\s]/g,

	routes: {
		'': 'index',
		'index': 'index',
		':page': 'processWrongRoute'
	},

	initialize: function() {
		this.prevRoute = '';
		this.currentRoute = '';
	},

	// Метод для инициализации бандлов. Вызывается после инициализации роутера
	createBundles: function(initData) {
		this.core
			.set('List')
			.set('Item');

			// Создаем источники данных
			/*.set('User', {
				view: NO,
				initData: initData.User
			})

			// Создаем вью
			.set('Popup', {
				model: NO,
				multiple: YES
			})
			.set('Hint', {
				model: NO,
				multiple: YES
			})
			.set('Pad', {
				model: NO,
				multiple: YES
			});*/
	},

	processWrongRoute: function(page) {
		this.navigate(this.defaultPage);
	},

	checkData: function(route) {
		return YES;
	},

	index: function() {
		var name = 'index',
			location = [name];

		if (this.checkData(name)) {
			this.navigate(location.join('/'));
			this.core
				.unload()
				.renderStream(['List', 'Item']);
		}
	}
});
