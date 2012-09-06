// Список файлов необходимый для работы веб-приложения
window.TestApp.resources = {
	common: [
		{
			load: [
				'main.css'
			]
		},
		{
			load: [
				'libs/jquery/jquery.mockjson.js',
				'libs/jquery/jquery.caret.min.js',

				// Подгружаем правила шаблонизации для mockJSON
				'tests/mock.js'
			]
		}
	],
	app: [
		{
			load: [
				// Libs Section
				'libs/hcf-layout.js',

				// Models Section
				'models/list.js',
				'models/item.js',
				'models/list_item.js',

				// Collections Section
				'collections/lists.js',

				// Views Section
				'views/list.js',
				'views/item.js'
			]
		}
	]
};