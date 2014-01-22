<?php
require '../includes/session.php';
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
<script language="javascript">
var left_width = 290;
var left_value = 0;
var querySent = "";
var timeoutVar;
var timerOn = 0;
var gListIsOn = 0;
var currentGeneName = "";
var speciesDbName = {};
var speciesCmnName = {};
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

var cmnTracks = new Array();			// this is the array placing the common tracks
var cmnTracksStatus = new Object();			// this is the array placing the common tracks
var cmnTracksTableNames = new Object();	
// this is the "associative array" linking compSeries name to 
// an "associative array" of db/table names sent to download

var uniTracks = new Array();			// this is an array of arrays placing the unique tracks
var uniTracksStatus = new Array();			// this is an array of arrays placing the unique tracks
var uniTracksTableNames = new Array();
var uniTracksDone = new Array();

var cmnTracksEncode = new Array();			// this is the array placing the common tracks
var cmnTracksEncodeStatus = new Object();			// this is the array placing the common tracks
var cmnTracksEncodeTrackTitle = new Object();			
// notice that ENCODE track titles are different from compSeries values
var cmnTracksEncodeTableNames = new Object();	
var cmnTracksEncodeTrackInfo = new Object();	
// this is the "associative array" linking compSeries name to 
// an "associative array" of db/table names sent to download

var uniTracksEncode = new Array();			// this is an array of arrays placing the unique tracks
var uniTracksEncodeStatus = new Array();			// this is an array of arrays placing the unique tracks
var uniTracksEncodeTableNames = new Array();
var uniTracksEncodeTrackTitle = new Array();
var uniTracksEncodeTrackInfo = new Array();	

var cmnTracksSampleType = new Object();		// link sample name to array of tracks
var uniTracksSampleType = new Array();
var cmnTracksStatusBackup = new Object();	// this is to backup the selection states of tracks for sample selection
var uniTracksStatusBackup = new Array();

var tracksInitialized = false;

var listPanels = new Array('trackSettings', 'tableBrowser');

var isInDownload = false;

var isInBrowser = false;
var tracksInitialized = false;

var isEncodeOn = <?php echo ($encodeOn? 'true': 'false'); ?>;			// Switch this to on to make ENCODE data as default, 

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

function validate_form() {
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
	var postdata = {};
//	speciesDbName = new Array();
	$.each($('#searchform').serializeArray(), function(i, field) {
//		if($('#' + field.name).is("checkbox")) {
//			speciesDbName.push(field.name);
//		}
		postdata[field.name] = field.value;
		});
	$.post("cpbrowser/genelist.php<?php echo $in_debug? "?Debug=XCDebug": ""; ?>", postdata, function (data) {
		$("#genelistContentHolder").html(data);
	});
	return false;
}

function checkEncodeSpecies() {
	var spcAvailableCount = 0;
	for(var i = 0; i < spcNum; i++) {
		if(isEncodeOn && !spcEncode[spcDbName[i]]) {
			$('#' + spcDbName[i] + '_checkbox').hide();
			$('#' + spcDbName[i]).attr('checked', false);
		} else {
			$('#' + spcDbName[i] + '_checkbox').show();
			$('#' + spcDbName[i]).attr('checked', true);
			spcAvailableCount++;
		}
	}
	if(spcAvailableCount > 2) {
		$('#speciesTable').show();
	} else {
		$('#speciesTable').hide();
	}
}

function changeGeneName(id, namearray, strand, strandArray) {
	$("#" + id).html($("#" + namearray + document.getElementById(id + 'selection').selectedIndex).val());
	$("#" + strand).val($("#" + strandArray + document.getElementById(id + 'selection').selectedIndex).val());
}

function updateNavigation(formid) {
	// update the navigation part for the comparative browser
	currentGeneName = formid;
	// find everything from the form
	speciesDbName = new Array();
	speciesCmnName = new Array();
	var items = $("#" + currentGeneName.replace(/\./g, "\\.")).serializeArray();		// the name of current gene is the name of a form as well
	var itemLeft = new Array();
	$.each(items, function(i, field) {
			if(field.name == "speciesdb[]") {
				speciesDbName.push(field.value);
			} else if(field.name == "speciescmnname[]") {
				speciesCmnName.push(field.value);
			} else if(field.name == "num_spc") {
				numSpc = field.value;
			} else {
				itemLeft.push(field);
			}
		});
	// Got all the names, now go get all the values;
	var i = 0;
	speciesDbCoor = new Array();
	speciesDbStrand = new Array();
	speciesGeneName = new Array();
	$.each(itemLeft, function(i, field) {
		for(i = 0; i < numSpc; i++) {
			if(field.name == speciesDbName[i]) {
				speciesDbCoor.push(field.value);
				break;
			} else if(field.name == speciesDbName[i] + "strand") {
				speciesDbStrand.push(field.value);
				break;
			}
		}
		});
		
	var naviStr = "";
	
	for(i = 0; i < numSpc; i++) {
		var currentGName = $('#' + currentGeneName.replace(/\./g, "\\.") + speciesDbName[i] + "NameDisp").html();
		if(currentGName.length > 11) {
			currentGName = currentGName.substr(0, 6) + "..." + currentGName.substr(currentGName.length - 4);
		}
		speciesGeneName.push(currentGName);
		var naviStrEach = $('#spcNaviTemplate').html();
		naviStrEach = naviStrEach.replace(/spcGeneName/g, speciesGeneName[i] + " (" + (speciesDbStrand[i] == "1"? "+": "-") + ")").replace(/spcDbName/g, speciesDbName[i]).replace(/spcCNm/g, speciesCmnName[i]).replace(/spcCoor/g, speciesDbCoor[i]);
		naviStr += naviStrEach;
	}
	
	$('#navigationContent').html(naviStr);
	$('#overallGeneName').html(currentGeneName);
	
	numSpcReady = numSpc;
	
	for(i = 0; i < numSpc; i++) {
		setUnReady(speciesDbName[i]);
	}
	$('#masterHolder').removeClass("BoxHide");
	
	isInBrowser = true;
	return true;
}

function showHover(key) {
	var i;
	for(i = 0; i < numSpc; i++) {
		var suffix = key.replace(/L/, (speciesDbStrand[i] == "1"? "left": "right")).replace(/R/, (speciesDbStrand[i] == "1"? "right": "left"));
		//console.log('#' + speciesDbName + suffix);
		$('#' + speciesDbName[i] + suffix).addClass('hoverToolButtonImage');
		//$('#' + speciesDbName[i] + suffix).removeClass('toolButtonImage');
	}
}

function hideHover(key) {
	var i;
	for(i = 0; i < numSpc; i++) {
		var suffix = key.replace(/L/, (speciesDbStrand[i] == "1"? "left": "right")).replace(/R/, (speciesDbStrand[i] == "1"? "right": "left"));
		//$('#' + speciesDbName[i] + suffix).addClass('toolButtonImage');
		$('#' + speciesDbName[i] + suffix).removeClass('hoverToolButtonImage');
	}
}

function showZoomHover(key) {
	var i;
	for(i = 0; i < numSpc; i++) {
		$('#' + speciesDbName[i] + key).addClass('hoverToolButton');
		//$('#' + speciesDbName[i] + key).removeClass('toolButton');
	}
}

function hideZoomHover(key) {
	var i;
	for(i = 0; i < numSpc; i++) {
		//$('#' + speciesDbName[i] + key).addClass('toolButton');
		$('#' + speciesDbName[i] + key).removeClass('hoverToolButton');
	}
}

function setUnReady(db) {
	$('#' + db + 'Loading').removeClass('BoxHide');
	$('#masterLoading').removeClass('BoxHide');
	spcReady[db] = false;
}

function setReady(db, coor) {
	$('#' + db + 'Coor').html(coor);
	$('#' + db + 'Loading').addClass('BoxHide');
	spcReady[db] = true;
	var allSpcReady = true;
	for(i = 0; i < numSpc; i++) {
		if(!spcReady[speciesDbName[i]]) {
			allSpcReady = false;
		}
	}
	if(allSpcReady) {
		$('#masterLoading').addClass('BoxHide');
	}
}

function setCommonTrackSample(trackID, sample) {
	sample = sample.replace(/(<([^>]+)>)/ig,"");
	if(typeof(cmnTracksSampleType[sample]) == 'undefined') {
		// not define in this sample yet
		cmnTracksSampleType[sample] = new Array();
	}
	cmnTracksSampleType[sample].push(trackID);
}

function setUniqueTrackSample(index, trackID, sample) {
	sample = sample.replace(/(<([^>]+)>)/ig,"");
	if(typeof(uniTracksSampleType[index][sample]) == 'undefined') {
		// not define in this sample yet
		uniTracksSampleType[index][sample] = new Array();
	}
	uniTracksSampleType[index][sample].push(trackID);
}

function setTrackReady(index) {
	//spcReady[i] = true;
	var db = spcDbName[index];
	var conDoc = (document.getElementById(db + "_controls").contentWindow 
		|| document.getElementById(db + "_controls").contentDocument);
	if(conDoc.document) {
		conDoc = conDoc.document;
	}
	if(!tracksInitialized) {		
		// tracks have not been initialized so fill the unique ones
		// after filling this one, check whether all tracks initialized 
		// if so, initialize the settings panel
		
		var uniTracksNew = false;
		if(!uniTracks[index]) {
			// this species has not been defined yet
			
			uniTracksNew = true;
			uniTracks[index] = new Array();
			uniTracksStatus[index] = new Array();
			uniTracksTableNames[index] = new Array();
			
			uniTracksEncode[index] = new Array();
			uniTracksEncodeTrackTitle[index] = new Object();
			uniTracksEncodeStatus[index] = new Array();
			uniTracksEncodeTableNames[index] = new Array();
			uniTracksEncodeTrackInfo[index] = new Object();
			
			uniTracksSampleType[index] = new Object();
			
		}
		
		var hiddenCommons = conDoc.getElementById("TrackControls").getElementsByTagName("input");
		// get all the hidden inputs in the browser "common" part
		
		for(var i = 0; i < hiddenCommons.length; i++) {
			
			if(typeof cmnTracksTableNames[hiddenCommons[i].id] == 'undefined') {
				cmnTracks.push(hiddenCommons[i].id);
				//cmnTracksStatus.push(hiddenCommons[i].value == "dense");
				cmnTracksTableNames[hiddenCommons[i].id] = new Object();
				for(var j = 0; j < spcNum; j++) {
					cmnTracksTableNames[hiddenCommons[i].id][spcDbName[j]] = "";
				}
			}
			cmnTracksStatus[hiddenCommons[i].id] = (hiddenCommons[i].value == "dense");
			cmnTracksTableNames[hiddenCommons[i].id][db] = hiddenCommons[i].name;
			// this happens even there is already entry in cmnTracksTableNames
			// Notice that this hiddenCommons[i].name is not Short Label
		}
		
		hiddenCommons = conDoc.getElementById("TrackControlsEncode").getElementsByTagName("input");
		var hiddenCommonsEncodeData = conDoc.getElementById("TrackControlsEncode").getElementsByTagName("span")
		// get all the hidden inputs in the browser "common" part
		
		for(var i = 0; i < hiddenCommons.length; i++) {
			
			if(typeof cmnTracksEncodeTableNames[hiddenCommons[i].id] == 'undefined') {
				cmnTracksEncode.push(hiddenCommons[i].id);
				//cmnTracksStatus.push(hiddenCommons[i].value == "dense");
				cmnTracksEncodeTableNames[hiddenCommons[i].id] = new Object();
				for(var j = 0; j < spcNum; j++) {
					if(isEncodeOn && !spcEncode[spcDbName[j]]) {
						continue;
					}
					cmnTracksEncodeTableNames[hiddenCommons[i].id][spcDbName[j]] = "";
				}
				cmnTracksEncodeTrackTitle[hiddenCommons[i].id] = 
					hiddenCommonsEncodeData[hiddenCommons[i].id + "_title"].innerHTML;
				setCommonTrackSample(hiddenCommons[i].id,
					hiddenCommonsEncodeData[hiddenCommons[i].id + "_data"].innerHTML);
				cmnTracksEncodeTrackInfo[hiddenCommons[i].id] = 
					hiddenCommonsEncodeData[hiddenCommons[i].id + "_data"].innerHTML.replace(/\t/g, "</td>\n<td>");
					// this is the annotation information of encode tracks (sample type in common tracks)
				cmnTracksEncodeTrackInfo[hiddenCommons[i].id] = "<td>" 
					+ cmnTracksEncodeTrackInfo[hiddenCommons[i].id] + "</td>";
			}
			cmnTracksEncodeStatus[hiddenCommons[i].id] = (hiddenCommons[i].value == "dense");
			cmnTracksEncodeTableNames[hiddenCommons[i].id][db] = hiddenCommons[i].name;
			//console.log(hiddenCommons[i].id + "|" + db + "|" + hiddenCommons[i].name);
			
			// this happens even there is already entry in cmnTracksTableNames
			// Notice that this hiddenCommons[i].name is not Short Label
		}
		
		var hiddenUniques;
		if(conDoc.getElementById("TrackUnique") !== null && conDoc.getElementById("TrackUnique") !== undefined) {
			hiddenUniques = conDoc.getElementById("TrackUnique").getElementsByTagName("input");
			// get all the hidden inputs in the browser "common" part
			
			for(var i = 0; i < hiddenUniques.length; i++) {
				if(uniTracksNew) {
					uniTracks[index].push(hiddenUniques[i].id);
					uniTracksStatus[index].push(hiddenUniques[i].value == "dense");
					uniTracksTableNames[index].push(db + "__" + hiddenUniques[i].name);
				} else {
					uniTracksStatus[index][i] = (hiddenUniques[i].value == "dense");
				}
			}
		}
		
		if(conDoc.getElementById("TrackUniqueEncode") !== null && conDoc.getElementById("TrackUniqueEncode") !== undefined) {
			hiddenUniques = conDoc.getElementById("TrackUniqueEncode").getElementsByTagName("input");
			var hiddenUniquesEncodeData = conDoc.getElementById("TrackUniqueEncode").getElementsByTagName("span")
			// get all the hidden inputs in the browser "common" part
			
			for(var i = 0; i < hiddenUniques.length; i++) {
				if(uniTracksNew) {
					uniTracksEncode[index].push(hiddenUniques[i].id);
					uniTracksEncodeStatus[index].push(hiddenUniques[i].value == "dense");
					uniTracksEncodeTableNames[index].push(db + "__" + hiddenUniques[i].name);
					uniTracksEncodeTrackTitle[index][hiddenUniques[i].id] = 
						hiddenUniquesEncodeData[hiddenUniques[i].id + "_title"].innerHTML;
					setUniqueTrackSample(index, hiddenUniques[i].id,
						hiddenUniquesEncodeData[hiddenUniques[i].id + "_data"].innerHTML.split('\t')[0]);
					uniTracksEncodeTrackInfo[index][hiddenUniques[i].id] = 
						hiddenUniquesEncodeData[hiddenUniques[i].id + "_data"].innerHTML.replace(/\t/g, "</td>\n<td>");
						// this is the annotation information of encode tracks (sample type in common tracks)
					uniTracksEncodeTrackInfo[index][hiddenUniques[i].id] = "<td>" 
						+ uniTracksEncodeTrackInfo[index][hiddenUniques[i].id] + "</td>";
				} else {
					uniTracksEncodeStatus[index][i] = (hiddenUniques[i].value == "dense");
				}
			}
		}
		
		uniTracksDone[index] = true;
		
		// check whether all tracks initialized
		var allDone = true;
		for(var i = 0; i < uniTracks.length; i++) {
			//if((!isEncodeOn || spcEncode[spcDbName[i]]) && !uniTracksDone[i]) {
			if(!uniTracksDone[i]) {
				allDone = false;
			}
		}
		
		if(allDone) {
			// all tracks initialized
			// do panel initialization
			// first common panels
			$('#cmnTrackHolder').html('');
			$('#uniqueHolder').html('');
			var items = [];
			items.push('<table width="100%"><tr>');
			for(var i = 0; i < cmnTracks.length; i++) {
				items.push('<td class="trackCell"><label>\n<input id="' + cmnTracks[i] 
					+ '" type="checkbox" value="dense" '
					+ (cmnTracksStatus[cmnTracks[i]]? 'checked ': '') + '/>' 
					+ cmnTracks[i].replace(/Series/g, '') + '</label>\n'
					+ '<div style="float:right; margin: 2px;" id="'
					+ cmnTracks[i].replace(/Series/g, '').replace(/\s/g, '') 
					+ '_cmndlbtn"><a href="#" onclick="return callDownloadMenu(\''
					+ cmnTracks[i] + '\', true, \''
					+ cmnTracks[i].replace(/Series/g, '').replace(/\s/g, '') 
					+ '_cmndlbtn\');">\n'
					+ '<img src="cpbrowser/images/download.png" alt="Download data for '
					+ cmnTracks[i].replace(/Series/g, '')
					+ '" width="15" height="15" /></a></div>\n'
					+ '</td>\n');
				if((i % 2) && i < cmnTracks.length) {
					items.push('</tr>\n<tr>');
				}
			}
			items.push('</tr></table>\n');
			$('#cmnTrackHolder').append(items.join(''));
			
			for(var i = 0; i < uniTracks.length; i++) {
				var uniqTemp = $('#uniqueTemplate').html();
				uniqTemp = uniqTemp.replace(/spcDbName/g, spcDbName[i]).replace(/spcCmnName/g, spcCmnName[spcDbName[i]]);
				$('#uniqueHolder').append(uniqTemp);
				
				var uniqueHolderId = '#' + spcDbName[i] + 'Holder';
				
				if(uniTracks[i].length > 0) {
					items = [];
					items.push('<table width="100%"><tr>')
					for(var j = 0; j < uniTracks[i].length; j++) {
						items.push('<td class="trackCell"><label>\n<input id="'
							+ uniTracks[i][j] + '" type="checkbox" value="dense" '
							+ (uniTracksStatus[i][j]? 'checked ': '') + '/>'
							+ uniTracks[i][j] + '</label>\n'
							+ '<div style="float:right; margin: 2px;" id="'
							+ uniTracks[i][j].replace(/\s/g, '') + '_' + spcDbName[i]
							+ 'dlbtn"><a href="#" onclick="return callDownloadMenu(\''
							+ uniTracksTableNames[i][j] + '\', false, \''
							+ uniTracks[i][j].replace(/\s/g, '') + '_' + spcDbName[i]
							+ 'dlbtn\');">\n'
							+ '<img src="cpbrowser/images/download.png" alt="Download data for '
							+ uniTracks[i][j] + ' ' + spcCmnName[spcDbName[i]]
							+ '" width="15" height="15" /></a></div>\n'
							+ '</td>\n');
						if((j % 2) && j < uniTracks[i].length) {
							items.push('</tr>\n<tr>')
						}
					}
					items.push('</tr></table>\n');
					$(uniqueHolderId).append(items.join(''));
				} else {
					$(uniqueHolderId).append('<span class="settingsNormal"><em>(No unique tracks)</em></span>');
				}
			}
			
			$('#cmnTrackEncodeHolder').html('');
			$('#uniqueEncodeHolder').html('');
			
			// this is for common track ENCODE part
			items = [];
			items.push('<table width="100%" style="border-collapse: collapse; border-spacing: 0;"><tr class="trackHeaderEncode">');
			items.push('<th style="width: 35%;">Track Name</th><th>Sample Type</th>'
				+ '<th style="width: 7%;">Data</th></tr>\n<tr class="trackCell">');
			for(var i = 0; i < cmnTracksEncode.length; i++) {
				items.push('<td><label>\n<input id="' + cmnTracksEncode[i] 
					+ '" type="checkbox" value="dense" '
					+ (cmnTracksEncodeStatus[cmnTracksEncode[i]]? 'checked ': '') + '/>' 
					+ cmnTracksEncodeTrackTitle[cmnTracksEncode[i]] + '</label>\n'
					+ '</td>\n');
				items.push(cmnTracksEncodeTrackInfo[cmnTracksEncode[i]] + '\n');
				items.push('<td><div style="margin: 2px;" id="'
					+ cmnTracksEncode[i].replace(/Series/g, '').replace(/[\s\(\)]/g, '') 
					+ '_cmnedlbtn"><a href="#" onclick="return callDownloadMenu(\''
					+ cmnTracksEncode[i] + '\', true, \''
					+ cmnTracksEncode[i].replace(/Series/g, '').replace(/[\s\(\)]/g, '') 
					+ '_cmnedlbtn\', true);">\n'
					+ '<img src="cpbrowser/images/download.png" alt="Download data for '
					+ cmnTracksEncodeTrackTitle[cmnTracksEncode[i]]
					+ '" width="15" height="15" /></a></div></td>\n');
				if(i < cmnTracksEncode.length) {
					items.push('</tr>\n<tr class="trackCell">');
				}
			}
			items.push('</tr></table>\n');
			$('#cmnTrackEncodeHolder').append(items.join(''));
			
			for(var i = 0; i < uniTracksEncode.length; i++) {
				if(isEncodeOn && !spcEncode[spcDbName[i]]) {
					continue;
				}
				var uniqTemp = $('#uniqueEncodeTemplate').html();
				uniqTemp = uniqTemp.replace(/spcDbName/g, spcDbName[i]).replace(/spcCmnName/g, spcCmnName[spcDbName[i]]);
				$('#uniqueEncodeHolder').append(uniqTemp);
				
				var uniqueHolderId = '#' + spcDbName[i] + 'EncodeHolder';
				
				if(uniTracksEncode[i].length > 0) {
					items = [];
					items.push('<table width="100%" style="border-collapse: collapse; border-spacing: 0;">'
						+ '<tr class="trackHeaderEncode">')
					items.push('<th style="width: 30%;">Track Name</th>'
						+ '<th style="width: 30%;">Sample Type</th>'
						+ '<th>Lab</th>'
						+ '<th style="width: 7%;">Data</th></tr>\n<tr class="trackCell">');
					for(var j = 0; j < uniTracksEncode[i].length; j++) {
						items.push('<td><label>\n<input id="'
							+ uniTracksEncode[i][j] + '" type="checkbox" value="dense" '
							+ (uniTracksEncodeStatus[i][j]? 'checked ': '') + '/>'
							+ uniTracksEncodeTrackTitle[i][uniTracksEncode[i][j]] + '</label>\n'
							+ '</td>\n');
						items.push(uniTracksEncodeTrackInfo[i][uniTracksEncode[i][j]] + '\n');
						items.push('<td><div style="margin: 2px;" id="'
							+ uniTracksEncode[i][j].replace(/[\s\(\)]/g, '') + '_' + spcDbName[i]
							+ 'edlbtn"><a href="#" onclick="return callDownloadMenu(\''
							+ uniTracksEncodeTableNames[i][j] + '\', false, \''
							+ uniTracksEncode[i][j].replace(/[\s\(\)]/g, '') + '_' + spcDbName[i]
							+ 'edlbtn\');">\n'
							+ '<img src="cpbrowser/images/download.png" alt="Download data for '
							+ uniTracksEncode[i][j] + ' ' + spcCmnName[spcDbName[i]]
							+ '" width="15" height="15" /></a></div></td>\n');
						if(j < uniTracksEncode[i].length) {
							items.push('</tr>\n<tr class="trackCell">')
						}
					}
					items.push('</tr></table>\n');
					$(uniqueHolderId).append(items.join(''));
				} else {
					$(uniqueHolderId).append('<span class="settingsNormal"><em>(No unique tracks)</em></span>');
				}
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
			
			markTrackInitialized(true);
		}
	}
	if(isInBrowser) {
		callViewChange(db, "refresh");
	}
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

function updateSampleCheckbox() {
	for(var sample in cmnTracksSampleType) {
		if(cmnTracksSampleType.hasOwnProperty(sample)) {
			var sampleState = document.getElementById(cmnTracksSampleType[sample][0]).checked;
			var mixed = false;
			for(var i = 1; i < cmnTracksSampleType[sample].length; i++) {
				if(document.getElementById(cmnTracksSampleType[sample][i]).checked != sampleState) {
					// it's mixed
					mixed = true;
					break;
				}
			}
			if(mixed) {
				$('#' + sample + '_checkbox').attr('checked', true);
				$('#' + sample + '_checkbox').prop('indeterminate', true);
			} else {
				$('#' + sample + '_checkbox').prop('indeterminate', false);
				$('#' + sample + '_checkbox').attr('checked', sampleState);
			}
		}
	}
	for(var s = 0; s < uniTracksSampleType.length; s++) {
		if(isEncodeOn && !spcEncode[spcDbName[s]]) {
			continue;
		}
		for(var sample in uniTracksSampleType[s]) {
			if(uniTracksSampleType[s].hasOwnProperty(sample)) {
				var sampleState = document.getElementById(uniTracksSampleType[s][sample][0]).checked;
				var mixed = false;
				for(var i = 1; i < uniTracksSampleType[s][sample].length; i++) {
					if(document.getElementById(uniTracksSampleType[s][sample][i]).checked != sampleState) {
						// it's mixed
						mixed = true;
						break;
					}
				}
				if(mixed) {
					$('#' + spcDbName[s] + sample + '_checkbox').attr('checked', true);
					$('#' + spcDbName[s] + sample + '_checkbox').prop('indeterminate', true);
				} else {
					$('#' + spcDbName[s] + sample + '_checkbox').prop('indeterminate', false);
					$('#' + spcDbName[s] + sample + '_checkbox').attr('checked', sampleState);
				}
			}
		}
	}
}

function callViewChange(db, change) {
	setUnReady(db);
	document.getElementById('cpbrowser').contentWindow.callViewChange(db, change);
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

function callMasterViewChange(change, isZoom) {
	if(isZoom) {
		// is simple zoom, no need to convert strand
		var i;
		for(i = 0; i < numSpc; i++) {
			callViewChange(speciesDbName[i], change);
		}
	} else {
		var i;
		for(i = 0; i < numSpc; i++) {
			if(speciesDbStrand[i] == "1") {
				callViewChange(speciesDbName[i], change);
			} else {
				callViewChange(speciesDbName[i], ((change.search("left") >= 0)? change.replace(/left/, "right"): change.replace(/right/, "left")));
			}
		}
	}
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
			sendData = cmnTracksTableNames[cmnName];
		} else {
			sendData = cmnTracksEncodeTableNames[cmnName];
		}
		$.getJSON('cpbrowser/getdownload.php', sendData,
			function(data) {
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
						items.push("<div class='speciesTrackHeader'>" + spcCmnName[db] + "</div>");
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
		var uniIDNames = cmnName.split("__");
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


function updateTracks() {
	// First do Encode controls
	var cmnControls = document.getElementById('cmnTrackEncodeHolder').getElementsByTagName('input');
	
	for(var index = 0; index < spcDbName.length; index++) {
		var db = spcDbName[index];
		if(!spcEncode[db]) continue;
		var conDoc = (document.getElementById(db + "_controls").contentWindow || document.getElementById(db + "_controls").contentDocument);
		if(conDoc.document) {
			conDoc = conDoc.document;
		}
		
		for(var i = 0; i < cmnControls.length; i++) {
			var target = conDoc.getElementById(cmnControls[i].id);
			if(target) {
				target.value = (cmnControls[i].checked? 'dense': 'hide');
			} else {
				console.log(cmnControls[i].id + " is not found in " + db + "!");
			}
		}
		
		var uniControls = document.getElementById(db + 'EncodeHolder').getElementsByTagName('input');
		for(var i = 0; i < uniControls.length; i++) {
			var target = conDoc.getElementById(uniControls[i].id);
			if(target) {
				target.value = (uniControls[i].checked? 'dense': 'hide');
			} else {
				console.log(uniControls[i].id + " is not found in " + db + "!");
			}
		}
		
		//conDoc.getElementById('TrackForm').submit();
		//setUnReady(db);
		//uniTracksDone[index] = false;
	}
	
	cmnControls = document.getElementById('cmnTrackHolder').getElementsByTagName('input');
	for(var index = 0; index < spcDbName.length; index++) {
		var db = spcDbName[index];
		var conDoc = (document.getElementById(db + "_controls").contentWindow || document.getElementById(db + "_controls").contentDocument);
		if(conDoc.document) {
			conDoc = conDoc.document;
		}
		
		for(var i = 0; i < cmnControls.length; i++) {
			var target = conDoc.getElementById(cmnControls[i].id);
			if(target) {
				target.value = (cmnControls[i].checked? 'dense': 'hide');
			} else {
				console.log(cmnControls[i].id + " is not found in " + db + "!");
			}
		}
		
		var uniControls = document.getElementById(db + 'Holder').getElementsByTagName('input');
		for(var i = 0; i < uniControls.length; i++) {
			var target = conDoc.getElementById(uniControls[i].id);
			if(target) {
				target.value = (uniControls[i].checked? 'dense': 'hide');
			} else {
				console.log(uniControls[i].id + " is not found in " + db + "!");
			}
		}
		
		conDoc.getElementById('TrackForm').submit();
		setUnReady(db);
		uniTracksDone[index] = false;
	}
	
	markTrackInitialized(false);
	toggleWindow('trackSelect');
}

function resetTracks() {
	for(var index = 0; index < spcDbName.length; index++) {
		var db = spcDbName[index];
		var conDoc = (document.getElementById(db + "_controls").contentWindow || document.getElementById(db + "_controls").contentDocument);
		if(conDoc.document) {
				conDoc = conDoc.document;
		}
		var conForm = conDoc.getElementById('TrackForm');
		var resetVar = conDoc.createElement("input");
		resetVar.type = "hidden";
		resetVar.name = "hgt.reset";
		resetVar.value = "TRUE";
		conForm.appendChild(resetVar);
		var resetOrder = conDoc.createElement("input");
		resetOrder.type = "hidden";
		resetOrder.name = "hgt.defaultImgOrder";
		resetOrder.value = "TRUE";
		conForm.appendChild(resetOrder);
		conForm.submit();
		setUnReady(db);
		uniTracksDone[index] = false;
	}
	markTrackInitialized(false);
	toggleWindow('trackSelect');

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
	} else {
		$('#EncodeData').addClass('BoxHide');
		$('#NonEncodeData').removeClass('BoxHide');
		$('#trackSelect').width(380);
		//$('#EncodeDataButton').html('View ENCODE Data');
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
	$('#EncodeData').css('max-height', ($(window).height() - 114) + 'px'); 
}

$(document).ready( function () {
	document.getElementById('sidebar1').style.left = left_value + "px";
	document.getElementById('leftborder').style.left = left_value + left_width + "px";
	document.getElementById('mainContent').style.left = left_value + left_width + 5 + "px";
	attachTextListener(document.getElementById('geneName'), textChanged);
	resize_tbody();
	isEncodeOn = !isEncodeOn;
	toggleEncode();
});
</script>
<script type="text/javascript">

  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-3695776-4']);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();

</script>
<?php
	require("../includes/db/opendbcpb.php");
?>
</head>
<body class="twoColLiqLt" onresize="resize_tbody();">
<div id="container">
  <div id="sidebar1">
    <div id="logoholder"> <a href="index.php" target="_self"><img src="cpbrowser/images/Logo.gif" alt="Comparative Genome Browser Logo" border="0" /></a> </div>
    <div class="header" id="selectHeader" onclick="togglePanel('selection', false);"> <span class="tableHeader"><span class="headerIndicator" id="selectionIndicator">[-]</span> Gene / Region Query</span></div>
    <div id="selectionHolder">
      <form name="searchform" class="formstyle" id="searchform" onsubmit="return validate_form();">
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
            <td style="border: 1px solid #666666;"><script type="text/javascript">
		spcNum = <?php echo $num_spc; ?>;
	</script>
              <?php
	for($i = 0; $i < $num_spc; $i++) {
		
?>
              <script type="text/javascript">
				spcDbName.push("<?php echo $spcinfo[$i]["dbname"]; ?>");
				spcCmnName["<?php echo $spcinfo[$i]["dbname"]; ?>"] = "<?php echo $spcinfo[$i]["commonname"]; ?>";
				spcName["<?php echo $spcinfo[$i]["dbname"]; ?>"] = "<?php echo $spcinfo[$i]["name"]; ?>";
				uniTracks.push(false);
				uniTracksDone.push(false);
				spcReady["<?php echo $spcinfo[$i]["dbname"]; ?>"] = false;
				spcEncode["<?php echo $spcinfo[$i]["dbname"]; ?>"] = <?php echo ($spcinfo[$i]["encode"]? "true": "false"); ?>;
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
	require("../includes/db/closedb.php");
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
      <div id="genelistContentHolder"> </div>
      <!-- end #genelist -->
      <div id="genelistfooter"> <span class="smallformstyle">(*): there is no orthologous region in that section.</span> </div>
    </div>
    <div class="header" id="navigationHeader" onclick="togglePanel('navigation', false);"> <span class="tableHeader"><span class="headerIndicator" id="navigationIndicator">[-]</span> Navigation</span></div>
    <div class="smallformstyle" id="navigationHolder">
      <div style="border: 1px #000000 solid;" id="masterHolder" class="BoxHide">
        <div id="masterLoading" class="loadingCover" style="height: 36px;">
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
    <div id="spcDbNameLoading" class="loadingCover" style="height: 50px;">
      <div class="loadingCoverBG"></div>
      <div class="loadingCoverImage"></div>
    </div>
    <table width="100%" border="0" align="center" cellpadding="0" cellspacing="0" style="table-layout: fixed; height: 50px;">
      <tr>
        <td rowspan="3" scope="col" class="speciesLead"><span>spcCNm</span></td>
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
        <div class="trackHolder" id="cmnTrackEncodeHolder"></div>
      </div>
      <div class="subBox ENCODETracks">
        <div class="subHeader" onclick="toggleSubPanel('uniqueEncode', false);"> <span class="headerIndicator" id="uniqueEncodeIndicator">[-]</span> Unique tracks from ENCODE</div>
        <div id="uniqueEncodeHolder"></div>
      </div>
    </div>
    <div class="header buttons" style="float: right;" onclick="updateTracks();">Update</div>
    <div class="header buttons" style="float: right;" onclick="resetTracks();">Reset view</div>
    <div class="header buttons" style="float: right;" onclick="toggleWindow('trackSelect');">Close</div>
    <div style="clear: both"></div>
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
function Track() {
	$.post('cpbrowser/postcookie.php', { varName: 'NoTipTrackSettings', value: 'true' } );
	$('#trackSelectHint').fadeOut('fast');
}
setTimeout("$('#trackSelectHint').fadeOut('fast')", 7500);
</script>
  <div id="trackSelectHint" style="z-index: 20; width: 250px; display: block; padding: 5px; font-family: Verdana, Arial, Helvetica, sans-serif;
font-size: 12px; line-height: 17px; background: #FFFFCC;" class="trackSelectClass"> Hint: tracks can be turned on / off via the <span class="panel">track selection</span> panel, click button on the left to show.
    <div class="header buttons" style="float: right; margin-top: 5px;" onclick="Track();">Do not show in the future</div>
    <div style="clear: both"></div>
  </div>
  <?php
		}
?>
  <div style="display: none;" id="uniqueTemplate">
    <div class="speciesTrackHeader">spcCmnName</div>
    <div class="trackHolder" id="spcDbNameHolder"></div>
  </div>
  <div style="display: none;" id="uniqueEncodeTemplate">
    <div class="speciesTrackHeader">spcCmnName</div>
    <div class="trackHolder" id="spcDbNameEncodeHolder"></div>
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
function Domain() {
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
    <div class="header buttons" style="float: right; margin-top: 5px;" onclick="Domain();">Do not show in the future</div>
    <div style="clear: both"></div>
  </div>
  <?php
		}
	}
?>
</div>
</body>
</html>
