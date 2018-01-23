// JavaScript Document
// Require regionlistui.js
// Require sessionControl.js

ChrRegionToShow.prototype.assimilate = function(region) {
	if(!this.overlaps(region)) {
		return null;
	}
	this.start = parseInt(Math.min(this.start, region.start));
	this.end = parseInt(Math.max(this.end, region.end));
	var regionExtendedStart = region.extendedstart || region.start;
	var regionExtendedEnd = region.extendedend || region.end;
	this.extendedstart = parseInt(Math.min(this.extendedstart, regionExtendedStart));
	this.extendedend = parseInt(Math.max(this.extendedend, regionExtendedEnd));
	if (region.data.hasOwnProperty('track')) {
		if (!this.data.hasOwnProperty('track')) {
			this.data['track'] = new Array();
			this.data['track'].map = new Object();
		} else if (typeof(this.data['track']) == 'string') {
			this.data['track'] = [this.data['track']];
			this.data['track'].map = new Object();
			this.data['track'].map[this.data['track'][0]] = true;
		}
//		if($.isArray(region.data['track'])) {
//			$.each(region.data['track'], function(key, val) {
//				this.data['track'].push(val);
//			});
//		} else {
//			this.data['track'].push(region.data['track']);
//		}
		if(this.data['track'].map[region.data['track']] !== true) {
			this.data['track'].push(region.data['track']);
			this.data['track'].map[region.data['track']] = true;
		}
	}
	return this;
}

function mergeGeneList(glist, spcArray) {
	// merge all geneList
	// need to have at least half overlap
	var newRegionList = new Array();
	newRegionList.map = new Object();
	for(var iSpc = 0; iSpc < spcArray.length; iSpc++) {
		if(spcArray[iSpc].isActive) {
			var newGeneSpcList = new Array();
			for(var i = 0; i < glist.length; i++) {
				if (glist[i].spcRegions.hasOwnProperty(spcArray[iSpc].db) && glist[i].getSpcRegionLength(spcArray[iSpc].db) > 0) {
					var currGeneSpcList = glist[i].spcRegions[spcArray[iSpc].db].array;
					for(var iRegion = 0; iRegion < currGeneSpcList.length; iRegion++) {
						var noOverlap = true;
						for(var jRegion = 0; jRegion < newGeneSpcList.length; jRegion++) {
							if(newGeneSpcList[jRegion].overlaps(currGeneSpcList[iRegion]) 
								>= Math.max(newGeneSpcList[jRegion].getLength(), 
								currGeneSpcList[iRegion].getLength()) / 2) {
									newGeneSpcList[jRegion].assimilate(currGeneSpcList[iRegion]);
									noOverlap = false;
									break;
							}
						}
						if (noOverlap) {
							newGeneSpcList.push(currGeneSpcList[iRegion]);
						}
					}
				}
			}
			for(var i = 0; i < newGeneSpcList.length; i++) {
				var newRegion = new Region('Region ' + (newRegionList.length + 1));
				newRegion.pushSpcRegion(spcArray[iSpc].db, newGeneSpcList[i]);
				newRegionList.push(newRegion);
				newRegionList.map[newRegion.name] = newRegion;
			}
		}
	}
	return newRegionList;
}

function toggleUpload(enableFlag, resetGeneList) {
	if(resetGeneList) {
		$("#genelistContentHolder").html('');
	}
	if(enableFlag) {
		$('#genelistLoading').addClass('BoxHide');
		fireCoreSignal('disable', {group: 'query-search', flag: false});
	} else {
		fireCoreSignal('disable', {group: 'query-search', flag: true});
	}
}

function validateUploadFileOrURL(event) {
	
	// notice that the reverse look up map needs to be updated here
	// for future references
	
	event.stopPropagation();
	event.preventDefault();
	
	var querycard = event.detail.card;
	
	var sessionDataObj = {};
	var hasEmail = (querycard.UserEmail.length > 0);
	sessionDataObj.email = querycard.UserEmail;
	sessionDataObj.file = querycard.InputFile;
	sessionDataObj.url = querycard.InputUrl;
	sessionDataObj.urlToShow = querycard.DisplayUrl;
	
	if($('#useAllTracks').prop('checked') && !hasEmail) {
		if(!UI.confirm('It may take a long time (hours) to analyze with all tracks, \ntherefore, an email address is atrongly recommended.\n\nPlease click \'OK\' if you want to proceed without an email.\nClick \'Cancel\' to return.')) {
			return false;
		}
	}
	
	var chromRegex = /^chr\w+\s*(:|\s)/i;
	if(querycard.SearchRange && !chromRegex.test(querycard.SearchRange.trim())) {
		UI.alert('Please give a valid genome range for Search Range!');
		return false;
	}
	
	$("#genelistContentHolder").html('');
	$('#genelistLoading').removeClass('BoxHide');

	sessionDataObj.db = querycard.currentRef;
	
	toggleUpload(false, true);
	
	// 1) update reverse lookup table
	// TODO: May need to move it to earlier once the major revemp is done
	var useAllTracks = $('#useAllTracks').prop('checked');
	sessionDataObj.hgsid = spcArray[spcArray.map[sessionDataObj.db]].hgsID;
	
	var tableNameQuery = new FormData();
	tableNameQuery.append('Submit', 'Submit');
	tableNameQuery.append('species', sessionDataObj.db);
	tableNameQuery.append('email', sessionDataObj.email);
	
	var cmnIDPrefix = genemoIsOn? sessionDataObj.db + '_': '';
		
	$.each(cmnTracksEncode.array, function(key, value) {
		if($('#' + cmnIDPrefix + value.getCleanID()).prop('checked') || useAllTracks) {
			$.each(value.getSpeciesSubTables(sessionDataObj.db), function(index, tableName) {
				tableNameQuery.append('geneTracks[]', tableName);
			});
		}
	});
	
	$.each(spcArray[spcArray.map[sessionDataObj.db]].uniTracksEncode.array, function(key, value) {
		if($('#' + value.getCleanID()).prop('checked') || useAllTracks) {
			$.each(value.getSpeciesSubTables(), function(index, tableName) {
				tableNameQuery.append('geneTracks[]', tableName);
			});
		}
	});
	
	for(var i = 0; i < spcArray.length; i++) {
		spcArray[i].isActive = (spcArray[i].db == sessionDataObj.db);
	}
	spcArray.updateAllSpcActiveNum();
	
	if(querycard.SearchRange) {
		tableNameQuery.append('chrom', querycard.SearchRangeArr[0]);
		tableNameQuery.append('start', parseInt(querycard.SearchRangeArr[1]));
		tableNameQuery.append('end', parseInt(querycard.SearchRangeArr[2]));
		sessionDataObj.searchRange = querycard.SearchRange;
	}

	trackUpdatedCallback.data = event;
	// 1) get ID and save some stuff and also upload to UCSC as well
	trackUpdatedCallback.func = function(eventData) {
		
		saveSession(sessionDataObj, function(IDPrepData, status, jsXHR) {
			
			try {
				
				var data = $.parseJSON(IDPrepData);
			
				if(data.error) {
					throw data.error;
				}
				tableNameQuery.append('id', data.id);
				var customTrackUrl = data.urlToShow;
				var computeDataAndCallback = {};
				if(data.bwFlag) {
					computeDataAndCallback.bwFlag = true;
				}
				computeDataAndCallback.data = tableNameQuery;
				computeDataAndCallback.callback = uploadUiHandler;
				setCustomTrack(customTrackUrl, sessionDataObj.db, sessionDataObj.hgsid, computeDataAndCallback, sendRegionsToCompute);
			} catch(e) {
				UI.alert(e);
				toggleUpload(true, true);
			}
					
		}); // end calling saveSession()
	
	}; // end callback function for updateTracks

	updateTracks(false, true);
	hideWindow('trackSelect');

	fireCoreSignal('collapse', {group: 'query-search', flag: false});
	
	return false;
	
}

function setCustomTrack(url, db, hgsid, otherdata, callback) {
	var customTrackQuery = new FormData();
	customTrackQuery.append('hgct_customText', url);
	customTrackQuery.append('Submit', 'Submit');
	customTrackQuery.append('db', db);
	customTrackQuery.append('hgsid', hgsid);
	
	$.ajax({
		url: '/cgi-bin/hgCustom',
		type: 'POST',
		data: customTrackQuery,
		cache: false,
		processData: false,
		contentType: false,
		success: function(hgCustomData, status, jqXHR) {
		
			// does not need to do anything else, it's already been uploaded to UCSC
			// still need to check if hgCustom is correct
			if(hgCustomData.indexOf("<FONT COLOR='RED'>Error</I>") >= 0) {
				// Something is wrong with hgCustomData
				var errMsg = "Custom track file ERROR: \n";
				var trunk = hgCustomData.substr(hgCustomData.indexOf("<FONT COLOR='RED'>Error</I>"));
				trunk = trunk.substring(trunk.indexOf('</FONT>&nbsp;') + 13, trunk.indexOf('</B>'));
				
				errMsg += trunk;
				UI.alert(errMsg);
				toggleUpload(true, true);
			} else {
				
				callback(otherdata, hgCustomData);
			
			} // end if (hgCustom error handling)
			
			// sort track by order and score?
		},
		error: function(jqXHR, status, e) {
		}
	}); // end ajax for hgCustom
}

function sendRegionsToCompute(dataAndCallback, otherdata) {
	
	var tableNameQuery = dataAndCallback.data;
	//var compDomain = (window.location.search.indexOf('XCGenemoTest') > 0)? (window.location.protocol + '//comp.genemo.org/cpbrowser/'): 'cpbrowser/';
	var compDomain = window.location.protocol + '//comp.genemo.org/cpbrowser/';
	
	$.ajax({
		url: compDomain + (dataAndCallback.bwFlag? 'geneTrackBigwig.php': 'geneTrackComparison.php'),
		type: 'POST',
		data: tableNameQuery,
		cache: false,
		processData: false,
		contentType: false,
		success: function(jsonReturnData, status, jqXHR) {
			// file successfully uploaded
			// process return stuff
			// data will be a json-encoded string of the php array
			// currently this string will be submitted again to genelist.php to get the final output
			// needs to move the output code from php to JavaScript
			dataAndCallback.callback(jsonReturnData);
			
			// sort track by order and score?
		},
		error: function(jqXHR, status, e) {
		}
	}); // end ajax for geneTrackComparison.php
}

function getComputedRegions(dataAndCallback, otherdata) {
	
	$.post("cpbrowser/geneTrackToUser.php", dataAndCallback.data, dataAndCallback.callback);
}

function uploadUiHandler(data) {
	var updateNavFunc = updateNavigation;
	var changeGeneNameFunc = changeGeneName;
	var searchRange;
	$("#genelistContentHolder").html('');
	var hasError = false;
	
	var querycard = document.querySelector('#searchCard');
	
	var fileToCalc = querycard.InputFile;
	var urlFileInput = querycard.InputUrl;
	var inputFileName, inputFileNameStem;
	if((fileToCalc && fileToCalc.name) || urlFileInput) {
		inputFileName = (urlFileInput? (urlFileInput.substring(urlFileInput.lastIndexOf('/') + 1))
			: (fileToCalc.name.substring(fileToCalc.name.lastIndexOf('/') + 1)));
		searchRange = querycard.SearchRange;
	} else if(window.originalFile) {
		inputFileName = window.originalFile;
		if(window.originalRange) {
			searchRange = window.originalRange;
		}
	}
	if(inputFileName.lastIndexOf('.') >= 0) {
		inputFileNameStem = inputFileName.substring(0, inputFileName.lastIndexOf('.'));
	} else {
		inputFileNameStem = inputFileName;
	}

	var geneListRaw;
	try {
		try {
			geneListRaw = $.parseJSON(data);
		} catch(jsonExcept) {
			// something is wrong with JSON (which means something wrong when the PHP code tries to process input)
			throw data;
		}
		if(geneListRaw.hasOwnProperty('error')) {
			return $('<p></p>').addClass('formstyle').append(geneListRaw['error']);
		}
		geneList = populateRegionList(geneListRaw, spcArray);
		
		geneList = mergeGeneList(geneList, spcArray);
		fireCoreSignal('collapse', {group: 'query-search', flag: false});
		
		$("#genelistContentHolder").append(writeGeneListTable(geneList, spcArray, cmnTracksEncode, updateNavFunc, changeGeneNameFunc));
		
		if(genemoIsOn) {
			// bedFileLink is the link for BED files (global object)
			if(bedFileLink !== null) {
				window.URL.revokeObjectURL(bedFileLink);
			}
			var BEDdata = new Blob(['#sourceFile=' + (urlFileInput? urlFileInput: inputFileName) + '\n' +
									writeGeneListBED(geneList, spcArray)], {type: 'text/plain'});
			bedFileLink = window.URL.createObjectURL(BEDdata);
			$('#bedDownloadHolder').show();
			document.querySelector('#bedDownloadLink').href = bedFileLink;
			document.querySelector('#bedDownloadLink').download = inputFileNameStem + '_result.bed';
		}
		
	} catch(e) {
		UI.alert(e);
		hasError = true;
	} finally {
		toggleUpload(true, hasError);
		return 0;
	}
}

function loadResults(sessionObj) {
	loadSession(sessionObj);
	loadQuery = new Object();
	loadQuery.id = sessionObj.id;
	loadQuery.species = sessionObj.db;
	window.originalFile = sessionObj.originalFile;
	if(sessionObj.originalRange) {
		window.originalRange = sessionObj.originalFile;
	}
	
	$('#peakFileHolder').text('[' + sessionObj.db + '] Display file: ' + sessionObj.originalFile);
	$('#peakFileHolder').show();
	
	var db = loadQuery.species;
	var hgsid = spcArray[spcArray.map[db]].hgsID;
	
	for(var i = 0; i < spcArray.length; i++) {
		spcArray[i].isActive = (spcArray[i].db == sessionObj.db);
	}
	spcArray.updateAllSpcActiveNum();
	trackUpdatedCallback.data = event;
	// 1) get ID and save some stuff and also upload to UCSC as well
	trackUpdatedCallback.func = function(eventData) {
		
		var dataAndCallback = new Object();
		dataAndCallback.data = loadQuery;
		dataAndCallback.callback = uploadUiHandler;
		
		setCustomTrack(sessionObj.urlToShow, db, hgsid, dataAndCallback, getComputedRegions)
		
	};
	
	toggleUpload(false, true);
		
	updateTracks(false, true);
	
}
