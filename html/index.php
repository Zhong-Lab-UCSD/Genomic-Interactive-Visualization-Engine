<?php
if(strpos(getenv('SERVER_NAME'), 'singlecell') !== false) {
	// is single cell, redirect to singlecell.php
	header("HTTP/1.1 301 Moved Permanently"); 
	header("Location: ./singlecell.php"); 
	exit();
}
require_once (realpath(dirname(__FILE__) . "/../includes/session.php"));
?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="keywords" content="Comparative study,Epigenomics,Epigenetics,Visualization,Epigenome browser" />
<meta name="description" content="CEpBrowser (Comparative Epigenome Browser) is a gene-centric genome browser that visualize the genomic features of multiple species with color-coded orthologous regions, aiding users in comparative genomic research. The genome browser is adapted from UCSC Genome Browser and the orthologous regions are generated from cross-species lift-over pairs." />
<title>CEpBrowser (Comparative epigenome browser)</title>
<link href="cpbrowser/mainstyles.css" rel="stylesheet" type="text/css" />
<script type="text/javascript" src="cpbrowser/js/jquery-1.7.js"></script>
<style type="text/css">
<!--
html {
	height: 100%;
}
body {
	font: 100% Verdana, Arial, Helvetica, sans-serif;
	background: #EEEEEE;
	margin: 0; /* it's good practice to zero the margin and padding of the body element to account for differing browser defaults */
	padding: 0;
	text-align: center; /* this centers the container in IE 5* browsers. The text is then set to the left aligned default in the #container selector */
	color: #000000;
	height: 100%;
	overflow: hidden;
}
-->
</style>
<script type="text/javascript" src="cpbrowser/js/generegion.js"></script>
<script type="text/javascript" src="cpbrowser/js/regionlistui.js"></script>
<script type="text/javascript" src="cpbrowser/js/navui.js"></script>
<script type="text/javascript" src="cpbrowser/js/uploadui.js"></script>
<script type="text/javascript" src="cpbrowser/js/libtracks.js"></script>
<script type="text/javascript">

var spcArray = new Array();		// this will be the array of species (Species Object)
spcArray.map = new Object();

var cmnTracks = new TrackBundle();	// this will be holding common tracks (CmnTrack Object)

var cmnTracksEncode = new TrackBundleWithSample('', '_checkbox', '', '');	// this will be holding common Encode tracks (CmnTrack Object)

var orderedCmnTracksEncode = new Array();	// this is the sorted common track array
orderedCmnTracksEncode.sigLength = 0;		// number of tracks that have significant results

var timeoutVar;
var timerOn = 0;
var gListIsOn = 0;
//var currentGeneName = "";		// obsoleted, use currGene as commonGene class
//var numSpc = 0;				// this is the number of species IN DISPLAY
// this is already obsolete (check active from spcArray).
//var speciesCoor = {};			// obsoleted, use currGene
//var speciesStrand = {};		// obsoleted, use currGene
//var speciesGeneName = {};		// obsoleted, use currGene
//var numSpcReady = 0;			// obsoleted, check spcArray.isReady
var currGene = null;

var mouseInGList = false;
var inFocus = false;
var maxGeneListHeight;

//var spcNum = 0;				// this is the total number of species (obsoleted, use spcArray.length)
//var spcNumVisible = spcNum;		// number of species that have their panel expanded (obsoleted, check !spcArray.isCollapsed
var spcNumEnabled = 0;
//var spcDbName = new Array();	// obsoleted
//var spcCmnName = new Object();	// obsoleted
//var spcName = new Object();		// obsoleted
//var spcEncode = new Object();	// obsoleted

//var spcReady = new Object();		// obsoleted

var left_width = 290;
var left_value = 0;
var querySent = "";


//var cmnTracksSampleType = new Object();		// link sample name to array of tracks
//var uniTracksSampleType = new Array();
//var cmnTracksStatusBackup = new Object();	// this is to backup the selection states of tracks for sample selection
//var uniTracksStatusBackup = new Array();

var tracksInitialized = false;

var listPanels = new Array('trackSettings', 'tableBrowser');

var isInDownload = false;

var isInBrowser = false;
var tracksInitialized = false;

var isEncodeOn = <?php echo ($encodeOn? 'true': 'false'); ?>;			// Switch this to on to make ENCODE data as default, 

function setTrackReady(index) {
	spcArray[index].setTrackReady(spcArray, cmnTracks, cmnTracksEncode, !tracksInitialized, isInBrowser);
}

function validate_form_searchregion() {
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

function createJSONReturnFunction(isCommon, iTrack, iSpecies) {
	// TODO: add sorting mechanisms
	if(isCommon) {
		return function(data) {
			var items = [];
			items.push($(document.getElementById(cmnTracksEncode[iTrack].getCleanID() + 'Preview')).html());
			items.push('[' + spcArray[iSpecies].db + ']');
			$.each(data, function(key, val) {
				if(val) {
					var length = val.length;
					var validCount = val.validCount;
					var sum = val.sum;
					var sumSquare = val.sumSquare;
					
					cmnTracksEncode[iTrack].addSpeciesValues(spcArray[iSpecies].db, key, validCount, sum, sumSquare);
				}
			});
			// calculate and display the species-wide values
			items.push('Max mean: ');
			items.push(cmnTracksEncode[iTrack].getCompareValue(null, "mean"));
			items.push(' / Max CV: ');
			items.push(cmnTracksEncode[iTrack].getCompareValue(null, "cv"));
			$(document.getElementById(cmnTracksEncode[iTrack].getCleanID() + 'Preview')).html(items.join(' '));
			
			if(cmnTracksEncode[iTrack].isSpcArrayUpdated()) {
				// all species value updated, move the track to its corresponding location
				insert(cmnTracksEncode[iTrack], orderedCmnTracksEncode, 'cmnTrackEncodeSortedTbodyHolder',
					'cmnTrackEncodeInsigTbodyHolder', null, "mean");
			}
		};
	} else {
		return function(data) {
			var items = [];
			items.push($(document.getElementById(spcArray[iSpecies].uniTracksEncode[iTrack].getCleanID() + 'Preview')).html());
			//items.push(spcDbName[iSpecies]); 
			$.each(data, function(key, val) {
				var length = val.length;
				var validCount = val.validCount;
				var sum = val.sum;
				var sumSquare = val.sumSquare;
				
				spcArray[iSpecies].uniTracksEncode[iTrack].addSpeciesValues(key, validCount, sum, sumSquare);
			});
			items.push('Max mean: ');
			items.push(spcArray[iSpecies].uniTracksEncode[iTrack].getCompareValue(null, "mean"));
			items.push(' / Max CV: ');
			items.push(spcArray[iSpecies].uniTracksEncode[iTrack].getCompareValue(null, "cv"));
			if(spcArray[iSpecies].uniTracksEncode[iTrack].isSpcArrayUpdated()) {
				// all species value updated, move the track to its corresponding location
				insert(spcArray[iSpecies].uniTracksEncode[iTrack], 
					spcArray[iSpecies].orderedUniTracksEncode, spcArray[iSpecies].sortedTbodyID,
					spcArray[iSpecies].insigTbodyID, null, "mean");
			}
			$(document.getElementById(spcArray[iSpecies].uniTracksEncode[iTrack].getCleanID()
				+ 'Preview')).html(items.join(' '));
		}
	}
}

function searchTracks() {
	orderedCmnTracksEncode.length = 0;		// clear ordered tracks
	orderedCmnTracksEncode.sigLength = 0;	// number of tracks that have significant results
	$('#cmnTrackEncodeTbodyHolder').html($('#cmnTrackEncodeTbodyHolder').html() 
		+ $('#cmnTrackEncodeSortedTbodyHolder').html() 
		+ $('#cmnTrackEncodeInsigTbodyHolder').html());
	$('#cmnTrackEncodeSortedTbodyHolder').html('');
	$('#cmnTrackEncodeInsigTbodyHolder').html('');
	$('#cmnTrackEncodeSortedTbodyHolder').show();
	$('#cmnTrackEncodeInsigTbodyHolderHeader').hide();
	toggleTbody('cmnTrackEncodeInsigTbodyHolder', false);
	
	for(var i = 0; i < spcArray.length; i++) {
		if(!isEncodeOn || !spcArray[i].isEncode) {
			continue;
		}
		spcArray[i].regionToShow = new ChrRegion($('#regionToShow').val());
		spcArray[i].orderedUniTracksEncode.length = 0;		// clear ordered tracks
		spcArray[i].orderedUniTracksEncode.sigLength = 0;	// number of tracks that have significant results
		$(document.getElementById(spcArray[i].unsortedTbodyID)).html($(document.getElementById(spcArray[i].unsortedTbodyID)).html()
			+ $(document.getElementById(spcArray[i].sortedTbodyID)).html() 
			+ $(document.getElementById(spcArray[i].insigTbodyID)).html());
		$(document.getElementById(spcArray[i].sortedTbodyID)).html('');
		$(document.getElementById(spcArray[i].insigTbodyID)).html('');
		$(document.getElementById(spcArray[i].sortedTbodyID)).show();
		$(document.getElementById(spcArray[i].insigTbodyID + 'Header')).hide();
		toggleTbody(spcArray[i].insigTbodyID, false);
	}
	for(var j = 0; j < cmnTracksEncode.length; j++) {
		// send across all species
		$('#' + cmnTracksEncode[j].getCleanID() + 'Preview').html('');
		cmnTracksEncode[j].clearAllSpeciesValues();
		for(var i = 0; i < spcArray.length; i++) {
			if(!isEncodeOn || !spcArray[i].isEncode) {
				continue;
			}
			var sendData = new Object();
			sendData['region'] = spcArray[i].regionToShow.toString();
			//console.log(spcArray[i].regionToShow.toString());
			sendData['tableName'] = cmnTracksEncode[j].getSpeciesTblName(spcArray[i].db);
			sendData['db'] = spcArray[i].db;
			//console.log(sendData);
			
			$.getJSON('getpreview.php', sendData, createJSONReturnFunction(true, j, i));
		}
	}
	for(var i = 0; i < spcArray.length; i++) {
		if(!isEncodeOn || !spcArray[i].isEncode) {
			continue;
		}
		for(var j = 0; j < spcArray[i].uniTracksEncode.length; j++) {
			spcArray[i].uniTracksEncode[j].clearAllSpeciesValues();
			var sendData = new Object();
			sendData['region'] = spcArray[i].regionToShow.toString();
			//console.log(spcArray[i].regionToShow.toString());
			sendData['tableName'] = spcArray[i].uniTracksEncode[j].getSpeciesTblName();
			sendData['db'] = spcArray[i].db;
			$.getJSON('getpreview.php', sendData, createJSONReturnFunction(false, j, i));
		}
	}
}

function toggleHeaderText(header) {
	if($('#' + header).html() == '[-]') {
		$('#' + header).html('[+]');
	} else {
		$('#' + header).html('[-]');
	}
}

function toggleTbody(panel, toggleTo) {
	// don't toggle if it's already matching toggleTo
	if(arguments.length > 1 && (toggleTo === ($('#' + panel).css('display') != 'none'))) {
		return;
	}
	$('#' + panel + 'Holder').slideToggle('fast', toggleHeaderText(panel + 'Indicator'));
}

function attachTextListener(input, func) {
	if (window.addEventListener) {
		input.addEventListener('input', func, false);
	} else {
		input.attachEvent('onpropertychange', function() {
			func.call(input);
			});
	}
}

function switchLeft() {
	if(left_value >= 0) {
		left_value = -left_width;
		document.getElementById('sidebar1').style.left = left_value + "px";
		document.getElementById('leftborder').style.left = left_value + left_width + "px";
		document.getElementById('mainContent').style.left = left_value + left_width + 5 + "px";
		document.getElementById('leftbutton').style.backgroundImage = "url(cpbrowser/images/right_arrow.gif)";
	} else {
		left_value = 0;
		document.getElementById('sidebar1').style.left = left_value + "px";
		document.getElementById('leftborder').style.left = left_value + left_width + "px";
		document.getElementById('mainContent').style.left = left_value + left_width + 5 + "px";
		document.getElementById('leftbutton').style.backgroundImage = "url(cpbrowser/images/left_arrow.gif)";
	}
}

function clear_text() {
	if(document.getElementById("genelist").selectedIndex > 0) {
		document.getElementById("geneName").value = "";
	}
}

function change_text(txtValue) {
	querySent = txtValue;
	$("#geneName").val(querySent);
	$("#direct").val("true");
	timerOn = 0;
	$('#GListResponse').removeClass("BoxShow");
	$('#GListResponse').addClass("BoxHide");
}

//function reset_selection() {
//	if(document.getElementById("geneName").value != "") {
//		document.getElementById("genelist").selectedIndex = 0;
//	}
//}

function toggleGList(toggle) {
	if(toggle == 1) {
		// turn on GList
		gListIsOn = 1;
		$('#GListResponse').removeClass("BoxHide");
		$('#GListResponse').addClass("BoxShow");
	} else {
		gListIsOn = 0;
		$('#GListResponse').removeClass("BoxShow");
		$('#GListResponse').addClass("BoxHide");
	}
}

function toggleHeaderText(header) {
	if($('#' + header).html() == '[-]') {
		$('#' + header).html('[+]');
	} else {
		$('#' + header).html('[-]');
	}
}

function togglePanel(panel, hideothers) {
	if(hideothers && $('#' + panel).css('display') == 'none') {
		if($('#navigationHolder').css('display') != 'none') {
			$('#navigationHolder').slideToggle('fast', toggleHeaderText('navigationIndicator'));
		}
		if($('#genelistHolder').css('display') != 'none') {
			$('#genelistHolder').slideToggle('fast', toggleHeaderText('genelistIndicator'));
		}
	}
	$('#' + panel + 'Holder').slideToggle('fast', toggleHeaderText(panel + 'Indicator'));
}

function textFocused() {
	inFocus = true;
}

function textChanged() {
	// reset_selection();
	if(timerOn == 1) {
		clearTimeout(timeoutVar);
		timerOn = 0;
	}
	//$("#waiting").html($("#geneName").val());
	var chromRegex = /^chr\w+\s*(:|\s)/i;
	if($("#speciesOrGeneName").val() == "gene"
		&& $.trim($("#geneName").val()).length > 1
		&& $.trim($("#geneName").val()) != querySent
		&& !chromRegex.test($("#geneName").val())) {
			// length is enough for ajax and also not already updated
			// start the timer to prepare for ajax
			$("#direct").val("false");
			if(gListIsOn == 0) {
				timerOn = 1;
				timeoutVar = setTimeout("sendAjax();", 500);
			} else {
				sendAjax();
			}
	} else if($.trim($("#geneName").val()).length <= 1 
		|| chromRegex.test($("#geneName").val())) {
			toggleGList(0);
	}
}

function textBlured() {
	if(timerOn == 1) {
		clearTimeout(timeoutVar);
	}
	timerOn = 1;
	inFocus = false;
	if(!mouseInGList) {
		timeoutVar = setTimeout('hideGListResponse();', 200);
	}
}

function inGList(flag) {
	if(timerOn == 1) {
		clearTimeout(timeoutVar);
		timerOn = 0;
	}
	mouseInGList = flag;
	if(!mouseInGList && !inFocus) {
		timerOn = 1;
		timeoutVar = setTimeout('hideGListResponse();', 1000);
	}
}

function hideGListResponse() {
	timerOn = 0;
	toggleGList(0);
}

function sendAjax() {
	timerOn = 0;
	//$("#waiting").html($.trim($("#geneName").val()).length);
	if($.trim($("#geneName").val()).length > 1
		&& $.trim($("#geneName").val()) != querySent) {
		// send Ajax
		querySent = $.trim($("#geneName").val());
		$('#geneName').addClass('searchFieldBusy');
		//toggleGList(0);
		$('#GListResponse').html('<em>Loading...</em>');
		toggleGList(1);
		$.getJSON('cpbrowser/jsongenename.php', {name: querySent}, function(data) {
			$('#geneName').removeClass('searchFieldBusy');
			var items = [];
			var hasItems = true;
			items.push('<table width="95%" cellspacing="0" cellpadding="0" border="0">');
			$.each(data, function(key, val) {
				//console.log(key);
				if(key == "(none)") {
					hasItems = false;
				} else {
					key = key.replace(/__[0-9]+/, "");		// remove potential duplicate aliases
					if(key == val) {
						items.push('<tr><td class="geneChoice" onClick="change_text(\'' + val + '\');">' 
							+ '<strong>' + val.substr(0, querySent.length) + '</strong>' + val.substr(querySent.length) + '</td></tr>');
					} else {
						// key is alias, val is real gene name
						items.push('<tr><td class="geneChoice" onClick="change_text(\'' + val + '\');">' 
							+ val + ' (<strong>' + key.substr(0, querySent.length) + '</strong>' + key.substr(querySent.length) + ')</td></tr>');
					}
				}
			});
			items.push('</table>');
			
			if(hasItems) {
				$('#GListResponse').html(items.join(''));
			} else {
				$('#GListResponse').html('<em>(No results)</em>');
			}
		});
		
	}
}

//function setText(text) {
//	querySent = text;
//	document.getElementById("geneName").value = text;
//}

function validate_form_genequery() {
//	window.alert(document.getElementById("genelist").selectedIndex);
	if($("#geneName").val() == "") {
		window.alert("You need to either choose a gene or type in part of its name before proceeding.");
		return false;
	}
	var chromRegex = /^chr\w+\s*(:|\s)\s*[0-9,]+\s*(-|\s)\s*[0-9,]+/i;
	if(chromRegex.test($("#geneName").val())) {
		if($("#speciesOrGeneName").val() == "gene") {
			// should choose a species
			window.alert("Please specify the species of the coordinates.\n\nYou can do this by clicking \"Gene Name\" to the left of\n the query field.");
			return false;
		}
	} else if($("#speciesOrGeneName").val() != "gene") {
		// should input coordinate
		window.alert("Please specify coordinates in one of the following formats:\n\n   \"chrX:XXXXX-XXXXX\"\n   \"chrX XXXXX XXXXX\"\n\n You can also select \"Gene name\" to query a gene across all species.");
		return false;
	}
	
	var checked = 0;
	for(var i = 0; i < document.getElementById("searchform").elements.length; i++) {
		if(document.getElementById("searchform").elements[i].type == "checkbox" 
			&& document.getElementById("searchform").elements[i].checked) {
			checked++;
		}
	}
	if(checked < 2) {
		window.alert("You need to choose at least TWO (2) species.");
		return false;
	}
	// Now is the real Ajax part.
	$('#search').prop('disabled', true);
	$("#genelistContentHolder").html('');
	$('#genelistLoading').removeClass('BoxHide');
	var postdata = {};
//	speciesDbName = new Array();
	$.each($('#searchform').serializeArray(), function(i, field) {
//		if($('#' + field.name).is("checkbox")) {
//			speciesDbName.push(field.name);
//		}
		postdata[field.name] = field.value;
		});
	$.post("cpbrowser/genelist.php<?php echo $in_debug? "?Debug=XCDebug": ""; ?>", postdata, regionUiHandler);
	return false;
}

function checkEncodeSpecies() {
	var spcAvailableCount = 0;
	for(var i = 0; i < spcArray.length; i++) {
		if(isEncodeOn && !spcArray[i].isEncode) {
			$('#' + spcArray[i].db + '_checkboxWrapper').hide();
			$('#' + spcArray[i].db).attr('checked', false);
			spcArray[i].isActive = false;
		} else {
			$('#' + spcArray[i].db + '_checkboxWrapper').show();
			$('#' + spcArray[i].db).attr('checked', true);
			spcArray[i].isActive = true;
			spcAvailableCount++;
		}
		updateSpcActive(spcArray[i].db);
	}
	if(spcAvailableCount > 2) {
		$('#speciesTable').show();
	} else {
		$('#speciesTable').hide();
	}
	updateType();
}


function updateSampleCheckbox() {
	cmnTracksEncode.updateAllStates();
	for(var s = 0; s < spcArray.length; s++) {
		if(!spcArray[s].isEncode) {
			continue;
		}
		spcArray[s].uniTracksEncode.updateAllStates();
	}
}

function changeSettings(db, settings, val) {
	var conDoc = (document.getElementById(db).contentWindow || document.getElementById(db).contentDocument);
	if(conDoc.document) {
		conDoc = conDoc.document;
	}
	conDoc.getElementById(settings).value = val;
}

function callSubmit(db) {	// Notice that actually only the control frames get submitted, the others only get refreshed.
	var conDoc = (document.getElementById(db + "_controls").contentWindow || document.getElementById(db + "_controls").contentDocument);
	if(conDoc.document) {
		conDoc = conDoc.document;
	}
	conDoc.getElementById("TrackForm").submit();
}

var isInDownload = false;

function callDownloadMenu(cmnName, isCommon, btnID, isEncode) {
	var btnPos = $('#' + btnID).offset();
	var btnWidth = $('#' + btnID).width();
	var btnHeight = $('#' + btnID).height();
	var sendData = "";
	if(!isEncode) {
		isEncode = false;
	}
	$('#downloadBox').css({left: btnPos.left - $('#downloadBox').width() + btnWidth,
		top: btnPos.top + btnHeight});
	$('#downloadContent').html('<em>Loading...</em>');
	$('#downloadBox').show();
	if(isCommon) {
		// This comes from common, send the whole associative array to download page
		if(!isEncode) {
			sendData = cmnTracks.get(cmnName).getWholeSpcTblName();
		} else {
			sendData = cmnTracksEncode.get(cmnName).getWholeSpcTblName();
		}
		$.getJSON('cpbrowser/getdownload.php', sendData, function(data) {
			// The return will have basically one key (spcDbName+'__'+tableName), 
			// and one value (shortLabel + '||' + type + '||' + longLabel) to display
			// no super track will be returned (will be filtered by jsondownload.php)
			// also returns will be ordered by species for grouping
			var currentDb = "";
			var items = [];
			$.each(data, function(key, val) {
				var db = key.split("__")[0];
				if(currentDb != db) {
					// db has changed
					items.push("<div class='speciesTrackHeader'>" + spcArray[spcArray.map[db]].commonName + "</div>");
					currentDb = db;
				}
				// split the value into shortlabel, type, and long label
				values = val.split("||");
				// put the short label into display and key in the link
				items.push("<div style='padding: 0px 8px;'><a class='downloadFile' href='cpbrowser/download.php?file="
					+ key + "' title='"
					+ values[2] + "'>" 
					+ values[0] + "</a> <div class='downloadType'>"
					+ values[1] + "</div></div>");
			});
			$('#downloadContent').html(items.join(''));
		});
	} else {
		var uniIDNames = cmnName.split("--");
		var jsondata = new Object();
		jsondata[uniIDNames[0]] = uniIDNames[1];
		$.getJSON('cpbrowser/getdownload.php', jsondata, function(data) {
			// The return will have basically one key (spcDbName+'__'+tableName), 
			// and one value (shortLabel + '||' + type + '||' + longLabel) to display
			// no super track will be returned (will be filtered by jsondownload.php)
			// also returns will be ordered by species for grouping
			var items = [];
			$.each(data, function(key, val) {
				// split the value into shortlabel, type, and long label
				values = val.split("||");
				// put the short label into display and key in the link
				items.push("<div style='padding: 0px 4px;'><a class='downloadFile' href='cpbrowser/download.php?file="
					+ key + "' title='"
					+ values[2] + "'>" 
					+ values[0] + "</a> <div class='downloadType'>"
					+ values[1] + "</div></div>");
			});
			$('#downloadContent').html(items.join(''));
		});
	}
	return false;
}

function inDownload(flag) {
	isInDownload = flag;
}

function hideDownload() {
	$('#downloadBox').hide();
}

function toggleWindowHeaderText(header) {
	if($('#' + header).html() == '≪') {
		$('#' + header).html('≫');
	} else {
		$('#' + header).html('≪');
	}
}

function hideWindowHeaderText(header) {
	$('#' + header).html('≫');
}

function showWindowHeaderText(header) {
	$('#' + header).html('≪');
}

function hideWindow(panel) {
	$('#' + panel).fadeOut('fast', hideWindowHeaderText(panel + 'Indicator'));
	hideDownload();
}

function showWindow(panel) {
	$('#' + panel).fadeIn('fast', showWindowHeaderText(panel + 'Indicator'));
}

function toggleWindow(panel) {
	/*for(var i = 0; i < listPanels.length; i++) {
		if(listPanels[i] == panel) {
			continue;
		}
		hidePanel(listPanels[i]);
	}*/
	hideDownload();
	hideSample();
	$('#' + panel).fadeToggle('fast', toggleWindowHeaderText(panel + 'Indicator'));
}

function trackSettingsOnLoad() {
	if(document.getElementById('trackSettingFrame').contentWindow.location.href != "about:blank" && !$('#trackSettings').is(":visible")) {
		togglePanel('trackSettings');
	}
}

function markTrackInitialized(flag) {
	tracksInitialized = flag;
	if(tracksInitialized) {
		$('#trackSelectLoading').addClass('trackSelectHide');
	} else {
		$('#trackSelectLoading').removeClass('trackSelectHide');
	}
}



function toggleSubHeaderText(header) {
	if($('#' + header).html() == '[-]') {
		$('#' + header).html('[+]');
	} else {
		$('#' + header).html('[-]');
	}
}

function toggleSubPanel(panel, hideothers) {
	if(hideothers && $('#' + panel).css('display') == 'none') {
		if($('#commonHolder').css('display') != 'none') {
			$('#commonHolder').slideToggle('fast', toggleSubHeaderText('commonIndicator'));
		}
		if($('#uniqueHolder').css('display') != 'none') {
			$('#uniqueHolder').slideToggle('fast', toggleSubHeaderText('uniqueIndicator'));
		}
	}
	$('#' + panel + 'Holder').slideToggle('fast', toggleSubHeaderText(panel + 'Indicator'));
}

function toggleEncode() {
	isEncodeOn = !isEncodeOn;
	if(isEncodeOn) {
		$('#NonEncodeData').addClass('BoxHide');
		$('#EncodeData').removeClass('BoxHide');
		$('#trackSelect').width(600);
		//$('#EncodeDataButton').html('View Other Data');
		$('#encodeSampleSettings').show();
		$('#uploadAndCompare').show();
	} else {
		$('#EncodeData').addClass('BoxHide');
		$('#NonEncodeData').removeClass('BoxHide');
		$('#trackSelect').width(380);
		//$('#EncodeDataButton').html('View ENCODE Data');
		$('#uploadAndCompare').hide();
		$('#encodeSampleSettings').hide();
	}
	checkEncodeSpecies();	
}

function toggleSample() {
	if($('#sampleTypeBox').css('display') == 'none') {
		$('#sampleTypeBox').show();
		updateSampleCheckbox();
	} else {
		$('#sampleTypeBox').hide();
	}
}

function hideSample() {
	$('#sampleTypeBox').hide();
}

function resize_tbody() {
	$('#trackSelect').css('max-height', ($(window).height() - 4) + 'px'); 
	$('#EncodeData').css('max-height', ($(window).height() - 144) + 'px'); 
}

function updateSpcActive(ID) {
	spcArray[spcArray.map[ID]].isActive = document.getElementById(ID).checked;
}

function updateType() {
	var spcOrGeneName = $("#speciesOrGeneName");
	var typeSelected = spcOrGeneName.val();
	if(typeSelected != "gene" && !spcArray[spcArray.map[typeSelected]].isActive) {
		typeSelected = "gene";
	}
	spcOrGeneName.empty();
	spcOrGeneName.append(new Option("Gene name", "gene"));
	for(var i = 0; i < spcArray.length; i++) {
		if(spcArray[i].isActive) {
			spcOrGeneName.append(new Option(spcArray[i].db + " region", spcArray[i].db));
		}
	}
	spcOrGeneName.val(typeSelected);
}

function updateSpcCheckbox() {
	updateSpcActive(this.id);
	updateType();
}

$(document).ready( function () {
	for(var i = 0; i < spcArray.length; i++) {
		$('#' + spcArray[i].db).on("change", updateSpcCheckbox);
	}
	document.getElementById('sidebar1').style.left = left_value + "px";
	document.getElementById('leftborder').style.left = left_value + left_width + "px";
	document.getElementById('mainContent').style.left = left_value + left_width + 5 + "px";
	attachTextListener(document.getElementById('geneName'), textChanged);
	resize_tbody();
	isEncodeOn = !isEncodeOn;
	toggleEncode();
	
	jQuery(function() {
		jQuery(".geneNameInsert").hide();
		jQuery(".geneNameExpander").click(function(event) {
			jQuery(this.nextElementSibling).toggle();
			jQuery(this.nextElementSibling).position().left 
				= jQuery(this).position().left + jQuery(this).width() 
				- jQuery(this.nextElementSibling).width();
			jQuery(this.nextElementSibling).position().top = jQuery(this).position().top;
			event.stopPropagation();
		});
		jQuery(".geneNameInsert").click(function(event) {
			jQuery(this).hide();
			event.stopPropagation();
		});
	});
	
	$('#uploadFile').on('submit', validateUploadFileOrURL);
});
</script>
<script type="text/javascript">

  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', '<?php echo GOOGLE_ANALYTICS_ACCOUNT; ?>']);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
</script>
<?php
	$mysqli = connectCPB();
?>
</head>
<body class="twoColLiqLt" onresize="resize_tbody();">
<div id="container">
  <div id="sidebar1">
    <div id="logoholder"> <a href="index.php" target="_self"><img src="cpbrowser/images/Logo.gif" alt="Comparative Genome Browser Logo" border="0" /></a> </div>
    <div class="header" id="selectHeader" onclick="togglePanel('selection', false);"> <span class="tableHeader"><span class="headerIndicator" id="selectionIndicator">[-]</span> Gene / Region Query</span></div>
    <div id="selectionHolder">
      <form name="searchform" class="formstyle" id="searchform" onsubmit="return validate_form_genequery();">
        <?php
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
	?>
        <div class="BoxHide" id="GListResponse" onmouseover="inGList(true);" onmouseout="inGList(false);"></div>
        <div class="selectBox">
          <select id="speciesOrGeneName" name="species">
            <option value="gene">Gene name</option>
            <?php
	for($i = 0; $i < $num_spc; $i++) {
		?>
            <script type="text/javascript">
				spcArray.push(new Species("<?php echo $spcinfo[$i]["dbname"]; ?>", 
					"<?php echo $spcinfo[$i]["name"]; ?>", "<?php echo $spcinfo[$i]["commonname"]; ?>",
					<?php echo ($spcinfo[$i]["encode"]? "true": "false"); ?>));
				spcArray.map["<?php echo $spcinfo[$i]["dbname"]; ?>"] = <?php echo $i; ?>;
			  </script>
            <option value="<?php echo $spcinfo[$i]["dbname"]; ?>"><?php echo $spcinfo[$i]["dbname"]; ?> region</option>
            <?php
	}
        ?>
          </select>
        </div>
        <input id="search" name="search" type="submit" value="GO" />
        <input name="geneName" id="geneName" type="text" size="15" maxlength="40" onfocus="textChanged();" onblur="textBlured();" autocomplete="off" />
        <div style="clear: both;"></div>
        <input type="hidden" id="direct" name="direct" value="false" />
        <table id="speciesTable" width="100%" border="1" cellspacing="0" cellpadding="1px" bordercolor="#666666" style="border: 1px solid #666666; margin: 3px 0px; min-height: 60px;">
          <tr>
            <td width="18px" bgcolor="#666666" style="border: 1px solid #666666;"><div class="rotatedCCW"><span class="subHeaderNoHover">Species</span></div></td>
            <td style="border: 1px solid #666666;"><?php
	for($i = 0; $i < $num_spc; $i++) {
		
?>
              <div id="<?php echo $spcinfo[$i]["dbname"]; ?>_checkboxwrapper" >
                <label>
                  <input type="checkbox" name="<?php echo $spcinfo[$i]["dbname"]; ?>" id="<?php echo $spcinfo[$i]["dbname"]; ?>" value="<?php echo $spcinfo[$i]["dbname"]; ?>" checked <?php if($i == 0) echo "disabled"; ?> />
                  <em><?php echo $spcinfo[$i]["name"]; ?></em> (<?php echo $spcinfo[$i]["commonname"]; ?>)
                  [<?php echo $spcinfo[$i]["dbname"]; ?>]</label>
              </div>
              <?php
	}
	$species->free();
	$mysqli->close();
		?></td>
          </tr>
        </table>
        <script type="text/javascript">
		checkEncodeSpecies();
		</script>
      </form>
      <div class="header tableHeader buttons" style="float: right; margin: 0px;" onclick="toggleWindow('trackSelect');">Track Selection &amp; Data Download <span id="trackSelectIndicator">≫</span></div>
      <div style="clear: both"></div>
      <!-- end #selection --> 
    </div>
    <div class="header" id="genelistHeader" onclick="togglePanel('genelist', false);"> <span class="tableHeader"><span class="headerIndicator" id="genelistIndicator">[-]</span> Gene / Region Selection</span></div>
    <div id="genelistHolder">
      <div id="genelistLoading" class="loadingCover BoxHide" style="min-height: 36px; left: 0px; width: auto;">
        <div class="loadingCoverBG"></div>
        <div class="loadingCoverImage"></div>
      </div>
      <div id="genelistContentHolder"> </div>
      <!-- end #genelist -->
      <div id="genelistfooter"> <span class="smallformstyle">(*): there is no orthologous region in that section.</span> </div>
    </div>
    <div class="header" id="navigationHeader" onclick="togglePanel('navigation', false);"> <span class="tableHeader"><span class="headerIndicator" id="navigationIndicator">[-]</span> Navigation</span></div>
    <div class="smallformstyle" id="navigationHolder">
      <div style="border: 1px #000000 solid;" id="masterHolder" class="BoxHide">
        <div id="masterLoading" class="loadingCover" style="height: 36px; width: 218px;">
          <div class="loadingCoverBG"></div>
          <div class="loadingCoverImage"></div>
        </div>
        <table width="100%" border="0" align="center" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
          <tr>
            <td rowspan="2" scope="col" class="speciesHeader"><span>MASTER CONTROL</span></td>
            <td align="center" valign="middle" scope="col" style="padding-top: 2px;"><div onmouseover="showHover('L3');" onmouseout="hideHover('L3');" class="toolButtonImage" style="float: left;" title="Move 95% to upstream" onclick="callMasterViewChange('left3', false);"><img src="cpbrowser/images/arrowsl3.gif" width="17" height="8" class="toolImage" /></div>
              <div onmouseover="showHover('L2');" onmouseout="hideHover('L2');" class="toolButtonImage" style="float: left;" title="Move 47.5% to upstream" onclick="callMasterViewChange('left2', false);"><img src="cpbrowser/images/arrowsl2.gif" width="12" height="8" class="toolImage" /></div>
              <div onmouseover="showHover('L1');" onmouseout="hideHover('L1');" class="toolButtonImage" style="float: left;" title="Move 10% to upstream" onclick="callMasterViewChange('left1', false);"><img src="cpbrowser/images/arrowsl1.gif" width="7" height="8" class="toolImage" /></div>
              <div onmouseover="showHover('R3');" onmouseout="hideHover('R3');" class="toolButtonImage" style="float: right;" title="Move 95% to downstream" onclick="callMasterViewChange('right3', false);"><img src="cpbrowser/images/arrowsr3.gif" width="17" height="8" class="toolImage" /></div>
              <div onmouseover="showHover('R2');" onmouseout="hideHover('R2');" class="toolButtonImage" style="float: right;" title="Move 47.5% to downstream" onclick="callMasterViewChange('right2', false);"><img src="cpbrowser/images/arrowsr2.gif" width="12" height="8" class="toolImage" /></div>
              <div onmouseover="showHover('R1');" onmouseout="hideHover('R1');" class="toolButtonImage" style="float: right;" title="Move 10% to downstream" onclick="callMasterViewChange('right1', false);"><img src="cpbrowser/images/arrowsr1.gif" width="7" height="8" class="toolImage" /></div>
              <span id="overallGeneName">Gene name</span> 
              <!--<div style="clear: both"></div>--></td>
          </tr>
          <tr>
            <td align="center" valign="middle" style="padding-bottom: 2px;"><img src="cpbrowser/images/zoomin.gif" alt="ZoomIn" width="12" height="12" class="iconImage" style="float: left;" />
              <div onmouseover="showZoomHover('I1');" onmouseout="hideZoomHover('I1');" class="toolButton" style="float: left;" onclick="callMasterViewChange('in1', true);">1.5x</div>
              <div onmouseover="showZoomHover('I2');" onmouseout="hideZoomHover('I2');" class="toolButton" style="float: left;" onclick="callMasterViewChange('in2', true);">3x</div>
              <div onmouseover="showZoomHover('I3');" onmouseout="hideZoomHover('I3');" class="toolButton" style="float: left;" onclick="callMasterViewChange('in3', true);">10x</div>
              <div onmouseover="showZoomHover('I4');" onmouseout="hideZoomHover('I4');" class="toolButton" style="float: left;" onclick="callMasterViewChange('inBase', true);">Base</div>
              <div onmouseover="showZoomHover('O1');" onmouseout="hideZoomHover('O1');" class="toolButton" style="float: right;" onclick="callMasterViewChange('out3', true);">10x</div>
              <div onmouseover="showZoomHover('O2');" onmouseout="hideZoomHover('O2');" class="toolButton" style="float: right;" onclick="callMasterViewChange('out2', true);">3x</div>
              <div onmouseover="showZoomHover('O3');" onmouseout="hideZoomHover('O3');" class="toolButton" style="float: right;" onclick="callMasterViewChange('out1', true);">1.5x</div>
              <img src="cpbrowser/images/zoomout.gif" alt="ZoomOut" width="12" height="12" class="iconImage" style="float: right;" /> 
              <!--<div style="clear: both;"></div>--></td>
          </tr>
        </table>
      </div>
      <div id="navigationContent"> </div>
    </div>
    <!-- end #sidebar1 --> 
  </div>
  <div id="spcNaviTemplate" class="BoxHide">
    <div id="spcDbNameLoading" class="loadingCover" style="height: 50px; width: 218px;">
      <div class="loadingCoverBG"></div>
      <div class="loadingCoverImage"></div>
    </div>
    <table width="100%" border="0" align="center" cellpadding="0" cellspacing="0" style="table-layout: fixed; height: 50px;">
      <tr>
        <td rowspan="3" scope="col" class="speciesLead"><span>spcCmnName</span></td>
        <td align="center" valign="middle" scope="col" style="padding: 2px;"><span id="spcDbNameCoor">spcCoor</span></td>
      </tr>
      <tr>
        <td align="center" valign="middle"><div id="spcDbNameleft3" class="toolButtonImage" style="float: left;" title="Move 95% to the left" onclick="callViewChange('spcDbName', 'left3');"> <img src="cpbrowser/images/arrowsl3.gif" width="17" height="8" class="toolImage" /> </div>
          <div id="spcDbNameleft2" class="toolButtonImage" style="float: left;" title="Move 47.5% to the left" onclick="callViewChange('spcDbName', 'left2');"><img src="cpbrowser/images/arrowsl2.gif" width="12" height="8" class="toolImage" /></div>
          <div id="spcDbNameleft1" class="toolButtonImage" style="float: left;" title="Move 10% to the left" onclick="callViewChange('spcDbName', 'left1');"><img src="cpbrowser/images/arrowsl1.gif" width="7" height="8" class="toolImage" /></div>
          <div id="spcDbNameright3" class="toolButtonImage" style="float: right;" title="Move 95% to the right" onclick="callViewChange('spcDbName', 'right3');"><img src="cpbrowser/images/arrowsr3.gif" width="17" height="8" class="toolImage" /></div>
          <div id="spcDbNameright2" class="toolButtonImage" style="float: right;" title="Move 47.5% to the right" onclick="callViewChange('spcDbName', 'right2');"><img src="cpbrowser/images/arrowsr2.gif" width="12" height="8" class="toolImage" /></div>
          <div id="spcDbNameright1" class="toolButtonImage" style="float: right;" title="Move 10% to the right" onclick="callViewChange('spcDbName', 'right1');"><img src="cpbrowser/images/arrowsr1.gif" width="7" height="8" class="toolImage" /></div>
          spcGeneName 
          <!--<div style="clear: both"></div>--></td>
      </tr>
      <tr>
        <td align="center" valign="middle" scope="col"><img src="cpbrowser/images/zoomin.gif" alt="ZoomIn" width="12" height="12" class="iconImage" style="float: left;" />
          <div id="spcDbNameI1" class="toolButton" style="float: left;" onclick="callViewChange('spcDbName', 'in1');">1.5x</div>
          <div id="spcDbNameI2" class="toolButton" style="float: left;" onclick="callViewChange('spcDbName', 'in2');">3x</div>
          <div id="spcDbNameI3" class="toolButton" style="float: left;" onclick="callViewChange('spcDbName', 'in3');">10x</div>
          <div id="spcDbNameI4" class="toolButton" style="float: left;" onclick="callViewChange('spcDbName', 'inBase');">Base</div>
          <div id="spcDbNameO1" class="toolButton" style="float: right;" onclick="callViewChange('spcDbName', 'out3');">10x</div>
          <div id="spcDbNameO2" class="toolButton" style="float: right;" onclick="callViewChange('spcDbName', 'out2');">3x</div>
          <div id="spcDbNameO3" class="toolButton" style="float: right;" onclick="callViewChange('spcDbName', 'out1');">1.5x</div>
          <img src="cpbrowser/images/zoomout.gif" alt="ZoomOut" width="12" height="12" class="iconImage" style="float: right;" /> 
          <!--<div style="clear: both;"></div>--></td>
      </tr>
    </table>
  </div>
  <div id="trackSelect" class="trackSelectClass" style="width: 380px; min-height: 275px;" onclick="updateSampleCheckbox();">
    <div class="loadingTrackCover" id="trackSelectLoading">
      <div class="loadingTrackCoverBG"></div>
      <div class="loadingTrackCoverImage"></div>
    </div>
    <div class="headerNoHover">Tracks &amp; Data 
      <!--<div class="header buttons" id="EncodeDataButton" style="float: right; padding: 2px 3px; margin: -3px 5px -3px -2px;"
        onclick="toggleEncode();">View ENCODE Data</div>
      <div style="clear: both;"></div>--> 
    </div>
    <div class="settingsNormal">Tracks can be turn on/off via the checkboxes below.
      <div id="encodeSampleSettings" style="display: inline;">You can also
        <div class="header buttons" style="display: inline; padding: 2px 3px; margin: -3px 0px -3px -2px;"
    onclick="toggleSample();">Choose sample type</div>
      </div>
    </div>
    <!-- This is the upload new file part -->
    <div class="settingsNormal" id="uploadAndCompare" style="display: none;">
      <form name="uploadFile" id="uploadFile">
        Or upload custom peak file (for specified database) below for analysis.<br>
        <div class="selectBox">
          <select required id="speciesToUpload" name="speciesToUpload">
            <option selected value="unselected">Database</option>
            <?php
	for($i = 0; $i < $num_spc; $i++) {
		if($spcinfo[$i]["encode"]) {
		?>
            <option value="<?php echo $spcinfo[$i]["dbname"]; ?>"><?php echo $spcinfo[$i]["dbname"]; ?></option>
            <?php
		}
	}
        ?>
          </select>
        </div>
        <input type="file" id="uploadFileInput" name="uploadFileInput" />
        <input type="submit" value="Upload Data" name="fileSubmit" id="fileSubmit" />
      </form>
      <div style="clear: both;"></div>
    </div>
    <!-- end upload new file part -->
    <div id="NonEncodeData">
      <div class="subBox">
        <div class="subHeader" onclick="toggleSubPanel('cmnTrack', false);"><span class="headerIndicator" id="cmnTrackIndicator">[-]</span> Common tracks</div>
        <div class="trackHolder" id="cmnTrackHolder"></div>
      </div>
      <div class="subBox">
        <div class="subHeader" onclick="toggleSubPanel('unique', false);"><span class="headerIndicator" id="uniqueIndicator">[-]</span> Unique tracks</div>
        <div id="uniqueHolder"></div>
      </div>
    </div>
    <div id="EncodeData" style="overflow-y: auto;" class="BoxHide">
      <div class="subBox ENCODETracks">
        <div class="subHeader" onclick="toggleSubPanel('cmnTrackEncode', false);"> <span class="headerIndicator" id="cmnTrackEncodeIndicator">[-]</span> Common tracks from ENCODE</div>
        <div class="trackHolder" id="cmnTrackEncodeHolder">
          <table width="100%" style="border-collapse: collapse; border-spacing: 0;">
            <thead>
              <tr class="trackHeaderEncode">
                <th style="width: 35%;">Track Name</th>
                <th>Sample Type</th>
                <th style="width: 20%;">Preview</th>
                <th style="width: 5%;">Data</th>
              </tr>
            </thead>
            <tbody id="cmnTrackEncodeSortedTbodyHolder" style="display: none;">
            </tbody>
            <tbody class="insigTbody" id="cmnTrackEncodeInsigTbodyHolderHeader" style="display: none;">
              <tr>
                <td class="insigHeader" onclick="toggleTbody('cmnTrackEncodeInsigTbody', false);" colspan="4"><span class="headerIndicator" id="spcDbNameEncodeInsigTbodyIndicator">[+]</span> Tracks with insignificant signals</td>
              </tr>
            </tbody>
            <tbody class="insigTbody" id="cmnTrackEncodeInsigTbodyHolder" style="display: none;">
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
      <div style="display: none;">
        <?php
	for($i = 0; $i < $num_spc; $i++) {
		
?>
        <iframe onload="setTrackReady(<?php echo $i; ?>);" id="<?php echo $spcinfo[$i]["dbname"] . "_controls"; ?>" 
         name="<?php echo $spcinfo[$i]["dbname"] . "_controls"; ?>" src="<?php 
	  echo "/cgi-bin/hgTracks?clade=mammal&org=" . $spcinfo[$i]["commonname"] . "&db=" . $spcinfo[$i]["dbname"] . "&Submit=submit&hgsid=" . requestSpeciesHgsID($spcinfo[$i]["dbname"]) . '&showEncode=' . ($encodeOn? 'on': 'off') . "&hgControlOnly=on"; 
	  ?>">Your browser doesn't support &lt;iframe&gt; tag. You need a browser supporting &lt;iframe&gt; tag to use Comparison Browser. (Latest versions of mainstream browsers should all support this tag.)</iframe>
        <?php
	}
		?>
      </div>
    </div>
    <div class="header buttons" style="float: right;" onclick="updateTracks(); toggleWindow('trackSelect');">Update</div>
    <div class="header buttons" style="float: right;" onclick="resetTracks();">Reset view</div>
    <div class="header buttons" style="float: right;" onclick="toggleWindow('trackSelect');">Close</div>
    <div style="clear: both"></div>
  </div>
  <div id="sampleTypeBox" class="downloadBox" style="left: 637px; top: 58px; width: 300px;">
    <div class="subHeaderNoHover">Sample List
      <div class="header buttons" style="float: right; padding: 2px 3px; margin: -2px;" onclick="hideSample();">Close</div>
      <div style="clear: both;"></div>
    </div>
    <div class="speciesTrackHeader">Common sample types:</div>
    <div id="cmnSampleEncodeHolder" style="padding: 4px;"></div>
    <div class="speciesTrackHeader">Species-only sample types</div>
    <div id="uniSampleEncodeHolder" style="padding: 4px; max-height: 300px; overflow-y: auto; overflow-x: hide;"></div>
  </div>
  <div id="downloadBox" class="downloadBox" onmouseover="inDownload(true);" onmouseout="inDownload(false);">
    <div class="subHeaderNoHover">Download Data
      <div class="header buttons" style="float: right; padding: 2px 3px; margin: -2px;" onclick="hideDownload();">Close</div>
      <div style="clear: both;"></div>
    </div>
    <div id="downloadContent" style="padding: 4px;"></div>
  </div>
  <?php
		if(!isset($_COOKIE['NoTipTrackSettings']) || $_COOKIE['NoTipTrackSettings'] != 'true') {
?>
  <script type="text/javascript">
function hideTrackHint() {
	$.post('cpbrowser/postcookie.php', { varName: 'NoTipTrackSettings', value: 'true' } );
	$('#trackSelectHint').fadeOut('fast');
}
setTimeout("$('#trackSelectHint').fadeOut('fast')", 7500);
</script>
  <div id="trackSelectHint" style="z-index: 20; width: 250px; display: block; padding: 5px; font-family: Verdana, Arial, Helvetica, sans-serif;
font-size: 12px; line-height: 17px; background: #FFFFCC;" class="trackSelectClass"> Hint: tracks can be turned on / off via the <span class="panel">track selection</span> panel, click button on the left to show.
    <div class="header buttons" style="float: right; margin-top: 5px;" onclick="hideTrackHint();">Do not show in the future</div>
    <div style="clear: both"></div>
  </div>
  <?php
		}
?>
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
            <th style="width: 30%;">Track Name</th>
            <th style="width: 20%;">Sample Type</th>
            <th>Lab</th>
            <th style="width: 15%;">Preview</th>
            <th style="width: 7%;">Data</th>
          </tr>
        </thead>
        <tbody id="spcDbNameEncodeSortedTbodyHolder" style="display: none;">
        </tbody>
        <tbody class="insigTbody" id="spcDbNameEncodeInsigTbodyHolderHeader" style="display: none;">
          <tr>
            <td class="insigHeader" onclick="toggleTbody('spcDbNameEncodeInsigTbody', false);" colspan="5"><span class="headerIndicator" id="spcDbNameEncodeInsigTbodyIndicator">[+]</span> Tracks with insignificant signals for spcCmnName</td>
          </tr>
        </tbody>
        <tbody class="insigTbody" id="spcDbNameEncodeInsigTbodyHolder" style="display: none;">
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
  <!--
  <div id="trackSettings" class="trackSettingsClass" style="display: none;">
    <div id="trackSettingsHeader" class="headerNoHover2">Track information &amp; settings</div>
    <div style="position: absolute; top: 45px; left: 0px;">
      <iframe onload="trackSettingsOnLoad();" id="trackSettingFrame" name="trackSettingFrame" class="trackSettingFrame" src="about:blank">Your browser doesn't support &lt;iframe&gt; tag. You need a browser supporting &lt;iframe&gt; tag to use Comparison Browser. (Latest versions of mainstream browsers should all support this tag.)</iframe>
      <div class="header buttons" style="float: right; width: 150px;" onclick="hidePanel('trackSettings');">Close</div>
      <div style="clear: both"></div>
    </div>
  </div>
  -->
  <div id="leftborder">
    <div id="leftbutton" onclick="switchLeft();"></div>
  </div>
  <div id="mainContent">
    <iframe id="cpbrowser" name="cpbrowser" src="cpbrowser/cpbrowser.php" width="100%" marginwidth="0" height="100%" marginheight="0" scrolling="auto" frameborder="0">Your browser doesn't support &lt;iframe&gt; tag. You need a browser supporting &lt;iframe&gt; tag to use Comparison Browser. (Latest versions of mainstream browsers should all support this tag.)</iframe>
    <!-- end #mainContent --> 
  </div>
  <!-- This clearing element should immediately follow the #mainContent div in order to force the #container div to contain all child floats --> 
  <br class="clearfloat" />
  <!-- end #container -->
  <?php
	if(strpos(getenv('SERVER_NAME'), 'sysbio.igb') !== false) {
		// user came from the old domain
		if(!isset($_COOKIE['NoTipChangeDomain']) || $_COOKIE['NoTipChangeDomain'] != 'true') {
?>
  <script type="text/javascript">
function hideDomainHint() {
	$.post('cpbrowser/postcookie.php', { varName: 'NoTipChangeDomain', value: 'true' } );
	$('#domainChangeHint').fadeOut('fast');
}
setTimeout("$('#domainChangeHint').fadeOut('slow')", 10000);
</script>
  <div id="domainChangeHint" style="z-index: 20; width: 750px; display: block; padding: 5px; font-family: Verdana, Arial, Helvetica, sans-serif;
font-size: 12px; line-height: 17px; background: #FFFFCC; position: absolute; left: 50%; margin-left: -380px; border: #333333 solid 2px; overflow: hidden; height: auto;">
    <table cellpadding="7" cellspacing="0" class="cautionTable" style="margin-left: 0px;">
      <tr>
        <td valign="middle" class="cautionText"><img src="cpbrowser/images/caution.png" alt="Caution" width="40" height="36" /></td>
        <td valign="middle" class="cautionText">CEpBrowser has got a new domain: <strong><a href="http://www.cepbrowser.org" >www.cepbrowser.org</a></strong>. Users are highly encouraged to use this new domain instead of the old one. This will enable better site management and possible future extensions. <br />
          It appears that you are still using CEpBrowser from the old domain, please check if you could visit from the new domain above and bookmark/use the new domain at your convenience. </td>
      </tr>
    </table>
    <div class="header buttons" style="float: right; margin-top: 5px;" onclick="hideDomainHint();">Do not show in the future</div>
    <div style="clear: both"></div>
  </div>
  <?php
		}
	}
?>
</div>
</body>
</html>
