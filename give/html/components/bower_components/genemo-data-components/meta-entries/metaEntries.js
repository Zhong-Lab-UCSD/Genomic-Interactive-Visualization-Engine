// JavaScript Document
var GIVe = (function(give) {
	'use strict';

	give.MetaEntries = function(url) {
		this.url = url || give.MetaEntries.defaultUrl;
		this.isReady = false;
		this.entries = {};
		give.postAjax(this.url, null, this.responseHandler, 'text', 'GET', null, this);
	};
	
	give.MetaEntries.prototype.responseHandler = function(response) {
		if(response) {
			// file is available
			var metaTxtArray = response.split("\n");	// break into lines
			while(metaTxtArray.length > 0) {
				var newEntry = this.getMetaEntry(metaTxtArray);
				if(newEntry) {
					if(!this.entries[newEntry.organism.toLowerCase()]) {
						this.entries[newEntry.organism.toLowerCase()] = {};
					}
					this.entries[newEntry.organism.toLowerCase()][newEntry.term] = newEntry;
				}
			}
		}
		this.isReady = true;
		this.fire('species-ready');
	};
		
	give.MetaEntries.prototype.findMeta = function(organism, term, key) {
		if(this.entries[organism] && this.entries[organism][term]) {
			return this.entries[organism][term][key];
		}
		return null;
	};
		
	give.MetaEntries.prototype.getMetaEntry = function(strArray) {
		var isReady = false;
		var result = {};			// all meta properties
		while(strArray.length > 0) {
			var line = strArray.shift();
			if(line && !line.startsWith('#')) {
				// not empty line or comment
				var tokens = line.split(/\s+/);
				var key = tokens.shift().toLowerCase(), value = tokens.join(' ');
				result[key] = value;
				if (key === 'type' && value === 'Cell Line') {
					isReady = true;
					// this is because 'type Cell Line' is required per ENCODE cell line standard
				}
			} else if (!line) {
				// empty line, 
				// if this.isReady = true, then this entry is done
				if (isReady) {
					break;
				}
			}
		}
		return isReady? result: null;
	};
			
	give.MetaEntries.defaultUrl = '/genemo-assets/encodeDCC/cv.ra';
		
	return give;

})(GIVe || {});
