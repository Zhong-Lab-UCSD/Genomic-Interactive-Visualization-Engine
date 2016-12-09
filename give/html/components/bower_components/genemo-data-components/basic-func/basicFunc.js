var GIVe = (function(give) {
	'use strict';
	
	give.VERBOSE_MAJ_ERROR = 1;
	give.VERBOSE_MIN_ERROR = 2;
	give.VERBOSE_WARNING = 3;
	give.VERBOSE_DEBUG = 4;
	give.VERBOSE_DEBUG_MORE = 5;
	
	give.verboseLvl = give.VERBOSE_DEBUG;
	
	give.extend = function(base, sub) {
		sub.prototype = Object.create(base.prototype);
		sub.prototype.constructor = sub;
	};
	
	give._debounceIDList = {};
	give._timeOutFunc = function(debounceList, jobName, callbackFunc, immediate) {
		if(!immediate) {
			callbackFunc();
		}
		delete debounceList[jobName];
	};
	
	give._addDebouncer = function(debounceList, jobName, callbackFunc, interval, immediate) {
		if(immediate) {
			callbackFunc();
		}
		debounceList[jobName] = window.setTimeout(
			give._timeOutFunc.bind(this, debounceList, jobName, callbackFunc, immediate), 
			interval);
	};
	
	give.debounce = function(jobName, callback, interval, immediate) {
		if(give._debounceIDList.hasOwnProperty(jobName)) {
			if(!immediate) {
				give.cancelDebouncer(jobName);
				give._addDebouncer(give._debounceIDList, jobName, callback, interval, immediate);
			}
		} else {
			give._addDebouncer(give._debounceIDList, jobName, callback, interval, immediate);
		}
	};
	
	give.cancelDebouncer = function(jobName) {
		if(give._debounceIDList.hasOwnProperty(jobName)) {
			window.clearTimeout(give._debounceIDList[jobName]);
			delete give._debounceIDList[jobName];
		}
	};
	
	give.isDebouncerActive = function(jobName) {
		return give._debounceIDList.hasOwnProperty(jobName);
	};
	
	give.locationOf = give.locationOf || function(element, array, start, end, compareFunc) {
		// this is to return the index that element will be put AFTER
		// so if the element needs to be put to the top, it will return start-1
		if (array.length === 0) {
			return -1;
		}

		start = start || 0;
		end = end || array.length;
		var pivot = parseInt((start + end) / 2);  // = parseInt((start + end) / 2)

		var comp = compareFunc(element, array[pivot]);
		if (end - start <= 1) {
			return (comp === -1) ? pivot - 1 : pivot;
		}

		switch (comp) {
			case -1: return give.locationOf(element, array, start, pivot, compareFunc);
			case 0: return pivot;
			case 1: return give.locationOf(element, array, pivot, end, compareFunc);
		}
	};
	
	give.postAjax = give.postAjax || function(target, params, responseFunc, responseType, method, errorFunc, thisVar) {
		// this is a wrapper for Ajax calls throughout GIVe
		method = method || 'POST';
		var xhr = new XMLHttpRequest();
		xhr.responseType = responseType || '';
		xhr.onload = function() {
			var responses = xhr.response;
			if((xhr.status >= 200 && xhr.status < 400) && 
			   xhr.responseType.toLowerCase() === 'json' &&
			   (navigator.appName === 'Microsoft Internet Explorer' ||
				!!(navigator.userAgent.match(/Trident/) ||
				   navigator.userAgent.match(/rv 11/)))) {
					// IE detected (should be IE 11), fix the json return issue
					console.log('You are currently using IE 11 to visit this site. Some part of the site may behave differently and if you encounter any problems, please use the info on \'About us\' page to contact us.');
					responses = JSON.parse(responses);
			}			
			responseFunc.call(thisVar, responses, xhr.status);
		};
		xhr.onerror = function() {
			errorFunc.call(thisVar, xhr.status);
		};
		xhr.open(method, target);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.send(JSON.stringify(params));
	};
	
	give.fireCoreSignal = function(signame, sigdata) {
		// fire iron-signals
		give.fireSignal('iron-signal', {bubbles: true, cancelable: true, detail: {name: signame, data: sigdata}}, document.body);
	};
	
	give.fireSignal = function(evName, sigParams, elem) {
		var newEvent;
		if(navigator.appName === 'Microsoft Internet Explorer' ||
				!!(navigator.userAgent.match(/Trident/) ||
				   navigator.userAgent.match(/rv 11/))) {
			newEvent = document.createEvent('CustomEvent');
			newEvent.initCustomEvent(evName, 
									 sigParams && sigParams.bubbles, 
									 sigParams && sigParams.cancelable, 
									 (sigParams && sigParams.detail)? sigParams.detail: null);
		} else {
			newEvent = new CustomEvent(evName, sigParams);
		}
		((elem && elem.dispatchEvent)? elem: document.body).dispatchEvent(newEvent);
	};
	
	return give;
}) (GIVe || {});
