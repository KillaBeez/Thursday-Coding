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
				//'models/user.js',

				// Collections Section
				//'collections/works.js',

				// Views Section
				//'views/popup.js',
			]
		}
	]
};