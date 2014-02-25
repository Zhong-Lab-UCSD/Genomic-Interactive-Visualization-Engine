<?php
	require_once(realpath(dirname(__FILE__) . "/../../includes/session.php"));
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>Untitled Document</title>
<script type="text/javascript" src="js/jquery-1.7.js"></script>
<script language="javascript">

function surrogateCtor() {}
 
function extend(base, sub) {
  surrogateCtor.prototype = base.prototype;
  sub.prototype = new surrogateCtor();
  sub.prototype.constructor = sub;
}


var spcArray = new Array();		// this will be the array of species (Species Object)

var cmnTracks = new Array();	// this will be holding common tracks (CmnTrack Object)
cmnTracks.map = new Object();	// this is used to store all cmnTrack IDs to prevent duplication

var cmnTracksEncode = new Array();	// this will be holding common Encode tracks (CmnTrack Object)
cmnTracksEncode.map = new Object();	// this is used to store all cmn Encode Track IDs to prevent duplication

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
}

Track.prototype.getReadableID = function() {
	return this.getID().replace(/_+/g, ' ');
}

Track.prototype.getCleanID = function() {
	// remove blanks and brackets in IDs to conform to HTML 4.1
	return this.getID().replace(/[\s\(\)]/g, '');
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



function CmnTrack(ID, Status, SpcArray) {
	Track.call(this, ID, Status);
	this.tableNames = new Object();
	if(SpcArray instanceof Array) {
		for(var i = 0; i < SpcArray.length; i++) {
			this.tableNames[SpcArray[i].db] = "";
		}
	}
}
extend(Track, CmnTrack);

CmnTrack.prototype.setSpeciesTblName = function(DB, TableName) {
	this.tableNames[DB] = TableName;
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
	// div
	result += '<div style="float:right; margin: 2px;" id="' 
		+ this.getCleanID() + '_cmndlbtn">';
	// a
	result += '<a href="#" onclick="return callDownloadMenu(\''
		+ this.id + '\', true, \''	+ this.getCleanID() 
		+ '_cmndlbtn\');">\n';
	// img and alt
	result += '<img src="images/download.png" alt="Download data for '
		+ this.getReadableID()	+ '" width="15" height="15" />';
		
	// closing tags
	result += '</a></div>\n</td>\n';
	
	return result;
};




function CmnTrackEncode(ID, Status, SpcArray, Title, Info) {
	CmnTrack.call(this, ID, Status, SpcArray);
	this.title = Title;
	this.info = Info;
}
extend(CmnTrack, CmnTrackEncode);

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
	// div
	result += '<td><div style="margin: 2px;" id="' 
		+ this.getCleanID() + '_cmnedlbtn">';
	// a
	result += '<a href="#" onclick="return callDownloadMenu(\''
		+ this.getCleanID() + '\', true, \'' + this.getCleanID() 
		+ '_cmnedlbtn\', true);">\n';
	// img
	result += '<img src="images/download.png" alt="Download data for '
		+ this.title + '" width="15" height="15" />';
	// close tags
	result += '</a></div></td>\n';
	
	return result;
};




function UniTrack(DB, ID, TableName, Status) {
	Track.call(this, DB + "::" + ID, Status);
	this.tableName = DB + "::" + TableName;
}
extend(Track, UniTrack);

UniTrack.prototype.getReadableID = function() {
	// strip the db part out
	return this.getID().replace(/^\w+::/, '').replace(/_+/g, ' ');
};

UniTrack.prototype.getNoDbTableName = function() {
	return this.tableName.replace(/^\w+::/, '');
}

UniTrack.prototype.writeTable = function(speciesCmnName) {
	// checkbox
	var result = '<td class="trackCell"><label>\n<input id="'
		+ this.getCleanID() + '" type="checkbox" value="dense" '
		+ (this.status? 'checked ': '') + '/>'
		+ this.getReadableID() + '</label>\n';
	
	// div
	result += '<div style="float:right; margin: 2px;" id="'
		+ this.getCleanID() + 'dlbtn">';
	// a
	result += '<a href="#" onclick="return callDownloadMenu(\''
		+ this.tableName + '\', false, \'' + this.getCleanID()
		+ 'dlbtn\');">\n';
	// img
	result += '<img src="images/download.png" alt="Download data for '
		+ this.getReadableID() + ' ' + speciesCmnName
		+ '" width="15" height="15" />';
		
	// close tags
	result += '</a></div>\n</td>\n';
	
	return result;
};




function UniTrackEncode(DB, ID, TableName, Status, Title, Info) {
	UniTrack.call(this, DB, ID, TableName, Status);
	this.title = Title;
	this.info = Info;
}
extend(UniTrack, UniTrackEncode);

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
	// div
	result += '<td><div style="margin: 2px;" id="' 
		+ this.getCleanID() + '_edlbtn">';
	// a
	result += '<a href="#" onclick="return callDownloadMenu(\''
		+ this.getCleanID() + '\', true, \'' + this.getCleanID() 
		+ '_edlbtn\', true);">\n';
	// img
	result += '<img src="images/download.png" alt="Download data for '
		+ this.title + ' ' + speciesCmnName + '" width="15" height="15" />';
	// close tags
	result += '</a></div></td>\n';
	
	return result;
};




function Species(DB, Name, CommonName, IsEncode) {
	this.isReady = false;
	// this is for navigation thing
	this.isActive = true;
	// if user has not selected this species, then it will become false;
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
}

Species.prototype.replaceText = function(text) {
	// used to replace texts in templates
	return text.replace(/spcDbName/g, this.db).replace(/spcCmnName/g, this.commonName).replace(/spcSciName/g, this.name);
}

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
		
		var uniqueHolderId = '#' + this.db + 'EncodeTbodyHolder';
		
		if(this.uniTracksEncode.length > 0) {
			items = [];
			for(var j = 0; j < this.uniTracksEncode.length; j++) {
				items.push('<tr class="trackCell">');
				items.push(this.uniTracksEncode[j].writeTable(this.commonName));
				items.push('</tr>\n')
			}
			$(uniqueHolderId).append(items.join(''));
		} else {
			$(uniqueHolderId).append('<tr><td colspan="5"><span class="settingsNormal">'
				+ '<em>(No unique tracks)</em></span></td></tr>');
		}
	}
}

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



function allSpeciesDoneCheck(speciesArray, cmnTracksBundle, cmnTracksEncodeBundle) {
	for(var i = 0; i < speciesArray.length; i++) {
		//if((!isEncodeOn || spcEncode[spcDbName[i]]) && !uniTracksDone[i]) {
		if(!speciesArray[i].uniTracksUpdated) {
			return;
		}
	}

	// all tracks initialized
	// do panel initialization
	// first common panels
	$('#cmnTrackHolder').html('');
	$('#uniqueHolder').html('');
	var items = [];
	items.push('<table width="100%"><tr>');
	for(var i = 0; i < cmnTracksBundle.length; i++) {
		items.push(cmnTracksBundle[i].writeTable());
		if((i % 2) && i < cmnTracksBundle.length) {
			items.push('</tr>\n<tr>');
		}
	}
	items.push('</tr></table>\n');
	$('#cmnTrackHolder').append(items.join(''));
	
	for(var i = 0; i < speciesArray.length; i++) {
		speciesArray[i].writeUniqueTable(false);
	}
	
	$('#cmnTrackEncodeTbodyHolder').html('');
	$('#uniqueEncodeHolder').html('');
	
	// this is for common track ENCODE part
	items = [];
	for(var i = 0; i < cmnTracksEncodeBundle.length; i++) {
		items.push('<tr class="trackCell">');
		items.push(cmnTracksEncodeBundle[i].writeTable());
		items.push('</tr>\n');
	}
	$('#cmnTrackEncodeTbodyHolder').append(items.join(''));
	
	for(var i = 0; i < speciesArray.length; i++) {
		speciesArray[i].writeUniqueTable(true);
	}
	
	$('#cmnSampleEncodeHolder').html('');
	
	items = [];
	for(var sample in cmnTracksSampleType) {
		if(cmnTracksSampleType.hasOwnProperty(sample)) {
			items.push('<input type="checkbox" id="' + sample 
				+ '_checkbox" onclick="callCommonSampleChange(\'' + sample + '\')" '
				+ 'checked' + ' />' 
				+ sample + '<br />');
		}
	}
	$('#cmnSampleEncodeHolder').append(items.join(''));
	
	for(var i = 0; i < uniTracksSampleType.length; i++) {
		if(isEncodeOn && !spcEncode[spcDbName[i]]) {
			continue;
		}
		var uniqSampleTemp = $('#uniqueSampleEncodeTemplate').html();
		uniqSampleTemp = uniqSampleTemp.replace(/spcDbName/g, spcDbName[i]).replace(/spcCmnName/g, spcCmnName[spcDbName[i]]);
		$('#uniSampleEncodeHolder').append(uniqSampleTemp);
		
		var uniqueSampleHolderId = '#' + spcDbName[i] + 'SampleEncodeHolder';
		var uniqueSampleNumbers = 0;
		items = [];
		for(var sample in uniTracksSampleType[i]) {
			if(uniTracksSampleType[i].hasOwnProperty(sample)) {
				items.push('<input type="checkbox" id="' + spcDbName[i] + sample 
					+ '_checkbox" onclick="callUniqueSampleChange(' + i + ', \'' + sample + '\')" />' 
					+ sample + '<br />');
				uniqueSampleNumbers++;
			}
		}
		$(uniqueSampleHolderId).append(items.join(''));
		if(uniqueSampleNumbers <= 0) {
			$(uniqueSampleHolderId).append('<span class="settingsNormal"><em>(No unique samples)</em></span>');
		}
	}			
	
}

function ChrRegion(chrString) {
	var cleanedChrString = chrString.replace(/,/g, '')
		.replace(/\(\s*-\s*\)/g, ' NEGSTR').replace(/\(\s*\+\s*\)/g, ' POSSTR');
	var elements = cleanedChrString.split(/[:-\s]+/);
	this.chr = elements[0];
	this.start = parseInt(elements[1]);
	this.end = parseInt(elements[2]);
	this.strand = ((elements.length < 3)? true: ((elements[3] == 'NEGSTR')? false: true));
}
ChrRegion.prototype.toString = function() {
	return this.chr + ':' + this.start + '-' + this.end + ' ('
		+ (this.strand? '+': '-') + ')';
};


var timeoutVar;
var timerOn = 0;
var gListIsOn = 0;
var currentGeneName = "";
var numSpc = 0;				// this is the number of species IN DISPLAY
var speciesCoor = {};
var speciesStrand = {};
var speciesGeneName = {};
var numSpcReady = 0;
var mouseInGList = false;
var inFocus = false;
var maxGeneListHeight;

var spcNum = 0;				// this is the total number of species
var spcNumVisible = spcNum;	// number of species that have their panel expanded
var spcNumEnabled = 0;
var spcDbName = new Array();
var spcCmnName = new Object();
var spcName = new Object();
var spcEncode = new Object();

var spcReady = new Object();

//var cmnTracks = new Array();			// this is the array placing the common tracks
//var cmnTracksStatus = new Object();			// this is the array placing the common tracks
//var cmnTracksTableNames = new Object();	
//// this is the "associative array" linking compSeries name to 
//// an "associative array" of db/table names sent to download
//
//var uniTracks = new Array();			// this is an array of arrays placing the unique tracks
//var uniTracksStatus = new Array();			// this is an array of arrays placing the unique tracks
//var uniTracksTableNames = new Array();
//var uniTracksDone = new Array();
//
//var cmnTracksEncode = new Array();			// this is the array placing the common tracks
//var cmnTracksEncodeStatus = new Object();			// this is the array placing the common tracks
//var cmnTracksEncodeTrackTitle = new Object();			
//// notice that ENCODE track titles are different from compSeries values
//var cmnTracksEncodeTableNames = new Object();	
//var cmnTracksEncodeTrackInfo = new Object();	
//// this is the "associative array" linking compSeries name to 
//// an "associative array" of db/table names sent to download
//
//var uniTracksEncode = new Array();			// this is an array of arrays placing the unique tracks
//var uniTracksEncodeStatus = new Array();			// this is an array of arrays placing the unique tracks
//var uniTracksEncodeTableNames = new Array();
//var uniTracksEncodeTrackTitle = new Array();
//var uniTracksEncodeTrackInfo = new Array();	

var cmnTracksSampleType = new Object();		// link sample name to array of tracks
var uniTracksSampleType = new Array();
var cmnTracksStatusBackup = new Object();	// this is to backup the selection states of tracks for sample selection
var uniTracksStatusBackup = new Array();

//var listPanels = new Array('trackSettings', 'tableBrowser');

var isInDownload = false;

var isInBrowser = false;
var tracksInitialized = false;

var speciesRegions = new Object();

var isEncodeOn = true;			// Switch this to on to make ENCODE data as default, 

function validate_form() {
	// Now is the real Ajax part.
	if($("#allDataSingleRegion").val() != "on") {
		var postdata = {};
	//	speciesDbName = new Array();
		$.each($('#searchform').serializeArray(), function(i, field) {
	//		if($('#' + field.name).is("checkbox")) {
	//			speciesDbName.push(field.name);
	//		}
			postdata[field.name] = field.value;
			});
		$.post("regionsearch.php<?php echo $in_debug? "?Debug=XCDebug": ""; ?>", postdata, function (data) {
			$("#contentHolder").html(data);
		});
		return false;
	} else {
		return true;
	}
}

function downloadAll() {
	// Now is the real Ajax part.
//	speciesDbName = new Array();
	$("#allDataSingleRegion").val("on");
	$("#searchform").submit();
	$("#allDataSingleRegion").val("off");
}

function setTrackReady(index) {
	spcArray[index].setReady(spcArray, cmnTracks, cmnTracksEncode, !tracksInitialized, isInBrowser);
}

function callCommonSampleChange(sample) {
	// TODO: may implement tri-state later
	// now it's only bi-state
	
	// find all affecting checkboxes
	for(var i = 0; i < cmnTracksSampleType[sample].length; i++) {
		document.getElementById(cmnTracksSampleType[sample][i]).checked 
			= document.getElementById(sample + '_checkbox').checked;
	}
}

function callUniqueSampleChange(index, sample) {
	// TODO: may implement tri-state later
	// now it's only bi-state
	
	// find all affecting checkboxes
	for(var i = 0; i < uniTracksSampleType[index][sample].length; i++) {
		document.getElementById(uniTracksSampleType[index][sample][i]).checked 
			= document.getElementById(spcDbName[index] + sample + '_checkbox').checked;
	}
}

function createJSONReturnFunction(isCommon, iTrack, iSpecies) {
	if(isCommon) {
		return function(data) {
			var items = [];
			items.push($(document.getElementById(cmnTracksEncode[iTrack].getCleanID() + 'Preview')).html());
			items.push('[' + spcArray[iSpecies].db + ']'); 
			$.each(data, function(key, val) {
				items.push(key + ": " + val);
				items.push("<br />");
			});
			$(document.getElementById(cmnTracksEncode[iTrack].getCleanID() + 'Preview')).html(items.join(' '));
		};
	} else {
		return function(data) {
			var items = [];
			items.push($(document.getElementById(spcArray[iSpecies].uniTracksEncode[iTrack].getCleanID() + 'Preview')).html());
			//items.push(spcDbName[iSpecies]); 
			$.each(data, function(key, val) {
				items.push(key + ": " + val);
				items.push("<br />");
			});
			$(document.getElementById(spcArray[iSpecies].uniTracksEncode[iTrack].getCleanID() + 'Preview')).html(items.join(' '));
		}
	}
}

function searchTracks() {
	for(var i = 0; i < spcArray.length; i++) {
		spcArray[i].regionToShow = new ChrRegion($('#regionToShow').val());
	}
	for(var j = 0; j < cmnTracksEncode.length; j++) {
		// send across all species
		$('#' + cmnTracksEncode[j].getCleanID() + 'Preview').html('');
		for(var i = 0; i < spcArray.length; i++) {
			if(isEncodeOn && !spcArray[i].isEncode) {
				continue;
			}
			var sendData = new Object();
			sendData['region'] = spcArray[i].regionToShow.toString();
			//console.log(spcArray[i].regionToShow.toString());
			sendData['tableName'] = cmnTracksEncode[j].tableNames[spcArray[i].db];
			sendData['db'] = spcArray[i].db;
			$.getJSON('getpreview.php', sendData, createJSONReturnFunction(true, j, i));
		}
	}
	for(var i = 0; i < spcArray.length; i++) {
		if(isEncodeOn && !spcArray[i].isEncode) {
			continue;
		}
		for(var j = 0; j < spcArray[i].uniTracksEncode.length; j++) {
			var sendData = new Object();
			sendData['region'] = spcArray[i].regionToShow.toString();
			//console.log(spcArray[i].regionToShow.toString());
			sendData['tableName'] = spcArray[i].uniTracksEncode[j].getNoDbTableName();
			sendData['db'] = spcArray[i].db;
			$.getJSON('getpreview.php', sendData, createJSONReturnFunction(false, j, i));
		}
	}
	
}

</script>
<link href="mainstyles.css" rel="stylesheet" type="text/css" />
</head>

<body>
<?php
	$mysqli = connectCPB();
	// TODO: need to do something about the species here
	// first connect to database and find the number of species
	$species = $mysqli->query("SELECT * FROM species");
	$spcinfo = array();
	while($spcitor = $species->fetch_assoc()) {
		// get all the species ready
		//	if(isset($_REQUEST[$spcitor["dbname"]])) { should use this later
		$spcinfo[] = $spcitor;
	}
	$num_spc = sizeof($spcinfo);
	for($i = 0; $i < $num_spc; $i++) {
		
?>
<script type="text/javascript">
				spcArray.push(new Species("<?php echo $spcinfo[$i]["dbname"]; ?>", 
					"<?php echo $spcinfo[$i]["name"]; ?>", "<?php echo $spcinfo[$i]["commonname"]; ?>",
					<?php echo ($spcinfo[$i]["encode"]? "true": "false"); ?>));
			  </script>
<div id="<?php echo $spcinfo[$i]["dbname"]; ?>_checkbox" >
  <label>
    <input type="checkbox" name="<?php echo $spcinfo[$i]["dbname"]; ?>" id="<?php echo $spcinfo[$i]["dbname"]; ?>" value="<?php echo $spcinfo[$i]["dbname"]; ?>" checked <?php if($i == 0) echo "disabled"; ?> />
    <em><?php echo $spcinfo[$i]["name"]; ?></em> (<?php echo $spcinfo[$i]["commonname"]; ?>)
    [<?php echo $spcinfo[$i]["dbname"]; ?>]</label>
</div>
<?php
	}
	$species->free();
	$mysqli->close();
?>
<div class="headerNoHover">Tracks &amp; Data 
  <!--<div class="header buttons" id="EncodeDataButton" style="float: right; padding: 2px 3px; margin: -3px 5px -3px -2px;"
    onclick="toggleEncode();">View ENCODE Data</div>
  <div style="clear: both;"></div>--> 
</div>
<div class="settingsNormal">Tracks can be turn on/off via the checkboxes below. </div>
<div id="EncodeData" style="overflow-y: auto;">
  <div id="regionOfInterest">
    <input type="text" name="regionToShow" id="regionToShow" value="chr1:12345678-12456789" />
    <div class="header buttons" style="display: inline; padding: 2px 3px; margin: -3px 0px -3px -2px;"
onclick="searchTracks();">Search through Tracks</div>
  </div>
  <div class="subBox ENCODETracks">
    <div class="subHeader" onclick="toggleSubPanel('cmnTrackEncode', false);"> <span class="headerIndicator" id="cmnTrackEncodeIndicator">[-]</span> Common tracks from ENCODE</div>
    <div class="trackHolder" id="cmnTrackEncodeHolder">
      <table width="100%" style="border-collapse: collapse; border-spacing: 0;">
        <thead>
          <tr class="trackHeaderEncode">
            <th style="width: 25%;">Track Name</th>
            <th>Sample Type</th>
            <th style="width: 50%;">Preview</th>
            <th style="width: 5%;">Data</th>
          </tr>
        </thead>
        <tbody id="cmnTrackEncodeSortedTbodyHolder" style="display: none;">
        </tbody>
        <tbody id="cmnTrackEncodeInsigHeaderTbodyHolder" style="display: none;">
          <tr class="insigHeader" onclick="toggleSubPanel('cmnTrackEncodeInsigTbody', false);">
            <td colspan="4">Tracks with insignificant signals within the region are folded, click here to expand.</td>
          </tr>
        </tbody>
        <tbody id="cmnTrackEncodeInsigTbodyHolder" style="display: none;">
        </tbody>
        <tbody id="cmnTrackEncodeTbodyHolder">
        </tbody>
      </table>
    </div>
  </div>
  <div class="subBox ENCODETracks">
    <div class="subHeader" onclick="toggleSubPanel('uniqueEncode', false);"> <span class="headerIndicator" id="uniqueEncodeIndicator">[-]</span> Unique tracks from ENCODE</div>
    <div id="uniqueEncodeHolder"></div>
  </div>
</div>
<div style="display: none;">
  <?php
	for($i = 0; $i < $num_spc; $i++) {
?>
  <iframe onload="setTrackReady(<?php echo $i; ?>);" id="<?php echo $spcinfo[$i]["dbname"] . "_controls"; ?>" 
     name="<?php echo $spcinfo[$i]["dbname"] . "_controls"; ?>" src="<?php 
  echo "/cgi-bin/hgTracks?clade=mammal&org=" . $spcinfo[$i]["commonname"] . "&db=" . $spcinfo[$i]["dbname"] . "&Submit=submit&hgsid=" . ($_SESSION['ID']*10 + $i) 
  . '&showEncode=' . ($encodeOn? 'on': 'off') . "&hgControlOnly=on"; 
  ?>">Your browser doesn't support &lt;iframe&gt; tag. You need a browser supporting &lt;iframe&gt; tag to use Comparison Browser. (Latest versions of mainstream browsers should all support this tag.)</iframe>
  <?php
	}
    ?>
</div>
<form target="_blank" id="searchform" name="searchform" method="post" action="regionsearch.php" onsubmit="return validate_form();">
  <p>
    <label for="wigfile">wigFile</label>
    <br />
    <textarea name="wigfile" cols="100" rows="5" id="wigfile">http://hgdownload.cse.ucsc.edu/goldenPath/hg19/encodeDCC/wgEncodeBroadHistone/wgEncodeBroadHistoneA549H3k04me3Dex100nmSig.bigWig
http://hgdownload.cse.ucsc.edu/goldenPath/hg19/encodeDCC/wgEncodeBroadHistone/wgEncodeBroadHistoneA549H3k09acEtoh02Sig.bigWig
http://hgdownload.cse.ucsc.edu/goldenPath/hg19/encodeDCC/wgEncodeBroadHistone/wgEncodeBroadHistoneA549H3k09me3Etoh02Sig.bigWig
    </textarea>
    <br />
    <label for="region">Region<br />
    </label>
    <textarea name="region" id="region" cols="100" rows="5">chr1:12345678-12456789</textarea>
  </p>
  <p>
    <input name="allDataSingleRegion" type="hidden" id="allDataSingleRegion" value="off" />
    <input type="submit" />
    <input type="button" value="Download" onclick="downloadAll();" />
  </p>
</form>
<div style="display: none;" id="uniqueTemplate">
  <div class="speciesTrackHeader">spcCmnName</div>
  <div class="trackHolder" id="spcDbNameTableHolder"></div>
</div>
<div style="display: none;" id="uniqueEncodeTemplate">
  <div class="speciesTrackHeader">spcCmnName</div>
  <div class="trackHolder" id="spcDbNameEncodeTableHolder">
    <table width="100%" style="border-collapse: collapse; border-spacing: 0;">
      <thead>
        <tr class="trackHeaderEncode">
          <th style="width: 20%;">Track Name</th>
          <th style="width: 20%;">Sample Type</th>
          <th>Lab</th>
          <th style="width: 40%;">Preview</th>
          <th style="width: 7%;">Data</th>
        </tr>
      </thead>
      <tbody id="spcDbNameEncodeSortedTbodyHolder" style="display: none;">
      </tbody>
      <tbody id="spcDbNameEncodeInsigHeaderTbodyHolder" style="display: none;">
        <tr class="insigHeader" onclick="toggleSubPanel('spcDbNameEncodeInsigTbody', false);">
          <td colspan="5">Tracks with insignificant signals within the region are folded, click here to expand.</td>
        </tr>
      </tbody>
      <tbody id="spcDbNameEncodeInsigTbodyHolder" style="display: none;">
      </tbody>
      <tbody id="spcDbNameEncodeTbodyHolder">
      </tbody>
    </table>
  </div>
</div>
<div style="display: none;" id="uniqueSampleEncodeTemplate">
  <div class="speciesTrackHeader">spcCmnName</div>
  <div class="trackHolder" id="spcDbNameSampleEncodeHolder"></div>
</div>
<div id="contentHolder"></div>
</body>
</html>