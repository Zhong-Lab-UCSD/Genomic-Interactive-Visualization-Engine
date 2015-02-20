// JavaScript Document
// Require regionlistui.js

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

function validateUploadFileOrURL(event) {
	
	// notice that the reverse look up map needs to be updated here
	// for future references
	
	event.stopPropagation();
	event.preventDefault();
	
	if($('#uploadFileInput')[0].files.length <= 0) {
		alert('You need to select a file!');
		return false;
	} else if($('#speciesToUpload').val() == "unselected") {
		alert('You need to select the database of your file!');
		return false;
	}
	
	$('#search').prop('disabled', true);
	$('#fileSubmit').prop('disabled', true);
	$("#genelistContentHolder").html('');
	$('#genelistLoading').removeClass('BoxHide');
	
	trackUpdatedCallback.data = event;
	trackUpdatedCallback.func = function(data) {
		
		// first upload file to hgCustom
		
		var db = $('#speciesToUpload').val();
		var customTrackData = new FormData();
		customTrackData.append('hgt.customFile', $('#uploadFileInput')[0].files[0]);
		customTrackData.append('Submit', 'Submit');
		customTrackData.append('db', db);
		customTrackData.append('hgsid', spcArray[spcArray.map[db]].hgsID);
		
		$.ajax({
			url: '/cgi-bin/hgCustom',
			type: 'POST',
			data: customTrackData,
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
					alert(errMsg);											
					$("#genelistContentHolder").html('');
					$('#genelistLoading').addClass('BoxHide');
					$('#search').prop('disabled', false);
					$('#fileSubmit').prop('disabled', false);
				} else {
				
					var trackTblNames = new Array();
					var trackTblNameToID = new Object();
					
					var useAllTracks = $('#useAllTracks').prop('checked');
					// first shutdown all non-selected db
					for(var i = 0; i < spcArray.length; i++) {
						spcArray[i].isActive = (spcArray[i].db == db);
					}
					
					// append all the tracks
					$.each(cmnTracksEncode.array, function(key, value) {
						// first, use getdownload.php to get all the tableNames
						if($('#' + value.getCleanID()).prop('checked') || useAllTracks) {
							trackTblNames.push(value.getSpeciesTblName(db));
							trackTblNameToID[value.getSpeciesTblName(db)] = {bundle: cmnTracksEncode, value: value.id};
						}
					});
					
					$.each(spcArray[spcArray.map[db]].uniTracksEncode.array, function(key, value) {
						if($('#' + value.getCleanID()).prop('checked') || useAllTracks) {
							trackTblNames.push(value.getSpeciesTblName(db));
							trackTblNameToID[value.getSpeciesTblName(db)] = {bundle: spcArray[spcArray.map[db]].uniTracksEncode, value: value.id};
						}
					});
					
					tableQueryData = new Object();
					tableQueryData[db] = JSON.stringify(trackTblNames);
				
					var tableNameData = new FormData();
					tableNameData.append('file', $('#uploadFileInput')[0].files[0]);
					tableNameData.append('Submit', 'Submit');
					tableNameData.append('species', db);
					
					$.post('cpbrowser/gettablenames.php', tableQueryData, function(returndata) {
						
						$.each(returndata, function(key, val) {
							$.each(val, function(newkey, table) {
								tableNameData.append('geneTracks[]', table);
								trackTblNameToID[key].bundle.addTableNameToID(table, trackTblNameToID[key].value);
								// this is to complete the reverse-lookup table
							});
						});
						
						$.ajax({
							url: 'cpbrowser/geneTrackComparison.php',
							type: 'POST',
							data: tableNameData,
							cache: false,
							processData: false,
							contentType: false,
							success: function(jsonReturnData, status, jqXHR) {
								// file successfully uploaded
								// process return stuff
								// data will be a json-encoded string of the php array
								// currently this string will be submitted again to genelist.php to get the final output
								// needs to move the output code from php to JavaScript
								uploadUiHandler(jsonReturnData);
								
								// sort track by order and score?
							},
							error: function(jqXHR, status, e) {
							}
						});
					
					}, 'json');
				}
				
				// sort track by order and score?
			},
			error: function(jqXHR, status, e) {
			}
		});
		
	};
	
	updateTracks(false);
	toggleWindow('trackSelect');
	return false;
	
}

function uploadUiHandler(data) {
	updateNavFunc = updateNavigation;
	changeGeneNameFunc = changeGeneName;
	$("#genelistContentHolder").html('');
	
	var geneListRaw = $.parseJSON(data);
	if(geneListRaw.hasOwnProperty('error')) {
		return $('<p></p>').addClass('formstyle').append(geneListRaw['error']);
	}
	geneList = populateRegionList(geneListRaw, spcArray);
	
	geneList = mergeGeneList(geneList, spcArray);
	
	$("#genelistContentHolder").append(writeGeneListTable(geneList, spcArray, cmnTracksEncode, updateNavFunc, changeGeneNameFunc));
	$('#genelistLoading').addClass('BoxHide');
	$('#fileSubmit').prop('disabled', false);
	$('#search').prop('disabled', false);
	
	return 0;
}


