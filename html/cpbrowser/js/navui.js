// JavaScript Document
// Require libtracks.js, regionlistui.js and generegion.js

function indexToNav() {
	// change index UI to navigation UI
	UI.initNavSidebar();
	if($('body').hasClass('firstIndex')) {
		$('body').removeClass('firstIndex');
		$('body').addClass('twoColLiqLt');
	}
}

function updateNavigation(geneInList, spcarray, cmntracksencode, setpeakfunc) {
	
	// geneInList is the original gene in genelist
	// find everything from that
	
	spcarray = spcarray || spcArray;
	// update the navigation part for the comparative browser
	formid = geneInList.getCleanName();
	currGene = new Region(formid);		
	// this is the Region used in navigation
	// because the coordinates will change upon navigation, 
	// so do not use the one in geneList
	
	//speciesDbName = new Array();
	//speciesCmnName = new Array();
	//var itemLeft = $("#" + currGene.getCleanName()).serializeArray();		// the name of current gene is the name of a form as well
	var naviStr = "";
	
	var needToUpdateTracks = false;
	var regionForm = $('#' + formid);

	for(var spcIndex = 0; spcIndex < spcarray.length; spcIndex++) {
		if(spcarray[spcIndex].isActive) {
			
			var currSpcRegion = geneInList.getSpcActiveRegion(spcarray[spcIndex].db);
			
			if($('#' + formid + spcarray[spcIndex].db + 'Filter').prop('checked')) {
				needToUpdateTracks = true;
				cmntracksencode.setListOnly(currSpcRegion.data['track']);
				spcarray[spcIndex].uniTracksEncode.setListOnly(currSpcRegion.data['track']);
				if(setpeakfunc) {
					setpeakfunc(spcIndex, currSpcRegion.data['track']);
				}
			}
			
//			var coorString, strand, currGeneSpcName;
//			coorString = geneInList.getSpcActiveRegion(spcarray[spcIndex].db).regionToString(false);
//			strand = geneInList.getSpcActiveRegion(spcarray[spcIndex].db).strand;
//			currGeneSpcName = geneInList.getSpcActiveRegion(spcarray[spcIndex].db).name;
//
//			var currSpcRegion = new ChrRegionToShow(coorString, currGeneSpcName);
//			currSpcRegion.setStrand(strand);
			currGene.pushSpcRegion(spcarray[spcIndex].db, currSpcRegion);

			var naviStrEach = $('#spcNaviTemplate').html();
			naviStrEach = naviStrEach.replace(/spcGeneName/g, 
				currSpcRegion.getShortName() 
				+ " " + currSpcRegion.getStrand("(", ")")).replace(/spcDbName/g, 
				spcarray[spcIndex].db).replace(/spcCmnName/g, 
				spcarray[spcIndex].commonName).replace(/spcCoor/g, 
				currSpcRegion.regionToString(false));
			naviStr += naviStrEach;
		}
	}
		
	$('#navigationContent').html(naviStr);
	$('#overallGeneName').html(currGene.name);
	
	for(var spcIndex = 0; spcIndex < spcarray.length; spcIndex++) {
		if(spcarray[spcIndex].isActive) {
			spcarray[spcIndex].isReady = false;
			setUnReady(spcarray[spcIndex].db);
		}
	}
	$('#masterHolder').removeClass("BoxHide");
	
	if(needToUpdateTracks) {
		trackUpdatedCallback.data = formid;
		trackUpdatedCallback.func = function(data) {
			indexToNav();
			$('#' + data).submit();
		}
		updateTracks(false);
		return false;
	} else {
		indexToNav();
		$('#' + formid).submit();
	}
	return true;
}

function setUnReady(db) {
	$('#' + db + 'Loading').removeClass('BoxHide');
	$('#masterLoading').removeClass('BoxHide');
}

function setReady(db, coor) {
	$('#' + db + 'Coor').html(coor);
	currGene.getSpcActiveRegion(db).regionFromString(coor);
	$('#' + db + 'Loading').addClass('BoxHide');
	spcArray[spcArray.map[db]].isReady = true;
	var allSpcReady = true;
	for(i = 0; i < spcArray.length; i++) {
		if(spcArray[i].isActive && !spcArray[i].isReady) {
			allSpcReady = false;
		}
	}
	if(allSpcReady) {
		isInBrowser = true;
		$('#masterLoading').addClass('BoxHide');
	}
}

function showHover(key) {
	var i;
	for(i = 0; i < spcArray.length; i++) {
		if(spcArray[i].isActive) {
			var suffix = key.replace(/L/, (currGene.getSpcActiveRegion(spcArray[i].db).strand? "left": "right")).replace(/R/, (currGene.getSpcActiveRegion(spcArray[i].db).strand? "right": "left"));
			//console.log('#' + speciesDbName + suffix);
			$('#' + spcArray[i].db + suffix).addClass('hoverToolButtonImage');
			//$('#' + speciesDbName[i] + suffix).removeClass('toolButtonImage');
		}
	}
}

function hideHover(key) {
	var i;
	for(i = 0; i < spcArray.length; i++) {
		if(spcArray[i].isActive) {
			var suffix = key.replace(/L/, (currGene.getSpcActiveRegion(spcArray[i].db).strand? "left": "right")).replace(/R/, (currGene.getSpcActiveRegion(spcArray[i].db).strand? "right": "left"));
			//$('#' + speciesDbName[i] + suffix).addClass('toolButtonImage');
			$('#' + spcArray[i].db + suffix).removeClass('hoverToolButtonImage');
		}
	}
}

function showZoomHover(key) {
	var i;
	for(i = 0; i < spcArray.length; i++) {
		if(spcArray[i].isActive) {
			$('#' + spcArray[i].db + key).addClass('hoverToolButton');
			//$('#' + speciesDbName[i] + key).removeClass('toolButton');
		}
	}
}

function hideZoomHover(key) {
	var i;
	for(i = 0; i < spcArray.length; i++) {
		if(spcArray[i].isActive) {
			//$('#' + speciesDbName[i] + key).addClass('toolButton');
			$('#' + spcArray[i].db + key).removeClass('hoverToolButton');
		}
	}
}

function callMasterViewChange(change, isZoom) {
	if(isZoom) {
		// is simple zoom, no need to convert strand
		var i;
		for(i = 0; i < spcArray.length; i++) {
			if(spcArray[i].isActive) {
				callViewChange(spcArray[i].db, change);
			}
		}
	} else {
		var i;
		for(i = 0; i < spcArray.length; i++) {
			if(spcArray[i].isActive) {
				if(currGene.getSpcActiveRegion(spcArray[i].db).strand) {
					callViewChange(spcArray[i].db, change);
				} else {
					callViewChange(spcArray[i].db, ((change.search("left") >= 0)? change.replace(/left/, "right"): change.replace(/right/, "left")));
				}
			}
		}
	}
}

function callViewChange(db, change) {
	setUnReady(db);
	document.getElementById('cpbrowser').contentWindow.callViewChange(db, change);
}
