// JavaScript Document

var MILLISECONDS_WAITTIMEOUT = 20;
var INSIGNIFICANT_THRESHOLD = 2.0;

function surrogateCtor() {}
 
function extend(base, sub) {
	surrogateCtor.prototype = base.prototype;
	sub.prototype = new surrogateCtor();
	sub.prototype.constructor = sub;
}


var glo_methodind = "mean";		// global settings for method to get value in a table
var glo_methodall = "max";		// global settings for method to get value across tables in a supertrack
var glo_methodspc = "max";		// global settings for method to get value across species

function locationOf(element, array, start, end, length, methodind, methodall, methodspc, orderBySpcID) {
	// this is to return the index that element will be put AFTER
	// so if the element needs to be put to the top, it will return start-1
	start = start || 0;
	end = end || array.length;
	try {
		if(end == start || element.compareTo(array[start]) < 0) {
			return start - 1;
		}
	} catch(err) {
		console.log(element.id);
		console.log(array[start].id);
		throw(err);
	}
	try {
		var pivot = parseInt(start + (end - start) / 2, 10);
		if (end - start <= 1 
			|| element.compareTo(array[pivot], length, methodind, methodall, methodspc, orderBySpcID) == 0)
			return pivot;
		if (element.compareTo(array[pivot], length, methodind, methodall, methodspc, orderBySpcID) > 0) {
			return locationOf(element, array, pivot, end, length, methodind, methodall, methodspc, orderBySpcID);
		} else {
			return locationOf(element, array, start, pivot, length, methodind, methodall, methodspc, orderBySpcID);
		}
	} catch(err) {
		console.log(element.id + ' pivot: ' + pivot);
		console.log(array[pivot].id);
		throw(err);
	}
}

function insert(track, array, tbodyID, tbodyInsigID, length, methodind, methodall, methodspc, orderBySpcID) {
	if(insert.isRunning) {
		// prevent concurrency problems
		setTimeout(function() {
			insert(track, array, tbodyID, tbodyInsigID, length, methodind, methodall, methodspc, orderBySpcID);
		}, MILLISECONDS_WAITTIMEOUT);
		return;
	}
	insert.isRunning = true;
	try {
		var loc = locationOf(track, array);
	} catch(err) {
		console.log(err);
		insert.isRunning = false;
		return;
	}
	array.splice(loc + 1, 0, track);
	// TODO: after doing this, update DOM to replace the track in tbodyID
	if(track.isSignificant()) {
		array.sigLength++;
	}
	try {
		if(track.isSignificant() && loc < 0) {
			// should be put at top of significant tbody
			$(document.getElementById(track.getCleanID() + '_tr')).prependTo($(document.getElementById(tbodyID)));
		} else if(!track.isSignificant() && loc < array.sigLength) {
			// should be put at top of insignificant tbody
			$(document.getElementById(track.getCleanID() + '_tr')).prependTo($(document.getElementById(tbodyInsigID)));
			// show insig header
			$(document.getElementById(tbodyInsigID + 'Header')).show();
		} else {
			// should be put after the loc-th row, whatever tbody
			$(document.getElementById(track.getCleanID() + '_tr')).insertAfter($(document.getElementById(array[loc].getCleanID() + '_tr')));
		}
	} catch(err) {
		console.log(track.id);
		console.log(err);
		insert.isRunning = false;
		return;
	}
	insert.isRunning = false;
}

insert.isRunning = false;


function Track(ID, Status) {
	this.id = ID;
	this.status = (Status != "hide");
	this.info = "";				// reserved for "children"
}

Track.prototype.setStatusFromUcsc = function(ucscStatus) {
	this.status = (ucscStatus != "hide");
};

Track.prototype.getUcscStatus = function() {
	return (this.status? "dense": "hide");
};

Track.prototype.getInfoTable = function() {
	return "<td>" + this.info.replace(/\t/g, "</td>\n<td>") + "</td>";
};

Track.prototype.getID = function() {
	return this.id;
};

Track.prototype.getReadableID = function() {
	return this.getID().replace(/_+/g, ' ');
};

Track.prototype.getCleanID = function() {
	// remove blanks and brackets in IDs to conform to HTML 4.1
	return this.getID().replace(/[\s\(\)]/g, '');
};

Track.prototype.compareTo = function(target, length, methodind, methodall, methodspc, orderBySpcID) {
	// return negative value is this track's compareValue is larger than target
	// in such case the index of this will be smaller.
	return target.getCompareValue(length, methodind, methodall, methodspc, orderBySpcID)
		- this.getCompareValue(length, methodind, methodall, methodspc, orderBySpcID);
};

Track.prototype.isSignificant = function(length, methodind, methodall, methodspc, orderBySpcID) {
	return this.getCompareValue(length, methodind, methodall, methodspc, orderBySpcID)
		> INSIGNIFICANT_THRESHOLD;
};



//function TrackBundle() {
//	this.array = new Array();
//	this.map = new Object();
//}
//
//TrackBundle.prototype.addTrack = function(track) {
//	this.array.push(track);
//	this.map[track.id] = track;
//};

// class SpeciesTable is a table for all SpeciesTableEntry, 
// 		and contains individual track value in different species in a common track

function SpeciesTableEntry(name, vc, s, ss) {
	this.tableName = name;
	this.validCount = vc;
	this.sum = s;
	this.sumSquare = ss;
	//console.log(this);
}

SpeciesTableEntry.prototype.getCompareValue = function(length, method) {
	length = length || this.validCount;
	if(length <= 0) {
		return 0.0;
	}
	if(method == "mean") {
		return this.sum / length;
	} else if(method == "cv") {
		return Math.sqrt(this.sumSquare / length - (this.sum / length)^2) / (this.sum / length);
	}
	return 0.0;
};

SpeciesTableEntry.prototype.getTableName = function() {
	return this.tableName;
};


function SpeciesTable() {
	this.tableName = '';
	this.entries = [];
}

SpeciesTable.prototype.getCompareValue = function(length, methodind, methodall) {
	methodall = methodall || glo_methodall;		
	// max entry in the table, "sum" to sum up all entries, "mean" to take the mean
	
	methodind = methodind || glo_methodind;
	// see method in SpeciesTableEntry.prototype.getCompareValue(method, length)
	
	var result = 0.0;
	if(this.entries.length <= 0) {
		return result;
	}
	for(var i = 0; i < this.entries.length; i++) {
		var newresult = this.entries[i].getCompareValue(length, methodind);
		if(methodall == "max") {
			if(result < newresult) {
				result = newresult;
			}
		} else if(methodall == "sum" || methodall == "mean") {
			result += newresult;
		} 
	}
	if(methodall == "mean") {
		result /= this.entries.length;
	}
	return result;
};

SpeciesTable.prototype.addValues = function(name, vc, s, ss) {
	this.entries.push(new SpeciesTableEntry(name, vc, s, ss));
};

SpeciesTable.prototype.getTableName = function() {
	return this.tableName;
};

SpeciesTable.prototype.setTableName = function(name) {
	this.tableName = name;
};

SpeciesTable.prototype.getLength = function() {
	return this.entries.length;
};

SpeciesTable.prototype.clear = function() {
	this.entries.length = 0;
};
	


function CmnTrack(ID, Status, SpcArray) {
	Track.call(this, ID, Status);
	this.spcTables = new Object();
	if(SpcArray instanceof Array) {
		for(var i = 0; i < SpcArray.length; i++) {
			this.spcTables[SpcArray[i].db] = new SpeciesTable();
		}
	}
	this.spcArrayUpdated = false;
}
extend(Track, CmnTrack);

CmnTrack.prototype.setSpeciesTblName = function(DB, TableName) {
	this.spcTables[DB].setTableName(TableName);
};

CmnTrack.prototype.getSpeciesTblName = function(DB) {
	return this.spcTables[DB].getTableName();
};

CmnTrack.prototype.addSpeciesValues = function(DB, tableName, validCount, sum, sumSquare) {
	this.spcTables[DB].addValues(tableName, validCount, sum, sumSquare);
	this.spcArrayUpdated = true;
	for(var spcTable in this.spcTables) {
		if(this.spcTables.hasOwnProperty(spcTable)) {
			if(this.spcTables[spcTable].getLength() <= 0) {
				this.spcArrayUpdated = false;
				break;
			}
		}
	}
};

CmnTrack.prototype.clearAllSpeciesValues = function() {
	for(var spcTable in this.spcTables) {
		if(this.spcTables.hasOwnProperty(spcTable)) {
			this.spcTables[spcTable].clear();
		}
	}
	this.spcArrayUpdated = false;
};

CmnTrack.prototype.isSpcArrayUpdated = function() {
	return this.spcArrayUpdated;
};

CmnTrack.prototype.getID = function() {
	// strip the "series" in common track IDs
	return this.id.replace(/Series/g, '');
};

CmnTrack.prototype.writeTable = function() {
	// checkbox
	var result = '<td class="trackCell"><label>\n<input id="';
	result += this.getCleanID() + '" type="checkbox" value="dense" ' 
		+ (this.status? 'checked ': '') + '/>'
		+ this.getReadableID() + '</label>\n';
	
	// download button
	// img and alt
	result += '<img class="downloadButton" src="images/download.png" alt="Download data for '
		+ this.getReadableID()	+ '" width="15" height="15" id="' 
		+ this.getCleanID() + '_cmndlbtn" onclick="return callDownloadMenu(\''
		+ this.id + '\', true, \'' + this.getCleanID() 
		+ '_cmndlbtn\');" />';
	// closing tags
	result += '\n</td>\n';
	
	return result;
};




function CmnTrackEncode(ID, Status, SpcArray, Title, Info) {
	spcEncodeArray = SpcArray;
	
	// remove non-encode species
	if(spcEncodeArray instanceof Array) {
		for(var i = 0; i < spcEncodeArray.length; i++) {
			if(!spcEncodeArray[i].isEncode) {
				spcEncodeArray.splice(i, 1);
				i--;
			}
		}
	}
	
	CmnTrack.call(this, ID, Status, spcEncodeArray);
	this.title = Title;
	this.info = Info;
}
extend(CmnTrack, CmnTrackEncode);

CmnTrackEncode.prototype.getCompareValue = function(length, methodind, methodall, methodspc, orderBySpcID) {
	methodall = methodall || glo_methodall;		
	// max entry in the table, "sum" to sum up all entries, "mean" to take the mean
	
	methodind = methodind || glo_methodind;
	// see method in SpeciesTableEntry.prototype.getCompareValue(method, length)

	methodspc = methodspc || glo_methodspc;
	// see method in SpeciesTableEntry.prototype.getCompareValue(method, length)

	if(methodspc == "individual" && orderBySpcID) {
		// there is a specific ID to order
		return this.spcTables[orderBySpcID].getCompareValue(length, methodind, methodall);
	} else if(methodspc == "max") {
		var compareValue = 0.0;
		for(var spcTable in this.spcTables) {
			if(this.spcTables.hasOwnProperty(spcTable)) {
				if(compareValue < this.spcTables[spcTable].getCompareValue(length, methodind, methodall)) {
					compareValue = this.spcTables[spcTable].getCompareValue(length, methodind, methodall);
				}
			}
		}
		return compareValue;
	} else if(methodspc == "mean") {
		var compareValue = 0.0;
		var spcLength = 0;
		for(var spcTable in this.spcTables) {
			if(this.spcTables.hasOwnProperty(spcTable)) {
				compareValue += this.spcTables[spcTable].getCompareValue(methodall, methodind, length);
				spcLength++;
			}
		}
		return compareValue / spcLength;
	}
	return 0.0;
};

CmnTrackEncode.prototype.setSampleType = function() {
	// extract sampleType from this.info
	// maybe needs to be called in constructor
};

CmnTrackEncode.prototype.writeTable = function() {
	// label, checkbox and title
	var result = '<td><label>\n<input id="' + this.getCleanID()
		+ '" type="checkbox" value="dense" '
		+ (this.status? 'checked ': '') + '/>' 
		+ this.title + '</label>\n</td>\n';
		
	// info table elements
	result += this.getInfoTable() + '\n';
	// preview panel
	result += '<td><div id="' + this.getCleanID() + 'Preview"></div></td>\n';
	// download button
	// img
	result += '<img class="downloadButton" src="images/download.png" alt="Download data for '
		+ this.title + '" width="15" height="15" id="' 
		+ this.getCleanID() + '_cmnedlbtn" onclick="return callDownloadMenu(\''
		+ this.getCleanID() + '\', true, \'' + this.getCleanID() 
		+ '_cmnedlbtn\', true);" />';
	// close tags
	result += '</td>\n';
	
	return result;
};




function UniTrack(DB, ID, TableName, Status) {
	Track.call(this, DB + "--" + ID, Status);
	this.tableName = DB + "--" + TableName;
	this.trackData = new SpeciesTable();
	this.spcArrayUpdated = false;
}
extend(Track, UniTrack);

UniTrack.prototype.setSpeciesTblName = function(TableName) {
	this.trackData.setTableName(TableName);
};

UniTrack.prototype.getSpeciesTblName = function() {
	return this.trackData.getTableName();
};

UniTrack.prototype.addSpeciesValues = function(tableName, validCount, sum, sumSquare) {
	this.trackData.addValues(tableName, validCount, sum, sumSquare);
	this.spcArrayUpdated = true;
};

UniTrack.prototype.clearAllSpeciesValues = function() {
	this.trackData.clear();
	this.spcArrayUpdated = false;
};

UniTrack.prototype.isSpcArrayUpdated = function() {
	return this.spcArrayUpdated;
};

UniTrack.prototype.getReadableID = function() {
	// strip the db part out
	return this.getID().replace(/^\w+--/, '').replace(/_+/g, ' ');
};

UniTrack.prototype.getNoDbTableName = function() {
	return this.tableName.replace(/^\w+--/, '');
}

UniTrack.prototype.writeTable = function(speciesCmnName) {
	// checkbox
	var result = '<td class="trackCell"><label>\n<input id="'
		+ this.getCleanID() + '" type="checkbox" value="dense" '
		+ (this.status? 'checked ': '') + '/>'
		+ this.getReadableID() + '</label>\n';
	
	// img
	result += '<img class="downloadButton" src="images/download.png"'
		+ ' alt="Download data for '
		+ this.getReadableID() + ' ' + speciesCmnName
		+ '" id="' + this.getCleanID() + 'dlbtn" width="15"'
		+ ' height="15" onclick="return callDownloadMenu(\''
		+ this.tableName + '\', false, \'' + this.getCleanID()
		+ 'dlbtn\');" />';
		
	// close tags
	result += '\n</td>\n';
	
	return result;
};




function UniTrackEncode(DB, ID, TableName, Status, Title, Info) {
	UniTrack.call(this, DB, ID, TableName, Status);
	this.title = Title;
	this.info = Info;
}
extend(UniTrack, UniTrackEncode);

UniTrackEncode.prototype.getCompareValue = function(length, methodind, methodall) {
	methodall = methodall || glo_methodall;		
	// max entry in the table, "sum" to sum up all entries, "mean" to take the mean
	
	methodind = methodind || glo_methodind;
	// see method in SpeciesTableEntry.prototype.getCompareValue(method, length)

	return this.trackData.getCompareValue(length, methodind, methodall);
};

UniTrackEncode.prototype.setSampleType = function() {
	// extract sampleType from this.info
	// maybe needs to be called in constructor
};

UniTrackEncode.prototype.writeTable = function(speciesCmnName) {
	// label, checkbox and title
	var result = '<td><label>\n<input id="'
		+ this.getCleanID() + '" type="checkbox" value="dense" '
		+ (this.status? 'checked ': '') + '/>'
		+ this.title + '</label>\n</td>\n';
		
	// info table elements
	result += this.getInfoTable() + '\n';
	// preview panel
	result += '<td><div id="' + this.getCleanID() + 'Preview"></div></td>\n';
	// download button
	// img
	result += '<img class="downloadButton" id="' + this.getCleanID() + '_edlbtn" '
		+ 'onclick="return callDownloadMenu(\''
		+ this.getCleanID() + '\', true, \'' + this.getCleanID() 
		+ '_edlbtn\', true);" src="images/download.png" alt="Download data for '
		+ this.title + ' ' + speciesCmnName + '" width="15" height="15" />';
	// close tags
	result += '</td>\n';
	
	return result;
};




function Species(DB, Name, CommonName, IsEncode) {
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
	
	this.uniTracksUpdated = false;		// regardless of whether user has selected
	this.uniTracks = new Array();
	// this is for uniTracks, every entry is a uniTrack Object
	this.uniTracksEncode = new Array();
	// this is for Encode uniTracks, with uniTrackEncode as a child of uniTrack
	
	this.regionToShow = null;
	// this is to define the region used to show
	// (ChrRegion Object, including name, strand and coordinates)
	
	this.unsortedTbodyID = null;
	this.sortedTbodyID = null;
	this.insigTbodyID = null;
	this.insigHeaderTbodyID = null;
	
	this.orderedUniTracksEncode = new Array();
}

Species.prototype.replaceText = function(text) {
	// used to replace texts in templates
	return text.replace(/spcDbName/g, this.db).replace(/spcCmnName/g, this.commonName).replace(/spcSciName/g, this.name);
};

Species.prototype.writeUniqueTable = function(isencode) {
	if(!isencode) {
		var uniqTemp = $('#uniqueTemplate').html();
		uniqTemp = this.replaceText(uniqTemp);
		$('#uniqueHolder').append(uniqTemp);
		
		var uniqueHolderId = '#' + this.db + 'TableHolder';
		
		if(this.uniTracks.length > 0) {
			items = [];
			items.push('<table width="100%"><tr>')
			for(var j = 0; j < this.uniTracks.length; j++) {
				items.push(this.uniTracks[j].writeTable(this.commonName));
				if((j % 2) && j < this.uniTracks.length) {
					items.push('</tr>\n<tr>')
				}
			}
			items.push('</tr></table>\n');
			$(uniqueHolderId).append(items.join(''));
		} else {
			$(uniqueHolderId).append('<span class="settingsNormal">'
				+ '<em>(No unique tracks)</em></span>');
		}
	} else if(this.isEncode) {
		var uniqTemp = $('#uniqueEncodeTemplate').html();
		uniqTemp = this.replaceText(uniqTemp);
		$('#uniqueEncodeHolder').append(uniqTemp);
		
		this.unsortedTbodyID = this.db + 'EncodeTbodyHolder';
		this.sortedTbodyID = this.db + 'EncodeSortedTbodyHolder';
		this.insigTbodyID = this.db + 'EncodeInsigTbodyHolder';

		this.orderedUniTracksEncode.length = 0;	// this is the sorted common track array
		this.orderedUniTracksEncode.sigLength = 0;	// number of tracks that have significant results
		
		if(this.uniTracksEncode.length > 0) {
			items = [];
			for(var j = 0; j < this.uniTracksEncode.length; j++) {
				items.push('<tr class="trackCell" id="' 
					+ this.uniTracksEncode[j].getCleanID() + '_tr">');
				items.push(this.uniTracksEncode[j].writeTable(this.commonName));
				items.push('</tr>\n')
			}
			$(document.getElementById(this.unsortedTbodyID)).append(items.join(''));
		} else {
			$(document.getElementById(this.unsortedTbodyID)).append('<tr><td colspan="5"><span class="settingsNormal">'
				+ '<em>(No unique tracks)</em></span></td></tr>');
		}
	}
};

Species.prototype.setReady = function(speciesArray, cmnTracksBundle, cmnTracksEncodeBundle, init, inbrowser) {
	var conDoc = (document.getElementById(this.db + "_controls").contentWindow 
		|| document.getElementById(this.db + "_controls").contentDocument);
	if(conDoc.document) {
		conDoc = conDoc.document;
	}
	if(init) {		
		// tracks need to be initialized or need to be changed so fill the unique ones
		// after filling this one, check whether all tracks initialized 
		// if so, initialize the settings panel
		
		var uniTracksNew = (this.uniTracks.length <= 0);

		var hiddenCommons = conDoc.getElementById("TrackControls").getElementsByTagName("input");
		// get all the hidden inputs in the browser "common" part
		
		for(var i = 0; i < hiddenCommons.length; i++) {
			var currentTrack;
			if(typeof cmnTracksBundle.map[hiddenCommons[i].id] == 'undefined') {
				currentTrack = new CmnTrack(hiddenCommons[i].id, 
					hiddenCommons[i].value, speciesArray);
				cmnTracksBundle.push(currentTrack);
				cmnTracksBundle.map[hiddenCommons[i].id] = currentTrack;
			} else {
				currentTrack = cmnTracksBundle.map[hiddenCommons[i].id];
			}
			currentTrack.setStatusFromUcsc(hiddenCommons[i].value);
			currentTrack.setSpeciesTblName(this.db, hiddenCommons[i].name);
			// this happens even there is already entry in cmnTracksTableNames
			// Notice that this hiddenCommons[i].name is not Short Label
		}
		
		hiddenCommons = conDoc.getElementById("TrackControlsEncode").getElementsByTagName("input");
		var hiddenCommonsEncodeData = conDoc.getElementById("TrackControlsEncode").getElementsByTagName("span")
		// get all the hidden inputs in the browser "common" part
		
		for(var i = 0; i < hiddenCommons.length; i++) {
			if(typeof cmnTracksEncodeBundle.map[hiddenCommons[i].id] == 'undefined') {
				currentTrack = new CmnTrackEncode(hiddenCommons[i].id, 
					hiddenCommons[i].value, speciesArray, 
					hiddenCommonsEncodeData[hiddenCommons[i].id + "_title"].innerHTML, 
					hiddenCommonsEncodeData[hiddenCommons[i].id + "_data"].innerHTML);
				cmnTracksEncodeBundle.push(currentTrack);
				cmnTracksEncodeBundle.map[hiddenCommons[i].id] = currentTrack;
			} else {
				currentTrack = cmnTracksEncodeBundle.map[hiddenCommons[i].id];
			}
			currentTrack.setStatusFromUcsc(hiddenCommons[i].value);
			currentTrack.setSpeciesTblName(this.db, hiddenCommons[i].name);
		}
		
		var hiddenUniques;
		if(conDoc.getElementById("TrackUnique") !== null && conDoc.getElementById("TrackUnique") !== undefined) {
			hiddenUniques = conDoc.getElementById("TrackUnique").getElementsByTagName("input");
			// get all the hidden inputs in the browser "common" part
			
			for(var i = 0; i < hiddenUniques.length; i++) {
				if(uniTracksNew) {
					this.uniTracks.push(new UniTrack(this.db, hiddenUniques[i].id, 
						hiddenUniques[i].name, hiddenUniques[i].value));
				} else {
					this.uniTracks[i].setStatusFromUcsc(hiddenUniques[i].value);
				}
			}
		}
		
		if(conDoc.getElementById("TrackUniqueEncode") !== null && conDoc.getElementById("TrackUniqueEncode") !== undefined) {
			hiddenUniques = conDoc.getElementById("TrackUniqueEncode").getElementsByTagName("input");
			var hiddenUniquesEncodeData = conDoc.getElementById("TrackUniqueEncode").getElementsByTagName("span")
			// get all the hidden inputs in the browser "common" part
			
			for(var i = 0; i < hiddenUniques.length; i++) {
				if(uniTracksNew) {
					this.uniTracksEncode.push(new UniTrackEncode(this.db, hiddenUniques[i].id,
						hiddenUniques[i].name, hiddenUniques[i].value,
						hiddenUniquesEncodeData[hiddenUniques[i].id + "_title"].innerHTML,
						hiddenUniquesEncodeData[hiddenUniques[i].id + "_data"].innerHTML));
				} else {
					this.uniTracksEncode[i].setStatusFromUcsc(hiddenUniques[i].value);
				}
			}
		}
		
		this.uniTracksUpdated = true;
	}
	if(inbrowser) {
		callViewChange(this.db, "refresh");
	}
	allSpeciesDoneCheck(speciesArray, cmnTracksBundle, cmnTracksEncodeBundle);
	//markTrackInitialized(true);
	
};

function ChrRegion(chrString) {
	var cleanedChrString = chrString.replace(/,/g, '')
		.replace(/\(\s*-\s*\)/g, ' NEGSTR').replace(/\(\s*\+\s*\)/g, ' POSSTR');
	var elements = cleanedChrString.split(/[:-\s]+/);
	this.chr = elements[0];
	this.start = parseInt(elements[1]);
	this.end = parseInt(elements[2]);
	this.strand = ((elements.length < 3)? null: ((elements[3] == 'NEGSTR')? false: true));
}

ChrRegion.prototype.regionFromString = function(regionString) {
	var cleanedChrString = chrString.replace(/,/g, '')
		.replace(/\(\s*-\s*\)/g, ' NEGSTR').replace(/\(\s*\+\s*\)/g, ' POSSTR');
	var elements = cleanedChrString.split(/[:-\s]+/);
	this.chr = elements[0];
	this.start = parseInt(elements[1]);
	this.end = parseInt(elements[2]);
	this.strand = ((elements.length < 3)? this.strand: ((elements[3] == 'NEGSTR')? false: true));
}

ChrRegion.prototype.regionToString = function(includeStrand) {
	// default is including strand
	if (includeStrand == null) {
		includeStrand = true;
	}
	return this.chr + ':' + this.start + '-' + this.end
		+ ((!includeStrand || this.strand === null)? '': (' ('
		+ (this.strand? '+': '-') + ')'));
};

ChrRegion.prototype.toString = function() {
	// default is including strand
	return this.regionToString(true);
};

ChrRegion.prototype.setStrand = function(newStr) {
	switch(typeof(newStr)) {
		case "string":
			this.strand = !(newStr.indexOf('-') > 0 || newStr.indexOf('0') > 0);
			break;
		case "number":
			this.strand = (newStr > 0);
			break;
		case "boolean":
			this.strand = newStr;
			break;
		default:
			this.strand = newStr? true: false;
	}
	return this.strand;
};

ChrRegion.prototype.getStrand = function(flankbefore, flankafter) {
	return ((typeof(flankbefore) == "string")? flankbefore: '')
		+ this.strand? '+': '-'
		+ ((typeof(flankafter) == "string")? flankafter: '');
};

function SpcGene(spcGeneName, coorAsString) {
	ChrRegion.call(this, coorAsString);
	this.name = spcGeneName;
}
extend(ChrRegion, SpcGene);

SpcGene.prototype.getShortName = function() {
	if(this.name.length > 11) {
		return this.name.substr(0, 6) + "..." + this.name.substr(this.name.length - 4);
	} else {
		return this.name;
	}
};

function Gene(commonname) {
	this.name = commonname;
	this.spcGenes = new Array();
	// note that some species may be inactive, then null will be supplied 
}

Gene.prototype.pushSpcGene = function(spcGeneName, coorAsString) {
	if(spcGeneName == null) {
		this.spcGenes.push(null);
	} else {
		this.spcGenes.push(new SpcGene(spcGeneName, coorAsString));
	}
};

Gene.prototype.getCleanName = function() {
	// clean the gene name of weird characters such as '.'
	return this.name.replace(/\./g, "\\.");
};
