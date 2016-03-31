// Javascript for UI population
// Need jQuery for JSON parsing
// Need generegion.js for Region, ChrRegion and SpcRegionArray


var GENELIST_LENGTH = 19;
var geneList = [];
geneList.map = {};

var activeRegion = null;		// this should be assigned currRegion once "Visualize" is chosen

function ChrRegionToShow(chrString, regionname, extendedstart, extendedend, data, species) {
    // data is everything else for ChrRegionToShow
    ChrRegion.call(this, chrString, regionname, species);
    this.extendedstart = extendedstart || this.start;
    this.extendedend = extendedend || this.end;
    this.data = {};
    for(var entry in data) {
        if (data.hasOwnProperty(entry) && !this.hasOwnProperty(entry)) {
            this.data[entry] = data[entry];
        }
    }
}
extend(ChrRegion, ChrRegionToShow);

ChrRegionToShow.prototype.regionToBED = function(includeStrand) {
	return this.chr + '\t' + this.start + '\t' + this.end + '\t' +
			(this.name? this.name: (this.trackString? this.trackString: '.')) + 
			(includeStrand? '\t0\t' + (!this.strand? '-': '+'): '');
};

ChrRegionToShow.prototype.extendedRegionToString = function(includeStrand) {
	// default is including strand
	if (includeStrand == null) {
		includeStrand = true;
	}
	return this.chr + ':' + this.extendedstart + '-' + this.extendedend +
		((!includeStrand || this.strand === null)? '': (' (' +
		(this.strand? '+': '-') + ')'));
};

function setPeakListOnly(spcIndex, list) {
	var conDocDiv = $(spcArray[spcIndex].browserConDoc.getElementById('TrackControlsEncodePeaks'));
	conDocDiv.find('input').each(function(index, element) {
        $(element).prop('value', 'hide');
    });
	for(var i = 0; i < list.length; i++) {
		var inputelem = conDocDiv.find('#' + list[i] + '_peak');
		if(inputelem) {
			inputelem.prop('value', 'dense');
		}
	}
}

Region.prototype.writeBED = function(spcArray, includeStrand) {
	var result = "";
    for(var i = 0; i < spcArray.length; i++) {
        if (spcArray[i].isActive && this.spcRegions.hasOwnProperty(spcArray[i].db) && this.getSpcRegionLength(spcArray[i].db) > 0) {
			for(var iRegion = 0; iRegion < this.getSpcRegionLength(spcArray[i].db); iRegion++) {
				result += this.getSpcRegion(spcArray[i].db, iRegion).regionToBED(includeStrand);
			}
		}
	}
	return result;	
}

Region.prototype.writeDOM = function(spcArray, cmnTracksEncode, updateNavFunc, changeGeneNameFunc) {
    // this will return the <tr> node for the region
    var outsideTD = $('<td></td>');
    outsideTD.addClass('formstyle');
	outsideTD.css('padding', '0px');
    var outForm = $('<form></form>');
    outForm.prop('id', this.getCleanName()).prop('name', this.getCleanName());
    outForm.prop('method', 'post').prop('target', 'cpbrowser').prop('action', cpbrowserURL);
    
    var outTable = $('<table></table>');
    outTable.addClass('geneListEntryTable');
    
    var row = $('<tr></tr>');
    var cell = $('<td></td>');
    cell.prop('colspan', 2);
    cell.append('<strong>' + this.name + '</strong>');
    
    if (this.hasOwnProperty('alias') && this.alias) {
        // there is an alias for the region
        cell.append('(<strong>' + this.alias + '</strong>)');
    }
    
    cell.append($('<input>').prop('name', 'showinbrowser').prop('type', 'button').prop('id', 'showinbrowser')
                .prop('value', 'Visualize').css('float', 'right')
				.click({region: this, spcarray: spcArray}, function(event) {
					return updateNavFunc(event.data.region, event.data.spcarray, 
						   				 cmnTracksEncode, setPeakListOnly);})
										 .append($('<div></div>').css('clear', 'both')));
    row.append(cell);
    outTable.append(row);
    
    var numOfSpcToShow = 0;
    
    for(var i = 0; i < spcArray.length; i++) {
        if (spcArray[i].isActive && this.spcRegions.hasOwnProperty(spcArray[i].db) && this.getSpcRegionLength(spcArray[i].db) > 0) {
            
            numOfSpcToShow++;
            
            row = $('<tr></tr>');
            row.addClass('smallformstyle');
            
            cell = $('<td></td>');
            cell.addClass('geneListEntryFirstCol');
            cell.append(spcArray[i].commonName);
            row.append(cell);
            
            cell = $('<td></td>');
            cell.addClass('geneListEntrySecondCol');
            
            var multiFlag = (this.getSpcRegionLength(spcArray[i].db) > 1);
            cell.append($('<input>').prop('name', 'speciesdb[]').prop('type', 'hidden').prop('value', spcArray[i].db));
            cell.append($('<input>').prop('name', 'speciesname[]').prop('type', 'hidden').prop('value', spcArray[i].name));
            cell.append($('<input>').prop('name', 'speciescmnname[]').prop('type', 'hidden')
                        .prop('value', spcArray[i].commonName).prop('id', this.getCleanName() + 'SpcCmnName'));
            
            var currRegion = this.getSpcActiveRegion(spcArray[i].db);
            
            if (currRegion.name) {
                var span = $('<span></span>');
                span.prop('id', this.getCleanName() + spcArray[i].db + 'NameDisp');
                span.append(currRegion.name);
                cell.append(span).append('<br>');
            } else if (currRegion.data.hasOwnProperty('genenamelist')) {
                var geneListNeeded = false;
                var geneList = currRegion.data.genenamelist;
                // add geneList code
                var span = $('<span></span>');
                span.prop('id', this.getCleanName() + spcArray[i].db + 'GeneListDisp');
                var geneListString = '';
                if (geneList.join(', ').length > GENELIST_LENGTH) {
                    for(var iGene = 0; iGene < geneList.length; iGene++) {
                        geneListString += geneList[iGene];
                        if (geneListString.length > GENELIST_LENGTH - 9) {
                            geneListString += '...';
                            geneListNeeded = true;
                            break;
                        }
                    }
                } else {
                    geneListString = geneList.join(', ');
                }
                span.append(geneListString);
                cell.append(span);
                if (geneListNeeded) {
                    span = $('<span></span>');
                    span.addClass('geneNameExpander').append('More');
                    cell.append(span);
                    var div = $('<div></div>');
                    div.addClass('geneNameInsert').append(geneList[0]);
                    for(var iGene = 1; iGene < geneList.length; iGene++) {
                        div.append('<br>' + geneList[iGene]);
                    }
                    cell.append(div).append($('<div></div>').css('clear', 'both'));
                }
                cell.append('<br>');
            } // end if currRegion.name || currRegion.hasOwnProperty('genenamelist')
            
            if (!multiFlag) {
                cell.append($('<input>').prop('name', spcArray[i].db).prop('id', this.getCleanName() + spcArray[i].db)
                            .prop('type', 'hidden').prop('value', currRegion.extendedRegionToString(false)));
//                cell.append($('<input>').prop('name', spcArray[i].db + 'strand')
//                            .prop('id', this.getCleanName() + spcArray[i].db + 'strand')
//                            .prop('type', 'hidden').prop('value', (currRegion.strand == false? '0': '1')));
                cell.append(currRegion.regionToString(true));
            } else { // if multiflag
                var select = $('<select></select>');
                select.addClass('combostyle').prop('name', spcArray[i].db)
                    .prop('id', this.getCleanName() + spcArray[i].db + 'NameDispselection')
                    .change({textid: this.getCleanName() + spcArray[i].db + 'NameDisp',
                            region: this, db: spcArray[i].db},
                            function(event) {
                                changeGeneNameFunc(this, event.data.region, event.data.db, event.data.textid);
                            });
                for(var iRegion = 0; iRegion < this.getSpcRegionLength(spcArray[i].db); iRegion++) {
                    var option = $('<option></option>');
                    option.prop('value', this.getSpcRegion(spcArray[i].db, iRegion).regionToString(false));
					option.append(this.getSpcRegion(spcArray[i].db, iRegion).regionToString(true) + 
						((this.getSpcRegion(spcArray[i].db, iRegion).data.hasOwnProperty('liftovers') &&
						parseInt(this.getSpcRegion(spcArray[i].db, iRegion).data.liftovers) <= 0)? ' (*)': ''));
					if(!iRegion) {
						option.prop('selected', true);
					}
					select.append(option);
                }
				cell.append(select);
            } // end if multiflag
            
            if (currRegion.data.hasOwnProperty('track')) {
                // provide selection for filtering out all the tracks
				if(currRegion.data.hasOwnProperty('score')) {
					currRegion.trackString = 'Score=' + parseFloat(currRegion.data.score).toFixed(2) + ';Tracks=';
				} else {
					currRegion.trackString = 'Tracks=';
				}
                cell.append('<br>');
                if (typeof(currRegion.data.track) === 'string') {
                    currRegion.data.track = [currRegion.data.track];
                }
				
                var label = $('<label></label>');
                label.append($('<strong></strong>').append('Tracks matching: '));
                label.append($('<span></span>').css('float', 'right').css('display', 'none')
							 .append($('<input>').prop('type', 'checkbox')
									 .prop('id', this.getCleanName() + spcArray[i].db + 'Filter')
									 .prop('checked', true))
							 .append('Apply filter').prop('title', 'Filter with listed tracks'));
                cell.append(label);
				cell.append($('<div></div>').css('clear', 'both'));
                
                var trackListDiv = $('<div></div>');
				var currListedTrack = {};
                for(var iTracks = 0; iTracks < currRegion.data.track.length; iTracks++) {
					// merge duplicated tracks
                    var trackTableName = currRegion.data.track[iTracks];
					var revLookupTrack;
					if(cmnTracksEncode.reverseLookUpMap.hasOwnProperty(trackTableName)) {
						revLookupTrack = cmnTracksEncode.reverseLookUpMap[trackTableName];
					} else {
						// it's unique
						revLookupTrack = spcArray[i].uniTracksEncode.reverseLookUpMap[trackTableName];
					}
					if(revLookupTrack) {
						if(!currListedTrack.hasOwnProperty(revLookupTrack.id)) {
							if(iTracks > 0) {
								trackListDiv.append('<br>');
							}
							trackListDiv.append(revLookupTrack.writeLongString(genemoIsOn? spcArray[i].db: null));
							currListedTrack[revLookupTrack.id] = true;
							currRegion.trackString += (iTracks? ',': '') + 
								revLookupTrack.writeLongString(genemoIsOn? spcArray[i].db: null).replace(/\s+/g, '');
						}
					} else {
						console.log('Error: ' + trackTableName + ' cannot be reverse looked up.');
						UI.alert('Error: ' + trackTableName + ' cannot be reverse looked up.');
					}
                }
				cell.append(trackListDiv);
            }
            row.append(cell);
            outTable.append(row);
        } 
    } // end for i in spcArray
    
    outForm.append(outTable);
    outForm.append($('<input>').prop('id', this.getCleanName() + 'NumSpc').prop('type', 'hidden')
                   .prop('name', 'num_spc').prop('value', numOfSpcToShow.toString()));
    
    outsideTD.append(outForm);
    return $('<tr></tr>').append(outsideTD);
};



function populateRegionList(rawObj, spcArray) {
    // this function will convert raw Object (from JSON input) into an array of Region class
    // and also, if the rawObj don't have name for each genes, "Region X" will be used
    var regionList = new Array();
    regionList.map = {};
    for(var regionName in rawObj) {
        if(rawObj.hasOwnProperty(regionName)) {
            var newName = regionName;
            if (!isNaN(regionName) || regionName.slice(0, 6).toLowerCase() === 'region') {
                // it's a number or general name
                // use "Region " + number here
                newName = "Region " + (regionList.length + 1);
            }
            var newRegion = new Region(newName);
            for(var spcIndex = 0; spcIndex < spcArray.length; spcIndex++) {
                if (spcArray[spcIndex].isActive && rawObj[regionName].hasOwnProperty(spcArray[spcIndex].db)) {
                    var db = spcArray[spcIndex].db;
                    var spcRegionRaw = rawObj[regionName][db];
                    for(var index = 0; index < spcRegionRaw.length; index++) {
                        var chrRegionRaw = spcRegionRaw[index];
                        var start = parseInt(chrRegionRaw.start || chrRegionRaw.genestart);
                        var end = parseInt(chrRegionRaw.end || chrRegionRaw.geneend);
                        var chrCoorStr = chrRegionRaw.chr + ":" + start + "-" + end;
                        var newChrRegion = new ChrRegionToShow(chrCoorStr, chrRegionRaw.nameinspc,
                                                           chrRegionRaw.extendedstart, chrRegionRaw.extendedend,
                                                           chrRegionRaw);
                        if (typeof(chrRegionRaw.strand) !== "undefined") {
                            newChrRegion.setStrand(chrRegionRaw.strand);
                        }
                        newRegion.pushSpcRegion(db, newChrRegion);
                        delete rawObj[regionName][db];
                    }
                }
            }
            for(var property in rawObj[regionName]) {
                if (rawObj[regionName].hasOwnProperty(property)) {
                    newRegion[property] = rawObj[regionName][property];
                }
            }
            regionList.push(newRegion);
            regionList.map[newName] = newRegion;
        }
    }
    return regionList;
}

function writeGeneListTable(geneListElem, spcArray, cmnTracksEncode, updateNavFunc, changeGeneNameFunc) {
    // geneListElem is the an array of Region class
	var table = $('<table></table>');
	table.addClass('geneListTable');
	$.each(geneListElem, function(i, entry) {
		table.append(entry.writeDOM(spcArray, cmnTracksEncode, updateNavFunc, changeGeneNameFunc));
	});
	return table;
}

function writeGeneListBED(geneListElem, spcArray, includeStrand) {
    // geneListElem is the an array of Region class
    // 
	var result = '';
	$.each(geneListElem, function(i, entry) {
		result += entry.writeBED(spcArray, includeStrand) + '\n';
	});
	return result;
}

function writeGeneListFromJSON(geneListJSON, spcarray, cmnTracksEnc, updateNavFunc, changeGeneNameFunc) {
	updateNavFunc = updateNavFunc || updateNavigation;
	changeGeneNameFunc = changeGeneNameFunc || changeGeneName;
	cmnTracksEnc = cmnTracksEnc || cmnTracksEncode;
	spcarray = spcarray || spcArray;
	var geneListRaw = $.parseJSON(geneListJSON);
	if(geneListRaw.hasOwnProperty('error')) {
		return $('<p></p>').addClass('formstyle').append(geneListRaw.error);
	}
	geneList = populateRegionList(geneListRaw, spcarray);
	return writeGeneListTable(geneList, spcarray, cmnTracksEnc, updateNavFunc, changeGeneNameFunc);
}

function regionUiHandler(data) {
	$("#genelistContentHolder").html('');
	$("#genelistContentHolder").append(writeGeneListFromJSON(data));
	$('#genelistLoading').addClass('BoxHide');
	if(geneList.length === 1) {
		updateNavigation(geneList[0]);
	}
	fireCoreSignal('disable', {group: 'query-search', flag: false});
}


function changeGeneName(selectItem, region, db, textid) {
	// notice that this will also change the activeRegion for region
	region.setSpcActiveRegion(db, selectItem.selectedIndex);
	$("#" + textid).html(region.getSpcActiveRegion(db).name);
}
