//$.mockJSON.random = false;
$.mockJSON(/List\/Get/, {
	'Success': true,
	'Response|5-10': [{
		'Id|8-8': '@LETTER_UPPER@NUMBER@LETTER_LOWER',
		'Title|2-4': '@LOREM',
		'Description': '@LOREM_IPSUM'
	}]
});

$.mockJSON(/Item\/Get/, {
	'Success': true,
	'Response': {
		'Id|8-8': '@LETTER_UPPER@NUMBER@LETTER_LOWER',
		'Title|2-4': '@LOREM',
		'Description': '@LOREM_IPSUM',
		'Image': 'static/img/photos/product_1.jpg',
		'Price|1000-9000': 0,
		'Comments|5-10': [{
			'Id|8-8': '@LETTER_UPPER@NUMBER@LETTER_LOWER',
			'Title|2-4': '@MALE_FIRST_NAME @LAST_NAME',
			'Description': '@LOREM_IPSUM'
		}]
	}
});

$.mockJSON(/Item\/Edit/, {
	'Success': true,
	'Response': null
});

$.mockJSON(/Item\/Delete/, {
	'Success': true,
	'Response': null
});