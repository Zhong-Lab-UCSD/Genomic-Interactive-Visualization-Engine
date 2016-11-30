// JavaScript Document
var GIVe = (function(give) {
	'use strict';

	give.TrackObject = function(ID, Settings, species) {
		this.id = ID;
		this.Settings = this.Settings || Settings || {};
		this.Settings.settings = this.Settings.settings || {};
		this.species = species;
		this.priority = this.getSetting('priority') || give.TrackObject.DEFAULT_PRIORITY;
		this.info = "";				// reserved for "children"
		if(this.getSetting('visibility')) {
			this.setVisFromStr(this.getSetting('visibility'));
		} // otherwise leave it to DOM

		if(this.getSetting('requestUrl')) {
			this.requestUrl = this.getSetting('requestUrl');
		}

		if(this.getSetting('isCustom')) {
			this.isCustom = true;
			if(this.getSetting('localFile')) {
				// should be a File Object (extension of Blob)
				this.localFile = this.getSetting('localFile');
			} else if(this.getSetting('remoteUrl')) {
				// should be a URL
				this.remoteFile = this.getSetting('remoteUrl');
			}
		}

		this.getDataJobName = this.getID() + '_GETDATA';
		this.getDataDebounceInt = 200;
		this.pendingGUIRanges = [];
		this.data = {};
		
		this.callbackArray = [];
		this.callbackFuncs = {};
		
		this.isRetrivingData = false;

	};

	give.TrackObject.prototype.setVisFromStr = function(strStatus) {
		switch(strStatus) {
			case 'dense':
				this.setSetting('visibility', give.TrackObject.StatusEnum.VIS_DENSE);
				break;
			case 'full':
				this.setSetting('visibility', give.TrackObject.StatusEnum.VIS_FULL);
				break;
			case 'hide':
				this.setSetting('visibility', give.TrackObject.StatusEnum.VIS_NONE);
				break;
			case 'pack':
				this.setSetting('visibility', give.TrackObject.StatusEnum.VIS_PACK);
				break;
			case 'collapsed':
				this.setSetting('visibility', give.TrackObject.StatusEnum.VIS_COLLAPSED);
				break;
			case 'notext':
				this.setSetting('visibility', give.TrackObject.StatusEnum.VIS_NOTEXT);
				break;
			default:
		}
	};

	give.TrackObject.prototype.getUcscVis = function() {
		switch(this.getSetting('visibility')) {
			case give.TrackObject.StatusEnum.VIS_FULL:
				return 'full';
			case give.TrackObject.StatusEnum.VIS_DENSE:
				return 'dense';
			case give.TrackObject.StatusEnum.VIS_PACK:
				return 'pack';
			case give.TrackObject.StatusEnum.VIS_COLLAPSED:
				return 'collapsed';
			case give.TrackObject.StatusEnum.VIS_NOTEXT:
				return 'notext';
			default:
				return 'hide';
		}
	};

	give.TrackObject.prototype.setSetting = function(key, value) {
		if(this.Settings.hasOwnProperty(key)) {
			delete this.Settings[key];
		}
		this.Settings.settings[key] = value;
	};

	give.TrackObject.prototype.getSetting = function(key) {
		if(!this.Settings.settings.hasOwnProperty(key)) {
			if(this.Settings.hasOwnProperty(key)) {
				this.Settings.settings[key] = this.Settings[key];
			}
		}
		delete this.Settings[key];
		return this.Settings.settings[key];
	};

	//getInfo: function() {
	//	return "<td>" + this.info.replace(/\t/g, "</td>\n<td>") + "</td>";
	//};
	//
	//getInfoString: function() {
	//	return this.info.replace(/\t/g, ' - ');
	//};
	//
	give.TrackObject.prototype.getID = function() {
		return this.id;
	};

	give.TrackObject.prototype.getReadableID = function() {
		return this.getID().replace(/_+/g, ' ');
	};

	give.TrackObject.prototype.getType = function() {
		return this.getSetting('type');
	};

	give.TrackObject.prototype.getTypeTrunk = function() {
		return this.getSetting('type').split(/\s+/, 2)[0].toLowerCase();
	};

	give.TrackObject.prototype.getCleanID = function() {
		// remove blanks and brackets in IDs to conform to HTML 4.1
		return this.getID().replace(/[\s\(\)\+\/]/g, '');
	};

	give.TrackObject.prototype.getPriority = function() {
		// TODO: 
		//	1. implement group priority
		// 	2. implement customized temporary priority
		return this.priority;
	};

	give.TrackObject.prototype.getTrackUncachedRange = function() {
		// check whether buffer needs to be updated
		// notice that chrRanges should be an ordered, non-overlapping array of ChromRegionObject
		this.pendingQueryRegions = [];
		if(!this.isPureLocal && this.pendingGUIRanges && Array.isArray(this.pendingGUIRanges)) {
			this.pendingGUIRanges.forEach(function(chrRange) {
				if(this.data[chrRange.chr] && this.data[chrRange.chr].getUncachedRange) {
					var resolutionFunc = (typeof this.resolutionFunc === 'function'?
										  this.resolutionFunc.bind(this): null);
					this.pendingQueryRegions = this.pendingQueryRegions.concat(
						this.data[chrRange.chr].getUncachedRange(chrRange, resolutionFunc));
					// will add this.resolutionFunc.bind(this) if implemented
				} else {
					this.pendingQueryRegions.push(chrRange);
				}
			}, this);
		}
		// this.pendingQueryRegions will be the regions fed into Chrom B+ Tree
		return this.pendingQueryRegions;
	};

	give.TrackObject.prototype.prepareRemoteQuery = function(regions) {
		// provide data to mainAjax
		// for most of the tracks, this is only trackID and window
		if(this.isCustom) {
			return {
				db: this.species.db, 
				remoteURL: this.remoteFile, 
				window: regions.map(function(region) {
							return region.regionToString(false);
						}, this),
				isCustom: true, 
			};		
		} else {
			return {
				db: this.species.db, 
				trackID: this.getID(), 
				window: regions.map(function(region) {
							return region.regionToString(false);
						}, this),
			};		
		}
	};

	give.TrackObject.prototype.prepareCustomQuery = function() {
		// provide data to custom track query
		// for most of the tracks, this is only window (does not need to stringify)
		return this.pendingQueryRegions;
	};

	give.TrackObject.prototype.getData = function(ranges, callback, callbackID) {
		// this is the interface exposed to the DOM object
		// DOM will call getData to see if data needs to be retrieved
		// callback will be the function from DOM object

		// data handling will be done locally (in TrackObject here)

		// first merge ranges currently being debounced
		
		if(this.isRetrivingData) {
			this._addCallback(this.getData.bind(this, ranges, callback, callbackID));
			return true;
		}
		
		var assimilateRanges = function(rangeMain, rangeToBeAssimilated) {
			if(rangeMain.overlaps(rangeToBeAssimilated)) {
				rangeMain.assimilate(rangeToBeAssimilated);
				return false;
			}
			return true;
		};
		
		if(!Array.isArray(ranges)) {
			ranges = [ranges];
		}
		// merge the query
		ranges.forEach(function(range) {
			this.pendingGUIRanges = this.pendingGUIRanges.filter(assimilateRanges.bind(this, range), this);
			this.pendingGUIRanges.splice(
				give.locationOf(range, this.pendingGUIRanges, 
								null, null, give.ChromRegion.compareChrRegion) + 1,
				0, range);
		}, this);

		this.getTrackUncachedRange();
		if(callback) {
			this._addCallback(callback, callbackID);
		}
		if(typeof this.pendingQueryRegions !== 'undefined' && 
		   this.pendingQueryRegions.length > 0) {
			give.debounce(this.getDataJobName, 
						  this._retrieveData.bind(this, this.pendingQueryRegions),
						  this.getDataDebounceInt);
		} else {
			if(give.isDebouncerActive(this.getDataJobName)) {
				give.cancelDebouncer(this.getDataJobName);
			}					
			this.pendingGUIRanges = [];
			this._clearCallback(true);
		}
		// return whether data is actually being retrieved (maybe unnecessary?)
		return (this.pendingQueryRegions && this.pendingQueryRegions.length > 0);
	};
	
	give.TrackObject.prototype._clearCallback = function(execute) {
		while(this.callbackArray.length > 0) {
			var callback = this.callbackFuncs[this.callbackArray.shift()];
			if(execute) {
				callback();
			}
		}
		this.callbackFuncs = {};
	};

	give.TrackObject.prototype._addCallback = function(callback, callbackID) {
		callbackID = callbackID || give.TrackObject.getDataQueueCallbackID + this.callbackArray.length;
		if(!this.callbackFuncs.hasOwnProperty(callbackID)) {
			this.callbackArray.push(callbackID);
		}
		this.callbackFuncs[callbackID] = callback;
	};

	give.TrackObject.prototype._retrieveData = function(regions) {
		// directly from request URL
		// use iron-ajax to submit request directly
		// customized components are used in data preparation and data handler
		// use dataHandler(e, detail) as return handler
		// callback is in case update is needed
		// remoteQuery is already prepared or can be provided by regions

		if(regions && regions.length > 0) {
			if(this.isCustom && this.localFile) {
				// if track has its own getLocalData function, then get local data instead of getting remote data
				this.getReadLocalFile().call(this, this.localFile, this.prepareCustomQuery(regions));
				// afterwards it's this.dataHandler()'s job.
			} else if(this.requestUrl) {
				this.isRetrivingData = true;
				give.postAjax(this.requestUrl, this.prepareRemoteQuery(regions), 
							  this.responseHandler, 'json', null, null, this);
			}
		} else {
			// nothing really needs to be done to get data, so just call callback function
			this._clearCallback(true);
		}
	};

	give.TrackObject.prototype.getDataHandler = function() {
		if(give.TrackObjectImpl.DataHandlers.hasOwnProperty(this.getTypeTrunk())) {
			return give.TrackObjectImpl.DataHandlers[this.getTypeTrunk()].bind(this);
		} else {
			return give.TrackObjectImpl.DefaultDataHandler.bind(this);
		}
	};

	give.TrackObject.prototype.getReadLocalFile = function() {
		if(give.TrackObjectImpl.LocalFileHandlers.hasOwnProperty(this.getTypeTrunk())) {
			return function(localFile, regions) {
				give.TrackObjectImpl.LocalFileHandlers[this.getTypeTrunk()].call(this, localFile, regions);
				this._clearCallback(true);
			}.bind(this);
		} else {
			return function(localFile, regions) {
				give.TrackObjectImpl.DefaultLocalFileHandler.call(this, localFile, regions);
				this._clearCallback(true);
			}.bind(this);
		}
	};

	give.TrackObject.prototype.readRemoteFile = function(URL, query, callback) {
		// placeholder to read remote URL
		// query is the current window (may involve buffering, can be implemented in prepareCustomQuery)
		// data will be passed via firing a 'response' event with {detail: data}
		// and the response will be handled by this.responseHandler(e, detail)
		// 
		// Notice that to achieve this, CORS needs to be enabled on target server
		// The fallback method is going through GeNemo server as a proxy
		return false;
	};

	give.TrackObject.prototype.responseHandler = function(response) {
		// notice that this will do some preparation works:
		//	1. If this.data does not contain a Chrom B+ Tree for chrom, add one;
		//	2. Enumerate all res.chrom to run this.getDataHandler()
		//	3. TODO: Add cache purging stuff in the future
		for(var chrom in response) {
			if(response.hasOwnProperty(chrom) && Array.isArray(response[chrom])) {
				if(!this.data.hasOwnProperty(chrom)) {
					this.data[chrom] = new give.ChromBPlusTree(this.species.chromInfo[chrom].chrRegion.start,
															   this.species.chromInfo[chrom].chrRegion.end);
				}
			}
		}
		this.getDataHandler()(response, this.data, this.pendingQueryRegions);
		delete this.pendingQueryRegions;
		this.pendingGUIRanges = [];
		this.isRetrivingData = false;
		this._clearCallback(true);
	};

	give.TrackObject.StatusEnum = {
		VIS_FULL: 5,
		VIS_NONE: 0,
		VIS_PACK: 4,
		VIS_COLLAPSED: 3,			// this is for gene track only, will collapse overlapping transcripts
		VIS_NOTEXT: 2,				// this is for gene track only, will remove all texts
		VIS_DENSE: 1,
	};

	give.TrackObject.DEFAULT_PRIORITY = 100.0;
	give.TrackObject.fetchDataTarget = '/getTrackData.php';
	give.TrackObject.fetchCustomTarget = '/getTrackData.php';
	give.TrackObject.getDataQueueCallbackID = 'GETDATA_QUEUE_';

	give.TrackObject.createCoorTrack = function(species, id) {
		var newTrack = new give.TrackObject(id || 'coor_' + species.db, null, species);
		newTrack.setSetting('type', 'coordinate');
		newTrack.priority = 0;
		newTrack.isPureLocal = true;
		return newTrack;
	};

	give.TrackObject.comparePriorities = function(track1, track2, groups) {
		// compare group priorities first, then local priorities
		// tracks without groups will be considered as top priority (for now)
		var group1Prior = 0, group2Prior = 0;
		try {
			group1Prior = groups[track1.groupID].priority;
		} catch(e) {
		}
		try {
			group2Prior = groups[track2.groupID].priority;
		} catch(e) {
		}
		return group1Prior !== group2Prior? (group1Prior < group2Prior? -1: 1)
			: (track1.getPriority() < track2.getPriority()? -1: 
			track1.getPriority() > track2.getPriority()? 1: 0);
	};

	return give;

})(GIVe || {});
