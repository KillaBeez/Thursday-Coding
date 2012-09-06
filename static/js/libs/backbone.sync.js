// version: 1.0.120904
Backbone.sync = (function() {
	var methodMap = {
			'create': 'POST',
			'update': 'POST',
			'delete': 'POST',
			'read': 'GET'
		},
		reqCollection = {},

		// Метод getValue отличается от того что присутвует в Backbone.js тем что может принимать 
		// третьим аргументом один параметр, который нужно передать в функцию если получаемое значение 
		// хранится не как строка
		getValue = function (object, prop, param) {
			if (!(object && object[prop])) return null;
			return _.isFunction(object[prop]) ? object[prop](param) : object[prop];
		},
		urlError = function () {
			throw new Error('A "url" property or function must be specified');
		};

	return function (method, model, options) {
		var abortReqFlag = method == 'abort',
			type = methodMap[method],
			params = {
				type: type,
				dataType: 'json'
			},
			modelParams,
			urlParams,
			req;

		// Default options, unless specified.
		options || (options = {});

		// Если у нас вызван Backbone.sync с методом abort или в опциях передан параметр abortPrevReq, то 
		// для указанной модели мы обрываем все активные запросы и вычищаем коллекцию уже сделанных 
		// запросов
		if (abortReqFlag || options.abortPrevReq) {
			var list = reqCollection[model.cid];

			if (list) {
				for (var i = 0, length = list.length; i < length; i++) {
					try {
						list[i].abort();
					} catch(e) {};
				}
			}
			delete reqCollection[model.cid];

			// Если Backbone.sync с методом abort, то нет нужды продолжать и мы выходим из метода
			if (abortReqFlag) {
				return;
			}
		}

		// Ensure that we have a URL.
		if (!options.url) {
			params.url = getValue(model, 'url', method) || urlError();
		}

		// Если мы делаем запрос фетчем то вызываем метод model.toReqJSON() и полученные данные 
		// добавляем к урлу
		if (method == 'read') {
			urlParams = params.url.split('?');
			modelParams = $.param(model.toReqJSON(method)) + (urlParams[1] || '');

			if (modelParams) {
				urlParams.push(modelParams);
			}
			params.url = urlParams.join('?');

			// Переопределяем метод success для добавления события receive аналогичное событию sync только 
			// для метода fetch
			options.success = (function(fn, model, options) {
				return function(resp, status, xhr) {
					var data = fn.apply(this, arguments);

					model.trigger('receive', model, resp, options);
					return data;
				}
			})(options.success, model, options);
		} else {
			// Ensure that we have the appropriate request data.
			if (!options.data && model) {
				params.contentType = 'application/json';
				params.data = JSON.stringify(model.toReqJSON(method));
			}
		}

		// For older servers, emulate JSON by encoding the request into an HTML-form.
		if (Backbone.emulateJSON) {
			params.contentType = 'application/x-www-form-urlencoded';
			params.data = params.data ? {
				model: params.data
			} : {};
		}

		// For older servers, emulate HTTP by mimicking the HTTP method with `_method`
		// And an `X-HTTP-Method-Override` header.
		if (Backbone.emulateHTTP) {
			if (type === 'PUT' || type === 'DELETE') {
				if (Backbone.emulateJSON) params.data._method = type;
				params.type = 'POST';
				params.beforeSend = function (xhr) {
					xhr.setRequestHeader('X-HTTP-Method-Override', type);
				};
			}
		}

		// Don't process data on a non-GET request.
		if (params.type !== 'GET' && !Backbone.emulateJSON) {
			params.processData = false;
		}

		// Для того чтоб метод parse в источниках данных можно было как-нить кастомизировать в 
		// зависимости от типа запроса
		options.beforeSend = (function(fn) {
			return function(jqXHR, settings) {
				if (jqXHR) {
					jqXHR.syncMethod = method;
				}

				if (typeof(fn) === 'function') {
					return fn.apply(this, arguments);
				}
			};
		})(options.beforeSend);

		if (!reqCollection[model.cid]) {
			reqCollection[model.cid] = [];
		}
		req = $.ajax(_.extend(params, options));
		reqCollection[model.cid].push(req);

		// Make the request, allowing the user to override any Ajax options.
		return req;
	};
})();