// JavaScript Document for tracks
// Notice that generegion.js is required for this to work correctly

var MILLISECONDS_WAITTIMEOUT = 20;
var INSIGNIFICANT_THRESHOLD = 2.0;


var glo_methodind = "mean";		// global settings for method to get value in a table
var glo_methodall = "max";		// global settings for method to get value across tables in a supertrack
var glo_methodspc = "max";		// global settings for method to get value across species

function Track(ID, Settings, species) {
	this.id = ID;
	this.Settings = this.Settings || Settings || {};
	this.Settings.settings = this.Settings.settings || {};
	this.species = species;
	this.priority = this.getSetting('priority') || Track.DEFAULT_PRIORITY;
	this.info = "";				// reserved for "children"
	this.setVisFromStr(this.getSetting('visibility') || 'full');
}

Track.StatusEnum = {
	VIS_FULL: 5,
	VIS_NONE: 0,
	VIS_PACK: 4,
	VIS_COLLAPSED: 3,			// this is for gene track only, will collapse overlapping transcripts
	VIS_NOTEXT: 2,			// this is for gene track only, will remove all texts
	VIS_DENSE: 1,
};

Track.DEFAULT_PRIORITY = 100.0;
Track.fetchDataTarget = '/cpbrowser/getTrackData.php';

Track.prototype.setVisFromStr = function(strStatus) {
	switch(strStatus) {
		case 'dense':
			this.setSetting('visibility', Track.StatusEnum.VIS_DENSE);
			break;
		case 'full':
			this.setSetting('visibility', Track.StatusEnum.VIS_FULL);
			break;
		case 'hide':
			this.setSetting('visibility', Track.StatusEnum.VIS_NONE);
			break;
		case 'pack':
			this.setSetting('visibility', Track.StatusEnum.VIS_PACK);
			break;
		case 'collapsed':
			this.setSetting('visibility', Track.StatusEnum.VIS_COLLAPSED);
			break;
		case 'notext':
			this.setSetting('visibility', Track.StatusEnum.VIS_NOTEXT);
			break;
		default:
	}
};

Track.prototype.getUcscVis = function() {
	switch(this.getSetting('visibility')) {
		case Track.StatusEnum.VIS_FULL:
			return 'full';
		case Track.StatusEnum.VIS_DENSE:
			return 'dense';
		case Track.StatusEnum.VIS_PACK:
			return 'pack';
		case Track.StatusEnum.VIS_COLLAPSED:
			return 'collapsed';
		case Track.StatusEnum.VIS_NOTEXT:
			return 'notext';
		default:
			return 'hide';
	}
};

Track.prototype.setSetting = function(key, value) {
	if(this.Settings.hasOwnProperty(key)) {
		delete this.Settings[key];
	}
	this.Settings.settings[key] = value;
};

Track.prototype.getSetting = function(key) {
	if(!this.Settings.settings.hasOwnProperty(key)) {
		if(this.Settings.hasOwnProperty(key)) {
			this.Settings.settings[key] = this.Settings[key];
		}
	}
	delete this.Settings[key];
	return this.Settings.settings[key];
};

//Track.prototype.getInfo = function() {
//	return "<td>" + this.info.replace(/\t/g, "</td>\n<td>") + "</td>";
//};
//
//Track.prototype.getInfoString = function() {
//	return this.info.replace(/\t/g, ' - ');
//};
//
Track.prototype.getID = function() {
	return this.id;
};

Track.prototype.getReadableID = function() {
	return this.getID().replace(/_+/g, ' ');
};

Track.prototype.getType = function() {
	return this.getSetting('type');
};

Track.prototype.getTypeTrunk = function() {
	return this.getSetting('type').split(/\s+/, 2)[0].toLowerCase();
};

Track.prototype.getCleanID = function() {
	// remove blanks and brackets in IDs to conform to HTML 4.1
	return this.getID().replace(/[\s\(\)\+\/]/g, '');
};

Track.prototype.getPriority = function() {
	// TODO: 
	//	1. implement group priority
	// 	2. implement customized temporary priority
	return this.priority;
}

Track.createCoorTrack = function(species, id) {
	var newTrack = new Track(id || 'coor_' + species.db, null, species);
	newTrack.setSetting('type', 'coordinate');
	newTrack.priority = 0;
	return newTrack;
};

function TrackBundle(idprefix, idpostfix) {
	this.array = [];
	this.map = {};
	this.IDPrefix = (typeof(idprefix) === 'string')? idprefix: '';
	this.IDPostfix = (typeof(idpostfix) === 'string')? idpostfix: '';
	
//	this.reverseLookUpMap = {};
//	// this is used to map individual table name back to track object
	this.subTableInitialized = false;
}

TrackBundle.prototype.addTrack = function(track) {
	this.array.push(track);
	this.map[track.id] = track;
};

TrackBundle.prototype.get = function(index) {
	// index can be number or string
	var result;
	if (typeof index === 'number') {
		result = this.array[index];
	} else {
		result = this.map[index];
	}
	if(typeof(result) !== 'object') {
		throw index;
	}
	return result;
};

TrackBundle.prototype.getLength = function() {
	return this.array.length;
};

// basic array manipulations

TrackBundle.prototype.forEach = function(callback, thisArg) {
	return this.array.forEach(callback, thisArg);
}

TrackBundle.prototype.some = function(callback, thisArg) {
	return this.array.some(callback, thisArg);
}

TrackBundle.prototype.every = function(callback, thisArg) {
	return this.array.every(callback, thisArg);
}

TrackBundle.prototype.clear = function() {
	this.map = {};
	this.array.splice(0, this.array.length);
}

function TrackGroup(groupID, groupLabel, priority, visibility, singleOnly, idprefix, idpostfix) {
	TrackBundle.call(this, idprefix, idpostfix);
	this.id = groupID;
	this.label = groupLabel;
	this.priority = priority;
	this.visibility = visibility;
	this.singleOnly = singleOnly;
}

extend(TrackBundle, TrackGroup);

TrackGroup.MAX_GROUP_PRIORITY = 100000;

//TrackBundle.prototype.setCheckBox = function(track, flag) {
//	// set the checkbox of the track, and track.status as well
//	try{
//		track.status = flag;
//		document.getElementById(this.IDPrefix
//			+ track.getCleanID() + this.IDPostfix).checked = flag;
//		return true;
//	} catch(e) {
//		return false;
//	}
//};
//
//TrackBundle.prototype.setCheckBoxFromID = function(trackID, flag) {
//	try{
//		return this.setCheckBox(this.get(trackID), flag);
//	} catch(e) {
//		return false;
//	}
//};
//
//TrackBundle.prototype.setCheckBoxFromTableName = function(tableName, flag) {
//	return this.setCheckBox(this.reverseLookUpMap[tableName], flag);
//};
//
//TrackBundle.prototype.setAll = function(flag) {
//	flag = flag || false;
//	for(var i = 0; i < this.length(); i++) {
//		this.setCheckBox(this.get(i), flag);
//	}
//	return false;
//};
//
//TrackBundle.prototype.setListOnly = function(tableNameList) {
//	// tableNameList is the array of table names;
//	// tableNames other than the ones in the bundle can be included with no effect
//	this.setAll(false);
//	for(var i = 0; i < tableNameList.length; i++) {
//		this.setCheckBoxFromTableName(tableNameList[i], true);
//	}
//	return true;
//}
//
//TrackBundle.prototype.setIDListOnly = function(IDList) {
//	// tableNameList is the array of table names;
//	// tableNames other than the ones in the bundle can be included with no effect
//	this.setAll(false);
//	for(var i = 0; i < IDList.length; i++) {
//		this.setCheckBoxFromID(IDList[i], true);
//	}
//	return true;
//}
//
//TrackBundle.prototype.getIDList = function(returnall) {
//	returnall = returnall || false;
//	var result = Array();
//	$.each(this.array, function(key, value) {
//		// first, use getdownload.php to get all the tableNames
//		if($('#' + value.getCleanID()).prop('checked') || returnall) {
//			result.push(value.id);
//		}
//	});
//	return result;
//}
//
//TrackBundle.prototype.addTableNameToID = function(tableName, trackID) {
//	this.reverseLookUpMap[tableName] = this.get(trackID);
//};
//
//TrackBundle.prototype.addSubTableNames = function(ID, tableNames, db) {
//	try{
//		bundle = this;
//		if(db) {
//			// then db information is needed
//			this.get(ID).addSpeciesSubTables(db, tableNames);
//		} else {
//			this.get(ID).addSpeciesSubTables(tableNames);
//		}
//		$.each(tableNames, function(i, value) {
//			bundle.addTableNameToID(value, ID);
//		});
//	} catch(e) {
//		console.log(ID + " does not exist!");
//		console.log(this);
//	}
//};



function Species(DB, Name, CommonName, IsEncode, Ref, ChromInfo) {
	
	// notice that ChromInfo is the JSON encoded object 
	//		for chromosome information from chromInfo.php
	
	this.isReady = false;
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
	
	// read Object for species chrom info (if there)
	if(ChromInfo) {
		this.initChromInfo(ChromInfo);
	}
		
	this.uniTracksUpdated = false;		// regardless of whether user has selected
	this.uniTracksInitialized = false;		// regardless of whether user has selected
	this.uniTracks = new TrackBundle();
	// this is for uniTracks, every entry is a uniTrack Object
	// this.uniTracksEncode = new TrackBundleWithSample(this.db, '', '', '');
	
	// this.regionToShow = null;
	// this is to define the region used to show
	// (ChrRegion Object, including name, strand and coordinates)
	
	this.unsortedTbodyID = null;
	this.sortedTbodyID = null;
	this.insigTbodyID = null;
	this.insigHeaderTbodyID = null;
	
	this.browserConDoc = null;
	
	// this.hgsID = null;		// this is to match the hgsid from UCSC
	
	// this.orderedUniTracksEncode = new Array();
	
}

Species.prototype.initChromInfo = function(ChromInfo) {
	if(ChromInfo) {
		this.chromInfo = {};
		for(var chrom in ChromInfo) {
			if(ChromInfo.hasOwnProperty(chrom)) {
				this.chromInfo[chrom] = {};
				this.chromInfo[chrom].chrRegion = new ChrRegion(ChromInfo[chrom].chrRegion);
				if(ChromInfo[chrom].cent) {
					this.chromInfo[chrom].cent = new ChrRegion(ChromInfo[chrom].cent);
				}
			}
		}
	}
};

Species.prototype.initChromInfoFromServer = function(target) {
	var self = this;
	$.post(target || Species.initChromTarget, {db: this.db}, function(data, status, jqXHR) {
		self.initChromInfo(data);
	}, 'json'); // end ajax to initialize species
}

Species.initAllTarget = '/cpbrowser/initSpecies.php';
Species.initChromTarget = '/cpbrowser/initSpecies.php';
Species.initTrackTarget = '/cpbrowser/initTracks.php';

Species.initAllSpecies = function(target, spcArray, callback) {
	// initialize all species from db
	// return an array of species
	// callback is the callback function taking spcArray as argument
	spcArray = spcArray || [];
	spcArray.splice(0, spcArray.length);
	spcArray.dbMap = {};
	spcArray.ready = false;
	$.post(target || this.initAllTarget, {}, function(data, status, jqXHR) {
		for(var spcDb in data) {
			if(data.hasOwnProperty(spcDb) && data[spcDb].browserActive) {
				spcArray.dbMap[spcDb] = new Species(spcDb, data[spcDb].name, data[spcDb].commonname, 
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

Species.prototype.initTracks = function(groupInfo, keepOld) {
	// notice that trackInfo is supposed to be an array
	if(!keepOld) {
		this.uniTracks.clear();
		this.groups = {};
	}
	for(var groupID in groupInfo) {
		if(groupInfo.hasOwnProperty(groupID)) {
			this.groups[groupID] = new TrackGroup(groupInfo[groupID].name, 
									groupInfo[groupID].label,
									parseFloat(groupInfo[groupID].priority || TrackGroup.MAX_GROUP_PRIORITY), 
									groupInfo[groupID].defaultIsClosed != 0, 
									groupInfo[groupID].singleChoice != 0);
			groupInfo[groupID].tracks.forEach(function(track) {
				var newTrack = new Track(track.tableName, track, this)
				this.uniTracks.addTrack(newTrack);
				this.groups[groupID].addTrack(newTrack);
			}, this);
		}
	}
};

Species.prototype.initTracksFromServer = function(target, callback) {
	// callback is the callback function taking this species as argument
	var self = this;
	$.post(target || Species.initTrackTarget, {db: this.db}, function(data, status, jqXHR) {
		self.initTracks(data);
		if(callback) {
			callback(self);
		}
	}, 'json');
};


//Species.prototype.replaceText = function(text) {
//	// used to replace texts in templates
//	return text.replace(/spcDbName/g, this.db).replace(/spcCmnName/g, this.commonName).replace(/spcSciName/g, this.name);
//};
//
//Species.prototype.writeUniqueTable = function(isencode) {
//	if(!isencode) {
//		var uniqTemp = $('#uniqueTemplate').html();
//		uniqTemp = this.replaceText(uniqTemp);
//		$('#uniqueHolder').append(uniqTemp);
//		
//		var uniqueHolderId = '#' + this.db + 'TableHolder';
//		
//		if(this.uniTracks.length() > 0) {
//			items = [];
//			items.push('<table width="100%"><tr>')
//			for(var j = 0; j < this.uniTracks.length(); j++) {
//				items.push(this.uniTracks.get(j).writeTable(this.commonName));
//				if((j % 2) && j < this.uniTracks.length()) {
//					items.push('</tr>\n<tr>')
//				}
//			}
//			items.push('</tr></table>\n');
//			$(uniqueHolderId).append(items.join(''));
//		} else {
//			$(uniqueHolderId).append('<span class="settingsNormal">'
//				+ '<em>(No unique tracks)</em></span>');
//		}
//	} else if(this.isEncode) {
//		var uniqTemp = $('#uniqueEncodeTemplate').html();
//		uniqTemp = this.replaceText(uniqTemp);
//		$('#uniqueEncodeHolder').append(uniqTemp);
//		
//		this.unsortedTbodyID = this.db + 'EncodeTbodyHolder';
//		this.sortedTbodyID = this.db + 'EncodeSortedTbodyHolder';
//		this.insigTbodyID = this.db + 'EncodeInsigTbodyHolder';
//
//		this.orderedUniTracksEncode.length = 0;	// this is the sorted common track array
//		this.orderedUniTracksEncode.sigLength = 0;	// number of tracks that have significant results
//		
//		if(this.uniTracksEncode.length() > 0) {
//			items = [];
//			for(var j = 0; j < this.uniTracksEncode.length(); j++) {
//				items.push('<tr class="trackCell" id="' 
//					+ this.uniTracksEncode.get(j).getCleanID() + '_tr">');
//				items.push(this.uniTracksEncode.get(j).writeTable(this.commonName));
//				items.push('</tr>\n')
//			}
//			$(document.getElementById(this.unsortedTbodyID)).append(items.join(''));
//		} else {
//			$(document.getElementById(this.unsortedTbodyID)).append('<tr><td colspan="5"><span class="settingsNormal">'
//				+ '<em>(No unique tracks)</em></span></td></tr>');
//		}
//	}
//};
//
//Species.prototype.updateSessionID = function() {
//	$.post('/cpbrowser/postsessionhgsid.php', { db: this.db, hgsID: this.hgsID } );
//}
//
Species.prototype.setSubTableNames = function(speciesArray, cmnTracksBundle, cmnTracksEncodeBundle) {
	if(this.isEncode) {
		var trackTblNames = [];
		var reverseLookupTableNameToID = new Object();
		var currSpecies = this;
		$.each(cmnTracksEncode.array, function(key, value) {
			// first, use getdownload.php to get all the tableNames
			trackTblNames.push(value.getSpeciesTblName(currSpecies.db));
			reverseLookupTableNameToID[value.getSpeciesTblName(currSpecies.db)] = value.id;
		});
		
		tableQuery = new Object();
		tableQuery[this.db] = JSON.stringify(trackTblNames);
		
		$.post('cpbrowser/gettablenames.php', tableQuery, function(tableNameData) {
			$.each(tableNameData, function(key, val) {
				cmnTracksEncode.addSubTableNames(reverseLookupTableNameToID[key], val, currSpecies.db);
			});
			
			trackTblNames = [];
			$.each(currSpecies.uniTracksEncode.array, function(key, value) {
				// first, use getdownload.php to get all the tableNames
				trackTblNames.push(value.getSpeciesTblName(currSpecies.db));
				reverseLookupTableNameToID[value.getSpeciesTblName(currSpecies.db)] = value.id;
			});
			
			tableQuery = new Object();
			tableQuery[currSpecies.db] = JSON.stringify(trackTblNames);
			
			$.post('cpbrowser/gettablenames.php', tableQuery, function(tableNameData) {
				$.each(tableNameData, function(key, val) {
					currSpecies.uniTracksEncode.addSubTableNames(reverseLookupTableNameToID[key], val);
				});
				currSpecies.uniTracksUpdated = true;
				allSpeciesDoneCheck(speciesArray, cmnTracksBundle, cmnTracksEncodeBundle);
				
			}, 'json'); // end ajax(post) to update all table names for uniTracks
			
		}, 'json'); // end ajax(post) to update all table names
	} else {
		this.uniTracksUpdated = true;
		allSpeciesDoneCheck(speciesArray, cmnTracksBundle, cmnTracksEncodeBundle);
	}
	
};

Species.prototype.setTrackReady = function(speciesArray, cmnTracksBundle, cmnTracksEncodeBundle, init, inbrowser) {
	var conDoc = (document.getElementById(this.db + "_controls").contentWindow 
		|| document.getElementById(this.db + "_controls").contentDocument);
	if(conDoc.document) {
		conDoc = conDoc.document;
	}
	this.browserConDoc = conDoc;
	this.hgsID = parseInt(conDoc.getElementById('TrackForm').elements['hgsid'].value);
	this.updateSessionID();

	// tracks need to be initialized or need to be changed so fill the unique ones
	// after filling this one, check whether all tracks initialized 
	// if so, initialize the settings panel
	
	var hiddenCommons = conDoc.getElementById("TrackControls").getElementsByTagName("input");
	// get all the hidden inputs in the browser "common" part
	
	for(var i = 0; i < hiddenCommons.length; i++) {
		var currentTrack;
		try {
			currentTrack = cmnTracksBundle.get(hiddenCommons[i].id);
		} catch(e) {
			currentTrack = new CmnTrack(hiddenCommons[i].id, 
				hiddenCommons[i].value, speciesArray);
			cmnTracksBundle.addTrack(currentTrack);
		}
		
		if(!currentTrack.getSpeciesTblName(this.db)) {
			currentTrack.setSpeciesTblName(this.db, hiddenCommons[i].name);
		}
		currentTrack.setStatusFromUcsc(hiddenCommons[i].value);
		// this happens even there is already entry in cmnTracksTableNames
		// Notice that this hiddenCommons[i].name is not Short Label
	}
	
	if(this.isEncode) {
	
		hiddenCommons = conDoc.getElementById("TrackControlsEncode").getElementsByTagName("input");
		var hiddenCommonsEncodeData = conDoc.getElementById("TrackControlsEncode").getElementsByTagName("span")
		// get all the hidden inputs in the browser "common" part
		
		for(var i = 0; i < hiddenCommons.length; i++) {
			try {
				currentTrack = cmnTracksEncodeBundle.get(hiddenCommons[i].id);
			} catch(e) {
				currentTrack = new CmnTrackEncode(hiddenCommons[i].id, 
					hiddenCommons[i].value, speciesArray, 
					hiddenCommonsEncodeData[hiddenCommons[i].id + "_title"].innerHTML, 
					hiddenCommonsEncodeData[hiddenCommons[i].id + "_data"].innerHTML);
				cmnTracksEncodeBundle.addTrack(currentTrack, currentTrack.getSampleType());
			}
			if(!currentTrack.getSpeciesTblName(this.db)) {
				currentTrack.setSpeciesTblName(this.db, hiddenCommons[i].name);
			}
			currentTrack.setStatusFromUcsc(hiddenCommons[i].value);
		}
	}
	
	var hiddenUniques;
	if(conDoc.getElementById("TrackUnique") !== null && conDoc.getElementById("TrackUnique") !== undefined) {
		hiddenUniques = conDoc.getElementById("TrackUnique").getElementsByTagName("input");
		// get all the hidden inputs in the browser "common" part
		
		for(var i = 0; i < hiddenUniques.length; i++) {
			try {
				this.uniTracks.get(i).setStatusFromUcsc(hiddenUniques[i].value);
			} catch(e) {
				currentTrack = new UniTrack(this.db, hiddenUniques[i].id, 
					hiddenUniques[i].name, hiddenUniques[i].value)
				this.uniTracks.addTrack(currentTrack);
			}
		}
	}
	
	if(conDoc.getElementById("TrackUniqueEncode") !== null && conDoc.getElementById("TrackUniqueEncode") !== undefined) {
		hiddenUniques = conDoc.getElementById("TrackUniqueEncode").getElementsByTagName("input");
		var hiddenUniquesEncodeData = conDoc.getElementById("TrackUniqueEncode").getElementsByTagName("span")
		// get all the hidden inputs in the browser "common" part
		
		for(var i = 0; i < hiddenUniques.length; i++) {
			try {
				this.uniTracksEncode.get(hiddenUniques[i].id).setStatusFromUcsc(hiddenUniques[i].value);
			} catch(e) {
				currentTrack = new UniTrackEncode(this.db, hiddenUniques[i].id,
					hiddenUniques[i].name, hiddenUniques[i].value,
					hiddenUniquesEncodeData[hiddenUniques[i].id + "_title"].innerHTML,
					hiddenUniquesEncodeData[hiddenUniques[i].id + "_data"].innerHTML);
				this.uniTracksEncode.addTrack(currentTrack, currentTrack.getSampleType());
			}
		}
	}
	
	if(!this.uniTracksInitialized) {
		this.setSubTableNames(speciesArray, cmnTracksBundle, cmnTracksEncodeBundle);
		this.uniTracksInitialized = true;
	} else {
		this.uniTracksUpdated = true;
		allSpeciesDoneCheck(speciesArray, cmnTracksBundle, cmnTracksEncodeBundle);
	}
		
	if(this.isActive && inbrowser) {
		callViewChange(this.db, "refresh");
	}
	allSpeciesDoneCheck(speciesArray, cmnTracksBundle, cmnTracksEncodeBundle);
	//markTrackInitialized(true);
	
};

Species.prototype.updateAllUnique = function() {
	for(var i = 0; i < this.uniTracks.length(); i++) {
		this.uniTracks.get(i).updateStatus(this.browserConDoc);
	}
	if (this.isEncode) {
		for(var i = 0; i < this.uniTracksEncode.length(); i++) {
			this.uniTracksEncode.get(i).updateStatus(this.browserConDoc);
		}
	}
};

Species.prototype.submitTrackChange = function(shadesOff) {
	// Hack: turn shades on/off
	// This won't be useful once shades are moved out into JS part
	shadesOff = shadesOff || false;
	
	var conForm = this.browserConDoc.getElementById('TrackForm');
	var shadesOffVar = this.browserConDoc.createElement("input");
	shadesOffVar.type = "hidden";
	shadesOffVar.name = "multishade";
	shadesOffVar.value = shadesOff? "hide": "dense";
	conForm.appendChild(shadesOffVar);
	
	conForm.submit();
	this.uniTracksUpdated = false;
};


//function locationOf(element, array, start, end, length, methodind, methodall, methodspc, orderBySpcID) {
//	// this is to return the index that element will be put AFTER
//	// so if the element needs to be put to the top, it will return start-1
//	start = start || 0;
//	end = end || array.length;
//	try {
//		if(end == start || element.compareTo(array[start]) < 0) {
//			return start - 1;
//		}
//	} catch(err) {
//		console.log(element.id);
//		console.log(array[start].id);
//		throw(err);
//	}
//	try {
//		var pivot = parseInt(start + (end - start) / 2, 10);
//		if (end - start <= 1 
//			|| element.compareTo(array[pivot], length, methodind, methodall, methodspc, orderBySpcID) == 0)
//			return pivot;
//		if (element.compareTo(array[pivot], length, methodind, methodall, methodspc, orderBySpcID) > 0) {
//			return locationOf(element, array, pivot, end, length, methodind, methodall, methodspc, orderBySpcID);
//		} else {
//			return locationOf(element, array, start, pivot, length, methodind, methodall, methodspc, orderBySpcID);
//		}
//	} catch(err) {
//		console.log(element.id + ' pivot: ' + pivot);
//		console.log(array[pivot].id);
//		throw(err);
//	}
//}
//
//function insert(track, array, tbodyID, tbodyInsigID, length, methodind, methodall, methodspc, orderBySpcID) {
//	if(insert.isRunning) {
//		// prevent concurrency problems
//		setTimeout(function() {
//			insert(track, array, tbodyID, tbodyInsigID, length, methodind, methodall, methodspc, orderBySpcID);
//		}, MILLISECONDS_WAITTIMEOUT);
//		return;
//	}
//	insert.isRunning = true;
//	try {
//		var loc = locationOf(track, array);
//	} catch(err) {
//		console.log(err);
//		insert.isRunning = false;
//		return;
//	}
//	array.splice(loc + 1, 0, track);
//	// TODO: after doing this, update DOM to replace the track in tbodyID
//	if(track.isSignificant()) {
//		array.sigLength++;
//	}
//	try {
//		if(track.isSignificant() && loc < 0) {
//			// should be put at top of significant tbody
//			$(document.getElementById(track.getCleanID() + '_tr')).prependTo($(document.getElementById(tbodyID)));
//		} else if(!track.isSignificant() && loc < array.sigLength) {
//			// should be put at top of insignificant tbody
//			$(document.getElementById(track.getCleanID() + '_tr')).prependTo($(document.getElementById(tbodyInsigID)));
//			// show insig header
//			$(document.getElementById(tbodyInsigID + 'Header')).show();
//		} else {
//			// should be put after the loc-th row, whatever tbody
//			$(document.getElementById(track.getCleanID() + '_tr')).insertAfter($(document.getElementById(array[loc].getCleanID() + '_tr')));
//		}
//	} catch(err) {
//		console.log(track.id);
//		console.log(err);
//		insert.isRunning = false;
//		return;
//	}
//	insert.isRunning = false;
//}
//
//insert.isRunning = false;
//
//
//Track.prototype.compareTo = function(target, length, methodind, methodall, methodspc, orderBySpcID) {
//	// return negative value is this track's compareValue is larger than target
//	// in such case the index of this will be smaller.
//	return target.getCompareValue(length, methodind, methodall, methodspc, orderBySpcID)
//		- this.getCompareValue(length, methodind, methodall, methodspc, orderBySpcID);
//};
//
//Track.prototype.isSignificant = function(length, methodind, methodall, methodspc, orderBySpcID) {
//	return this.getCompareValue(length, methodind, methodall, methodspc, orderBySpcID)
//		> INSIGNIFICANT_THRESHOLD;
//};
//
//
//
//
//// class SpeciesTable is a table for all SpeciesTableEntry, 
//// 		and contains individual track value in different species in a common track
//
//function SpeciesTableEntry(name, vc, s, ss) {
//	this.tableName = name;
//	this.validCount = vc;
//	this.sum = s;
//	this.sumSquare = ss;
//	//console.log(this);
//}
//
//SpeciesTableEntry.prototype.setValue = function(vc, s, ss) {
//	this.validCount = vc;
//	this.sum = s;
//	this.sumSquare = ss;
//};
//
//SpeciesTableEntry.prototype.getCompareValue = function(length, method) {
//	length = length || this.validCount || 0;
//	if(length <= 0) {
//		return 0.0;
//	}
//	if(method == "mean") {
//		return this.sum / length;
//	} else if(method == "cv") {
//		return Math.sqrt(this.sumSquare / length - (this.sum / length)^2) / (this.sum / length);
//	}
//	return 0.0;
//};
//
//SpeciesTableEntry.prototype.getTableName = function() {
//	return this.tableName;
//};
//
//
//function SpeciesTable() {
//	this.tableName = '';
//	this.entries = new Object();
//}
//
//SpeciesTable.prototype.getCompareValue = function(length, methodind, methodall) {
//	methodall = methodall || glo_methodall;		
//	// max entry in the table, "sum" to sum up all entries, "mean" to take the mean
//	
//	methodind = methodind || glo_methodind;
//	// see method in SpeciesTableEntry.prototype.getCompareValue(method, length)
//	
//	var result = 0.0;
//	if(Object.keys(this.entries).length <= 0) {
//		return result;
//	}
//	for(var i = 0; i < this.entries.length; i++) {
//		var newresult = this.entries[i].getCompareValue(length, methodind);
//		if(methodall === "max") {
//			if(result < newresult) {
//				result = newresult;
//			}
//		} else if(methodall === "sum" || methodall === "mean") {
//			result += newresult;
//		} 
//	}
//	if(methodall === "mean") {
//		result /= this.entries.length;
//	}
//	return result;
//};
//
//SpeciesTable.prototype.addValues = function(name, vc, s, ss) {
//	if(this.entries.hasOwnProperty(name)) {
//		this.entries[name].setValue(vc, s, ss);
//	} else {
//		// technically this should not happen
//		this.entries[name] = new SpeciesTableEntry(name, vc, s, ss);
//		console.log(name + " does not exist in " + this.tableName + ".");
//	}
//};
//
//SpeciesTable.prototype.getTableName = function() {
//	return this.tableName;
//};
//
//SpeciesTable.prototype.setTableName = function(name) {
//	this.tableName = name;
//};
//
//SpeciesTable.prototype.getLength = function() {
//	return Object.keys(this.entries).length;
//};
//
//// notice that this will not clear all the table names
//SpeciesTable.prototype.clearValues = function() {
//	for(var entry in this.entries) {
//		if(this.entries.hasOwnProperty(entry)) {
//			entry.setValue();
//		}
//	}
//};
//	
//// this will clear all table names
//SpeciesTable.prototype.clear = function() {
//	this.entries = new Object();
//};
//
//SpeciesTable.prototype.addTable = function(name) {
//	if(this.entries.hasOwnProperty(name)) {
//		console.log(name + " already exists in " + this.tableName + ".");
//	} else {
//		// technically this should not happen
//		this.entries[name] = new SpeciesTableEntry(name);
//	}
//};
//	
//SpeciesTable.prototype.addTables = function(nameArray) {
//	if(nameArray instanceof Array) {
//		for(var i = 0; i < nameArray.length; i++) {
//			this.addTable(nameArray[i]);
//		}
//	}
//};
//
//SpeciesTable.prototype.getSubTableNames = function() {
//	var result = [];
//	$.each(this.entries, function(key, val) {
//		result.push(key);
//	});
//	return result;
//};
//
//function CmnTrack(ID, Status, SpcArray) {
//	Track.call(this, ID, Status);
//	this.spcTables = new Object();
//	if(SpcArray instanceof Array) {
//		for(var i = 0; i < SpcArray.length; i++) {
//			this.spcTables[SpcArray[i].db] = new SpeciesTable();
//		}
//	}
//	this.spcArrayUpdated = false;
//}
//extend(Track, CmnTrack);
//
//CmnTrack.prototype.setSpeciesTblName = function(DB, TableName) {
//	this.spcTables[DB].setTableName(TableName);
//};
//
//CmnTrack.prototype.getSpeciesTblName = function(DB) {
//	return this.spcTables[DB].getTableName();
//};
//
//CmnTrack.prototype.getWholeSpcTblName = function() {
//	var result = new Object();
//	for(var spcTable in this.spcTables) {
//		if(this.spcTables.hasOwnProperty(spcTable)) {
//			result[spcTable] = this.spcTables[spcTable].getTableName();
//		}
//	}
//	return result;
//};
//
//CmnTrack.prototype.addSpeciesValues = function(DB, tableName, validCount, sum, sumSquare) {
//	this.spcTables[DB].addValues(tableName, validCount, sum, sumSquare);
//	this.spcArrayUpdated = true;
//	for(var spcTable in this.spcTables) {
//		if(this.spcTables.hasOwnProperty(spcTable)) {
//			if(this.spcTables[spcTable].getLength() <= 0) {
//				this.spcArrayUpdated = false;
//				break;
//			}
//		}
//	}
//};
//
//CmnTrack.prototype.addSpeciesSubTables = function(DB, tableNames) {
//	this.spcTables[DB].addTables(tableNames);
//};
//
//CmnTrack.prototype.getSpeciesSubTables = function(DB) {
//	return this.spcTables[DB].getSubTableNames();
//};
//
//CmnTrack.prototype.clearAllSpeciesValues = function() {
//	for(var spcTable in this.spcTables) {
//		if(this.spcTables.hasOwnProperty(spcTable)) {
//			this.spcTables[spcTable].clear();
//		}
//	}
//	this.spcArrayUpdated = false;
//};
//
//CmnTrack.prototype.isSpcArrayUpdated = function() {
//	return this.spcArrayUpdated;
//};
//
//CmnTrack.prototype.getID = function() {
//	// strip the "series" in common track IDs
//	// Notice this is for CEpBrowser only, for UCSC, need to get original ID
//	return this.id.replace(/Series/g, '');
//};
//
//CmnTrack.prototype.writeTable = function() {
//	// checkbox
//	var result = '<td class="trackCell"><label>\n<input id="';
//	result += this.getCleanID() + '" type="checkbox" value="dense" ' 
//		+ (this.status? 'checked ': '') + '/>'
//		+ this.getReadableID() + '</label>\n';
//	
//	// download button
//	// img and alt
//	result += '<img class="downloadButton" src="cpbrowser/images/download.png" alt="Download data for '
//		+ this.getReadableID()	+ '" width="15" height="15" id="' 
//		+ this.getCleanID() + '_cmndlbtn" onclick="return callDownloadMenu(\''
//		+ this.id + '\', true, \'' + this.getCleanID() 
//		+ '_cmndlbtn\');" />';
//	// closing tags
//	result += '\n</td>\n';
//	
//	return result;
//};
//
//CmnTrack.prototype.updateStatus = function(spcarray) {
//	// this is to update UniTrack.status from the checkboxes;
//	// then update the hidden inputs in UCSC parts
//	// when engine changed, this should be more straightforward
//	// maybe directly sending tableNames out
//	
//	this.status = document.getElementById(this.getCleanID()).checked;
//	for(var i = 0; i < spcarray.length; i++) {
//		var target = spcarray[i].browserConDoc.getElementById(this.id);
//		if(target) {
//			target.value = (this.status? 'dense': 'hide');
//		}
//	}
//};
//
//
//
//
//
//function CmnTrackEncode(ID, Status, SpcArray, Title, Info) {
//	var spcEncodeArray = SpcArray.slice(0);
//	
//	// remove non-encode species
//	if(spcEncodeArray instanceof Array) {
//		for(var i = 0; i < spcEncodeArray.length; i++) {
//			if(!spcEncodeArray[i].isEncode) {
//				spcEncodeArray.splice(i, 1);
//				i--;
//			}
//		}
//	}
//	
//	CmnTrack.call(this, ID, Status, spcEncodeArray);
//	this.title = Title;
//	this.info = Info;
//	this.sample = Info.replace(/(<([^>]+)>)/ig,"").split('\t')[0];	// this regex is to strip all html tags, then
//}
//extend(CmnTrack, CmnTrackEncode);
//
//CmnTrackEncode.prototype.getSampleType = function() {
//	// extract sampleType from this.info
//	// maybe needs to be called in constructor
//	return this.sample;
//};
//
//CmnTrackEncode.prototype.getCompareValue = function(length, methodind, methodall, methodspc, orderBySpcID) {
//	methodall = methodall || glo_methodall;		
//	// max entry in the table, "sum" to sum up all entries, "mean" to take the mean
//	
//	methodind = methodind || glo_methodind;
//	// see method in SpeciesTableEntry.prototype.getCompareValue(method, length)
//
//	methodspc = methodspc || glo_methodspc;
//	// see method in SpeciesTableEntry.prototype.getCompareValue(method, length)
//
//	if(methodspc == "individual" && orderBySpcID) {
//		// there is a specific ID to order
//		return this.spcTables[orderBySpcID].getCompareValue(length, methodind, methodall);
//	} else if(methodspc == "max") {
//		var compareValue = 0.0;
//		for(var spcTable in this.spcTables) {
//			if(this.spcTables.hasOwnProperty(spcTable)) {
//				if(compareValue < this.spcTables[spcTable].getCompareValue(length, methodind, methodall)) {
//					compareValue = this.spcTables[spcTable].getCompareValue(length, methodind, methodall);
//				}
//			}
//		}
//		return compareValue;
//	} else if(methodspc == "mean") {
//		var compareValue = 0.0;
//		var spcLength = 0;
//		for(var spcTable in this.spcTables) {
//			if(this.spcTables.hasOwnProperty(spcTable)) {
//				compareValue += this.spcTables[spcTable].getCompareValue(methodall, methodind, length);
//				spcLength++;
//			}
//		}
//		return compareValue / spcLength;
//	}
//	return 0.0;
//};
//
//CmnTrackEncode.prototype.writeTable = function() {
//	// label, checkbox and title
//	var result = '<td><label>\n<input id="' + this.getCleanID()
//		+ '" type="checkbox" value="dense" '
//		+ (this.status? 'checked ': '') + '/>' 
//		+ this.title + '</label>\n</td>\n';
//		
//	// info table elements
//	result += this.getInfoTable() + '\n';
//	// preview panel
//	result += '<td><div id="' + this.getCleanID() + 'Preview"></div></td>\n';
//	// download button
//	// img
//	result += '<td><img class="downloadButton" src="cpbrowser/images/download.png" alt="Download data for '
//		+ this.title + '" width="15" height="15" id="' 
//		+ this.getCleanID() + '_cmnedlbtn" onclick="return callDownloadMenu(\''
//		+ this.id + '\', true, \'' + this.getCleanID() 
//		+ '_cmnedlbtn\', true);" />';
//	// close tags
//	result += '</td>\n';
//	
//	return result;
//};
//
//CmnTrackEncode.prototype.writeLongString = function() {
//	return this.title + ' - ' + this.getInfoString();
//};
//
//
//
//function TrackBundleWithSample(sampleprefix, samplepostfix, idprefix, idpostfix) {
//	TrackBundle.call(this, idprefix, idpostfix);
//	this.samplePrefix = (typeof(sampleprefix) == 'string')? sampleprefix: '';
//	this.samplePostfix = (typeof(samplepostfix) == 'string')? samplepostfix: '';
//	this.sampleMap = new Object();
//	
//}
//extend(TrackBundle, TrackBundleWithSample);
//
//TrackBundleWithSample.prototype.addTrack = function(track, sample) {
//	TrackBundle.prototype.addTrack.call(this, track);
//	// directly push a Track object into this[sample]
//	if (typeof(this.sampleMap[sample]) == "undefined") {
//		this.sampleMap[sample] = new Object();
//		this.sampleMap[sample].array = new Array();
//		this.sampleMap[sample].map = new Object();
//		this.sampleMap[sample].state = null;
//	}
//	this.sampleMap[sample].array.push(track);
//};
//
//TrackBundleWithSample.prototype.updateState = function(sample) {
//	// synchronize state of checkBoxes and Tracks
//	// also check sample state
//	// this will use the state of all track checkboxes
//	//		to update track.status and sample checkboxes
//	if (typeof(this.sampleMap[sample]) == 'undefined') {
//		console.log(sample + " is not found in SampleToIDListMap.");
//		return;
//	}
//	var sampleID = sample.replace(/[\s\(\)\+\/]/g, '');
//	this.sampleMap[sample].state = null;
//	// put all states into this[sample].map
//	for(var i = 0; i < this.sampleMap[sample].array.length; i++) {
//		if (this.sampleMap[sample].state == null) {
//			this.sampleMap[sample].state = document.getElementById(this.IDPrefix
//			+ this.sampleMap[sample].array[i].getCleanID() + this.IDPostfix).checked;
//		} else if (this.sampleMap[sample].state != 'mixed'
//			   && this.sampleMap[sample].state != document.getElementById(this.IDPrefix
//				+ this.sampleMap[sample].array[i].getCleanID() + this.IDPostfix).checked) {
//			this.sampleMap[sample].state = 'mixed';
//		}
//		this.sampleMap[sample].array[i].status = document.getElementById(this.IDPrefix
//			+ this.sampleMap[sample].array[i].getCleanID() + this.IDPostfix).checked;
//	}
//	// finally update the sample checkbox
//	//console.log(sample + "|" + this.sampleMap[sample].state);
//	if (this.sampleMap[sample].state == 'mixed') {
//		$('#' + this.samplePrefix + sampleID + this.samplePostfix).attr('checked', true);
//		$('#' + this.samplePrefix + sampleID + this.samplePostfix).prop('indeterminate', true);
//	} else {
//		//console.log($('#' + this.samplePrefix + sample + this.samplePostfix));
//		$('#' + this.samplePrefix + sampleID + this.samplePostfix).attr('checked', this.sampleMap[sample].state);
//		$('#' + this.samplePrefix + sampleID + this.samplePostfix).prop('indeterminate', false);
//	}
//};
//
//TrackBundleWithSample.prototype.updateAllStates = function () {
//	for (var sample in this.sampleMap) {
//		if (this.sampleMap.hasOwnProperty(sample)) {
//			this.updateState(sample);
//		}
//	}
//};
//
//TrackBundleWithSample.prototype.writeSampleTable = function(container) {
//	// container is the ID of the container object to APPEND to the rear
//	var count = 0;
//	for (var sample in this.sampleMap) {
//		if (this.sampleMap.hasOwnProperty(sample)) {
//			var sampleID = sample.replace(/[\s\(\)\+\/]/g, '');
//			var _this = this;
//			$('#' + container).append($('<input type="checkbox" id="' + this.samplePrefix + sampleID 
//				+ this.samplePostfix + '" name="' + sample + '" checked />').change(function() {
//				_this.callChange(this.name);
//				}));
//			$('#' + container).append(sample + '<br />');
//			count++;
//		}
//	}
//	return count;
//};
//
//TrackBundleWithSample.prototype.saveState = function(sample) {
//	// save states from checkboxes into the sample list
//	// this will be called when changed from a tri-state
//	if (typeof(this.sampleMap[sample]) == 'undefined') {
//		console.log(sample + " is not found in SampleToIDListMap.");
//		return;
//	}
//	if(typeof(this.sampleMap[sample].map) == 'undefined') {
//		this.sampleMap[sample].map = new Object();
//	}
//	this.updateState(sample);
//	this.sampleMap[sample].hasMixedState = (this.sampleMap[sample].state == 'mixed');
//	// put all states into this[sample].map
//	for(var i = 0; i < this.sampleMap[sample].array.length; i++) {
//		this.sampleMap[sample].map[this.sampleMap[sample].array[i].getCleanID()] = document.getElementById(this.IDPrefix
//			+ this.sampleMap[sample].array[i].getCleanID() + this.IDPostfix).checked;
//	}
//};
//
//TrackBundleWithSample.prototype.loadState = function(sample) {
//	// load states into checkboxes
//	// this will be called when put into a tri-state
//	if (this.sampleMap[sample].hasMixedState) {
//		for(var i = 0; i < this.sampleMap[sample].array.length; i++) {
//			document.getElementById(this.IDPrefix + this.sampleMap[sample].array[i].getCleanID()
//				+ this.IDPostfix).checked = this.sampleMap[sample].map[this.sampleMap[sample].array[i].getCleanID()];
//		}
//	} else {
//		return false;
//	}
//	return true;
//};
//
//TrackBundleWithSample.prototype.callChange = function(sample) {
//	// state can be 'true', 'tri-state' or 'false' (in this order)
//	// return value will be the new state
//	//
//	var needToUpdate = true;
//	if (this.sampleMap[sample].state != false) {
//		// need to switch to tri-state (if any)
//		if (this.sampleMap[sample].state == true && this.loadState(sample)) {
//			// there is a tri-state to load
//			// after calling the loadState method, all track checkboxes will be updated already
//			this.sampleMap[sample].state = 'mixed';
//			needToUpdate = false;
//		} else {
//			// change into false
//			// but save state first
//			this.saveState(sample);
//			this.sampleMap[sample].state = false;
//			
//		}
//	} else {
//		this.sampleMap[sample].state = true;
//	}
//	// then update according to new this[sample].state
//	if (needToUpdate) {
//		for(var i = 0; i < this.sampleMap[sample].array.length; i++) {
//			document.getElementById(this.IDPrefix + this.sampleMap[sample].array[i].getCleanID() + this.IDPostfix).checked 
//				= this.sampleMap[sample].state;
//		}
//	}
//	this.updateState(sample);
//};
//
//
//
//function UniTrack(DB, ID, TableName, Status) {
//	Track.call(this, ID, Status);
//	this.db = DB;
//	this.tableName = DB + "--" + TableName;
//	this.trackData = new SpeciesTable();
//	this.trackData.setTableName(TableName);
//	this.spcArrayUpdated = false;
//}
//extend(Track, UniTrack);
//
//UniTrack.prototype.setSpeciesTblName = function(TableName) {
//	this.trackData.setTableName(TableName);
//};
//
//UniTrack.prototype.getSpeciesTblName = function() {
//	return this.trackData.getTableName();
//};
//
//UniTrack.prototype.addSpeciesValues = function(tableName, validCount, sum, sumSquare) {
//	this.trackData.addValues(tableName, validCount, sum, sumSquare);
//	this.spcArrayUpdated = true;
//};
//
//UniTrack.prototype.addSpeciesSubTables = function(tableNames) {
//	this.trackData.addTables(tableNames);
//};
//
//UniTrack.prototype.getSpeciesSubTables = function() {
//	return this.trackData.getSubTableNames();
//};
//
//UniTrack.prototype.clearAllSpeciesValues = function() {
//	this.trackData.clear();
//	this.spcArrayUpdated = false;
//};
//
//UniTrack.prototype.isSpcArrayUpdated = function() {
//	return this.spcArrayUpdated;
//};
//
//UniTrack.prototype.getCleanID = function () {
//	return this.db + "--" + Track.prototype.getCleanID.call(this);
//}
//
//UniTrack.prototype.getReadableID = function() {
//	// strip the db part out
//	return this.getID().replace(/_+/g, ' ');
//};
//
//UniTrack.prototype.writeTable = function(speciesCmnName) {
//	// checkbox
//	var result = '<td class="trackCell"><label>\n<input id="'
//		+ this.getCleanID() + '" type="checkbox" value="dense" '
//		+ (this.status? 'checked ': '') + '/>'
//		+ this.getReadableID() + '</label>\n';
//	
//	// img
//	result += '<img class="downloadButton" src="cpbrowser/images/download.png"'
//		+ ' alt="Download data for '
//		+ this.getReadableID() + ' ' + speciesCmnName
//		+ '" id="' + this.getCleanID() + 'dlbtn" width="15"'
//		+ ' height="15" onclick="return callDownloadMenu(\''
//		+ this.tableName + '\', false, \'' + this.getCleanID()
//		+ 'dlbtn\');" />';
//		
//	// close tags
//	result += '\n</td>\n';
//	
//	return result;
//};
//
//UniTrack.prototype.updateStatus = function(conDoc) {
//	// this is to update UniTrack.status from the checkboxes;
//	// then update the hidden inputs in UCSC parts
//	// when engine changed, this should be more straightforward
//	// maybe directly sending tableNames out
//	// species needs to provide conDoc
//	
//	this.status = document.getElementById(this.getCleanID()).checked;
//	conDoc.getElementById(this.getID()).value = (this.status? 'dense': 'hide');
//};
//
//
//
//
//function UniTrackEncode(DB, ID, TableName, Status, Title, Info) {
//	UniTrack.call(this, DB, ID, TableName, Status);
//	this.title = Title;
//	this.info = Info;
//	this.sample = Info.replace(/(<([^>]+)>)/ig,"").split('\t')[0];	// regex is used to strip all html elements
//}
//extend(UniTrack, UniTrackEncode);
//
//UniTrackEncode.prototype.getCompareValue = function(length, methodind, methodall) {
//	methodall = methodall || glo_methodall;		
//	// max entry in the table, "sum" to sum up all entries, "mean" to take the mean
//	
//	methodind = methodind || glo_methodind;
//	// see method in SpeciesTableEntry.prototype.getCompareValue(method, length)
//
//	return this.trackData.getCompareValue(length, methodind, methodall);
//};
//
//UniTrackEncode.prototype.getSampleType = function() {
//	// extract sampleType from this.info
//	// maybe needs to be called in constructor
//	return this.sample;
//};
//
//UniTrackEncode.prototype.writeTable = function(speciesCmnName) {
//	// label, checkbox and title
//	var result = '<td><label>\n<input id="'
//		+ this.getCleanID() + '" type="checkbox" value="dense" '
//		+ (this.status? 'checked ': '') + '/>'
//		+ this.title + '</label>\n</td>\n';
//		
//	// info table elements
//	result += this.getInfoTable() + '\n';
//	// preview panel
//	result += '<td><div id="' + this.getCleanID() + 'Preview"></div></td>\n';
//	// download button
//	// img
//	result += '<td><img class="downloadButton" id="' + this.getCleanID() + '_edlbtn" '
//		+ 'onclick="return callDownloadMenu(\''
//		+ this.tableName + '\', false, \'' + this.getCleanID() 
//		+ '_edlbtn\', true);" src="cpbrowser/images/download.png" alt="Download data for '
//		+ this.title + ' ' + speciesCmnName + '" width="15" height="15" />';
//	// close tags
//	result += '</td>\n';
//	
//	return result;
//};
//
//UniTrackEncode.prototype.writeLongString = function() {
//	return this.title + ' - ' + this.getInfoString();
//};
//
//
//
//

//
//
//// ********************************************************
//// The following part is more integrated to UI,
//// So maybe it can be put into another separate file.
//
//
//
//
//var trackUpdatedCallback = {
//	callback: function() {
//		if (typeof(this.func) == 'function'){
//			var funcToRun = this.func;
//			var dataToFunc = this.data;
//			this.func = null;
//			this.data = null;
//			
//			var result = funcToRun(dataToFunc);
//			return result;
//		}
//		return false;
//	}
//};
//// this is to add some callback event when the tracks are done
//// basically it will call trackUpdatedCallback.callback();
//// change trackUpdatedCallback.func and trackUpdatedCallback.data as appropriate.
//
//// Check all species when done
//function allSpeciesDoneCheck(speciesArray, cmnTracksBundle, cmnTracksEncodeBundle) {
//	for(var i = 0; i < speciesArray.length; i++) {
//		//if((!isEncodeOn || spcEncode[spcDbName[i]]) && !uniTracksDone[i]) {
//		if(!speciesArray[i].uniTracksUpdated) {
//			return;
//		}
//	}
//
//	// all tracks initialized
//	// do panel initialization
//	// first common panels
//	$('#cmnTrackHolder').html('');
//	$('#uniqueHolder').html('');
//	var items = [];
//	items.push('<table width="100%"><tr>');
//	for(var i = 0; i < cmnTracksBundle.length(); i++) {
//		items.push(cmnTracksBundle.get(i).writeTable());
//		if((i % 2) && i < cmnTracksBundle.length()) {
//			items.push('</tr>\n<tr>');
//		}
//	}
//	items.push('</tr></table>\n');
//	$('#cmnTrackHolder').append(items.join(''));
//	
//	for(var i = 0; i < speciesArray.length; i++) {
//		speciesArray[i].writeUniqueTable(false);
//	}
//	
//	$('#cmnTrackEncodeTbodyHolder').html('');
//	$('#uniqueEncodeHolder').html('');
//	
//	// this is for common track ENCODE part
//	items = [];
//	for(var i = 0; i < cmnTracksEncodeBundle.length(); i++) {
//		items.push('<tr class="trackCell" id="' 
//			+ cmnTracksEncodeBundle.get(i).getCleanID() + '_tr">');
//		items.push(cmnTracksEncodeBundle.get(i).writeTable());
//		items.push('</tr>\n');
//	}
//	$('#cmnTrackEncodeTbodyHolder').append(items.join(''));
//	
//	for(var i = 0; i < speciesArray.length; i++) {
//		speciesArray[i].writeUniqueTable(true);
//	}
//	
//	$('#cmnSampleEncodeHolder').html('');
//	
//	cmnTracksEncodeBundle.writeSampleTable('cmnSampleEncodeHolder');
//	
//	$('#uniSampleEncodeHolder').html('');
//	for(var i = 0; i < speciesArray.length; i++) {
//		if (speciesArray[i].isEncode) {
//			var uniqSampleTemp = $('#uniqueSampleEncodeTemplate').html();
//			uniqSampleTemp = uniqSampleTemp.replace(/spcDbName/g, speciesArray[i].db).replace(/spcCmnName/g, speciesArray[i].commonName);
//			$('#uniSampleEncodeHolder').append(uniqSampleTemp);
//			var uniqueSampleHolderId = speciesArray[i].db + 'SampleEncodeHolder';
//			if(speciesArray[i].uniTracksEncode.writeSampleTable(uniqueSampleHolderId) <= 0) {
//				$('#' + uniqueSampleHolderId).append('<span class="settingsNormal"><em>(No unique samples)</em></span>');
//			}
//		}
//	}
//	
//	markTrackInitialized(true);
//	trackUpdatedCallback.callback();
//}
//
//function updateTracks(setIsInBrowser, hideShades) {
//	
//	hideShades = hideShades || (spcArray.activeNumber <= 1);
//	
//	// Enum all CmnTracks and UniTracks element
//	isInBrowser = (typeof setIsInBrowser === 'boolean')? setIsInBrowser: isInBrowser;
//	
//	for(var index = 0; index < cmnTracks.length(); index++) {
//		cmnTracks.get(index).updateStatus(spcArray);
//	}
//		
//	for(var index = 0; index < cmnTracksEncode.length(); index++) {
//		cmnTracksEncode.get(index).updateStatus(spcArray);
//	}
//	
//	for(var index = 0; index < spcArray.length; index++) {
//		spcArray[index].updateAllUnique();
//		spcArray[index].submitTrackChange(hideShades);
//		if(isInBrowser && spcArray[index].isActive) {
//			spcArray[index].isReady = false;
//			setUnReady(spcArray[index].db);
//		}
//	}
//	
//	markTrackInitialized(false);
//}
//
//function resetTracks() {
//	for(var index = 0; index < spcArray.length; index++) {
//		if(!isEncodeOn || spcArray[index].isEncode) {
//			var conDoc = spcArray[index].browserConDoc;
//			var conForm = conDoc.getElementById('TrackForm');
//			var resetVar = conDoc.createElement("input");
//			resetVar.type = "hidden";
//			resetVar.name = "hgt.reset";
//			resetVar.value = "TRUE";
//			conForm.appendChild(resetVar);
//			var resetOrder = conDoc.createElement("input");
//			resetOrder.type = "hidden";
//			resetOrder.name = "hgt.defaultImgOrder";
//			resetOrder.value = "TRUE";
//			conForm.appendChild(resetOrder);
//			conForm.submit();
//			if(isInBrowser && spcArray[index].isActive) {
//				spcArray[index].isReady = false;
//				setUnReady(spcArray[index].db);
//			}
//			spcArray[index].uniTracksUpdated = false;
//		}
//	}
//	markTrackInitialized(false);
//	hideWindow('trackSelect');
//}
//
