// JavaScript Document
var GIVe = (function(give) {
	'use strict';

	give.SpeciesObject = function(DB, Name, CommonName, IsEncode, Ref, ChromInfo, settings) {

		// notice that ChromInfo is the JSON encoded object 
		//		for chromosome information from chromInfo.php

		// this is for navigation thing
		this.isCollapsed = false;
		// whether this species is collapsed in the browser
		this.isActive = true;
		// if user has not selected this species to display, then it will become false;
		// this is also used for navigation only

		this.db = DB;
		this.name = Name;
		this.commonName = CommonName;
		this.isEncode = IsEncode;
		this.ref = Ref;
		this.groups = {};				// this is used to get all the groups
		this.settings = {};				// object for all settings

		// read Object for species chrom info (if there)
		if(ChromInfo) {
			this.initChromInfo(ChromInfo);
		}

		this.uniTracksUpdated = false;		// regardless of whether user has selected
		this.uniTracksInitialized = false;		// regardless of whether user has selected
		this.uniTracks = new give.TrackGroup();
		// this is for uniTracks, every entry is a uniTrack Object
		// this.uniTracksEncode = new TrackBundleWithSample(this.db, '', '', '');

		// this.regionToShow = null;
		// this is to define the region used to show
		// (give.ChromRegion Object, including name, strand and coordinates)

		this.unsortedTbodyID = null;
		this.sortedTbodyID = null;
		this.insigTbodyID = null;
		this.insigHeaderTbodyID = null;

		this.browserConDoc = null;

		// this.hgsID = null;		// this is to match the hgsid from UCSC

		// this.orderedUniTracksEncode = new Array();

		if(settings) {
			for(var key in settings) {
				if(settings.hasOwnProperty(key)) {
					this.settings[key] = settings[key];
				}
			}
		}

	};

	give.SpeciesObject.prototype.initChromInfo = function(ChromInfo) {
		if(ChromInfo) {
			this.chromInfo = {};
			for(var chrom in ChromInfo) {
				if(ChromInfo.hasOwnProperty(chrom)) {
					this.chromInfo[chrom] = {};
					this.chromInfo[chrom].chrRegion = new give.ChromRegion(ChromInfo[chrom].chrRegion);
					if(ChromInfo[chrom].cent) {
						this.chromInfo[chrom].cent = new give.ChromRegion(ChromInfo[chrom].cent);
					}
				}
			}
		}
	};

	give.SpeciesObject.prototype.initChromInfoFromServer = function(target) {
		var self = this;
		give.postAjax(target || give.SpeciesObject.initChromTarget, {db: this.db}, function(data, status) {
			self.initChromInfo(data);
		}, 'json'); // end ajax to initialize species
	};

	give.SpeciesObject.prototype.initTracks = function(groupInfo, keepOld, requestUrl) {
		// notice that trackInfo is supposed to be an array
		if(!keepOld) {
			this.uniTracks.clear();
			this.groups = {};
		}
		for(var groupID in groupInfo) {
			if(groupInfo.hasOwnProperty(groupID)) {
				this.groups[groupID] = new give.TrackGroup(groupInfo[groupID].name, 
										groupInfo[groupID].label,
										parseFloat(groupInfo[groupID].priority || give.TrackGroup.MAX_GROUP_PRIORITY), 
										groupInfo[groupID].defaultIsClosed != 0, 
										groupInfo[groupID].singleChoice != 0);
				groupInfo[groupID].tracks.forEach(function(track) {
					var newTrack = new give.TrackObject(track.tableName, track, this)
					newTrack.groupID = groupID;
					if(requestUrl && !newTrack.requestUrl) {
						newTrack.requestUrl = requestUrl;
					}
					this.uniTracks.addTrack(newTrack);
					this.groups[groupID].addTrack(newTrack);
				}, this);
			}
		}
	};

	give.SpeciesObject.prototype.initTracksFromServer = function(target, callback) {
		// callback is the callback function taking this species as argument
		var self = this;
		give.postAjax(target || give.SpeciesObject.initTrackTarget, {db: this.db}, function(data, status) {
			self.initTracks(data, false, give.TrackObject.fetchDataTarget);
			if(callback) {
				callback(self);
			}
		}, 'json');
	};

	give.SpeciesObject.prototype.addCustomTrack = function(track, group, callback) {
		// if group ID is not specified, use "customTracks" as ID;
		// replace tracks with the same groupID and track.tableName
		group = group || {};
		var groupID = group.id || 'customTracks';
		if(!this.groups.hasOwnProperty(groupID)) {
			this.groups[groupID] = give.SpeciesObject.createCustomGroup(group);
		}
		// remove existing track
		if(this.groups[groupID].hasTrack(track.tableName)) {
			this.groups[groupID].removeTrack(track.tableName);
			this.uniTracks.removeTrack(track.tableName);
		}
		var newTrack = new give.TrackObject(track.tableName, track, this);
		newTrack.groupID = groupID;
		if(!newTrack.remoteUrl) {
			newTrack.remoteUrl = give.TrackObject.fetchCustomTarget;
		}
		this.uniTracks.addTrack(newTrack);
		this.groups[groupID].addTrack(newTrack);
		if(callback) {
			callback(this);
		}
	};

	give.SpeciesObject.initAllTarget = '/initSpecies.php';
	give.SpeciesObject.initChromTarget = '/initSpecies.php';
	give.SpeciesObject.initTrackTarget = '/initTracks.php';

	give.SpeciesObject.initAllSpecies = function(target, spcArray, callback) {
		// initialize all species from db
		// return an array of species
		// callback is the callback function taking spcArray as argument
		spcArray = spcArray || [];
		spcArray.splice(0, spcArray.length);
		spcArray.dbMap = {};
		spcArray.ready = false;
		give.postAjax(target || give.SpeciesObject.initAllTarget, {}, function(data, status) {
			for(var spcDb in data) {
				if(data.hasOwnProperty(spcDb) && data[spcDb].browserActive) {
					spcArray.dbMap[spcDb] = new give.SpeciesObject(spcDb, data[spcDb].name, data[spcDb].commonname, 
														data[spcDb].encode, data[spcDb].dbname, data[spcDb].chromInfo);
					spcArray.push(spcArray.dbMap[spcDb]);
				}
			}
			spcArray.ready = true;
			if(callback) {
				callback(spcArray);
			}
		}, 'json'); // end ajax to initialize species
		return spcArray;
	};

	give.SpeciesObject.createCustomGroup = function(group) {
		group = group || {};
		return new give.TrackGroup(group.id || 'customTracks', group.label || 'Custom Tracks', 
							group.priority || give.TrackGroup.CUSTOM_GROUP_PRIORITY, 
							group.defaultIsClosed != 0, false);
	};

	return give;

})(GIVe || {});
