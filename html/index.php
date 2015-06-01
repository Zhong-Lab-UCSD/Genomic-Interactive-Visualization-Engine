<?php
	require_once (realpath(dirname(__FILE__) . '/../includes/common_func.php'));	
	require_once (realpath(dirname(__FILE__) . "/../includes/session.php"));
	
	if(strpos(getenv('SERVER_NAME'), 'singlecell') !== false) {
		// is single cell, redirect to singlecell.php
		header("HTTP/1.1 301 Moved Permanently"); 
		header("Location: ./singlecell.php"); 
		exit();
	}
	
	$res = initialize_session();
	$encodeOn = $res['encodeOn'];
	$in_debug = $res['in_debug'];
	$genemoOn = $res['genemoOn'];
	unset($res);
	
	$isResuming = false;
	if(isset($_REQUEST['sessionID'])) {
		// this is to recover an old session
		// went to database to make sure this is a correct sessionID
		$mysqli = connectCPB();
		$stmt = $mysqli->prepare("SELECT * FROM `userInput` WHERE `id` = ?");
		$sessionID = trim($_REQUEST['sessionID']);
		$stmt->bind_param('s', $sessionID);
		$stmt->execute();
		$sessionresult = $stmt->get_result();
		if($sessionresult->num_rows > 0) {
			$sessionInfo = $sessionresult->fetch_assoc();
			$sessionresult->free();
			$isResuming = true;
		} else {
			$sessionError = "Invalid address or address expired.";
		}
		$stmt->close();
		$mysqli->close();
	}
?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="keywords" content="Comparative study,Epigenomics,Epigenetics,Visualization,Epigenome browser" />
<meta name="description" content="CEpBrowser (Comparative Epigenome Browser) is a gene-centric genome browser that visualize the genomic features of multiple species with color-coded orthologous regions, aiding users in comparative genomic research. The genome browser is adapted from UCSC Genome Browser and the orthologous regions are generated from cross-species lift-over pairs." />
<title>GENEMO Search</title>
<script src="cpbrowser/components/bower_components/webcomponentsjs/webcomponents.min.js"></script>
<link href="cpbrowser/mainstyles.css" rel="stylesheet" type="text/css" />
<link rel="import" href="cpbrowser/components/bower_components/polymer/polymer.html">
<link rel="import" href="cpbrowser/components/bower_components/core-tooltip/core-tooltip.html">
<link rel="import" href="cpbrowser/components/bower_components/core-animated-pages/core-animated-pages.html">
<link rel="import" href="cpbrowser/components/bower_components/core-animated-pages/transitions/slide-from-right.html">
<link rel="import" href="cpbrowser/components/bower_components/core-icons/core-icons.html">
<link rel="import" href="cpbrowser/components/bower_components/core-menu/core-menu.html">
<link rel="import" href="cpbrowser/components/bower_components/core-item/core-item.html">
<link rel="import" href="cpbrowser/components/bower_components/paper-input/paper-input.html">
<link rel="import" href="cpbrowser/components/bower_components/paper-item/paper-item.html">
<link rel="import" href="cpbrowser/components/bower_components/paper-dropdown-menu/paper-dropdown-menu.html">
<link rel="import" href="cpbrowser/components/bower_components/paper-dropdown/paper-dropdown.html">
<link rel="import" href="cpbrowser/components/bower_components/paper-button/paper-button.html">
<link rel="import" href="cpbrowser/components/bower_components/paper-tabs/paper-tabs.html">
<link rel="import" href="cpbrowser/components/bower_components/paper-checkbox/paper-checkbox.html">
<link rel="import" href="cpbrowser/components/bower_components/paper-radio-group/paper-radio-group.html">
<link rel="import" href="cpbrowser/components/bower_components/paper-radio-button/paper-radio-button.html">
<link href='http://fonts.googleapis.com/css?family=Roboto:500,400italic,700italic,700,400' rel='stylesheet' type='text/css'>
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
<script type="text/javascript" src="cpbrowser/js/uicomponent.js"></script>
<script type="text/javascript" src="cpbrowser/js/generegion.js"></script>
<script type="text/javascript" src="cpbrowser/js/regionlistui.js"></script>
<script type="text/javascript" src="cpbrowser/js/sessionControl.js"></script>
<script type="text/javascript" src="cpbrowser/js/navui.js"></script>
<script type="text/javascript" src="cpbrowser/js/uploadui.js"></script>
<script type="text/javascript" src="cpbrowser/js/libtracks.js"></script>
<script type="text/javascript">

var UI = new UIObject(window);


var spcArray = new Array();		// this will be the array of species (Species Object)
spcArray.map = new Object();
spcArray.activeNumber = 0;

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
spcArray.push(new Species("<?php echo $spcinfo[$i]["dbname"]; ?>", 
	"<?php echo $spcinfo[$i]["name"]; ?>", "<?php echo $spcinfo[$i]["commonname"]; ?>",
	<?php echo ($spcinfo[$i]["encode"]? "true": "false"); ?>));
spcArray.map["<?php echo $spcinfo[$i]["dbname"]; ?>"] = <?php echo $i; ?>;
                    <?php
	}
	$species->free();
	$mysqli->close();
		?>

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

var listPanels = new Array('trackSettings', 'tableBrowser');

var isInDownload = false;

var isInBrowser = false;
var tracksInitialized = false;

var isEncodeOn = <?php echo ($encodeOn? 'true': 'false'); ?>;			// Switch this to on to make ENCODE data as default, 
var cpbrowserURL = 'cpbrowser/cpbrowser.php<?php echo ($encodeOn? '?Encode=XCEncode': ''); ?>';

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
	if(hideothers && $('#' + panel + 'Holder').css('display') == 'none') {
		if($('#navigationHolder').css('display') != 'none') {
			$('#navigationHolder').slideToggle('fast', toggleHeaderText('navigationIndicator'));
		}
		if($('#genelistHolder').css('display') != 'none') {
			$('#genelistHolder').slideToggle('fast', toggleHeaderText('genelistIndicator'));
		}
//		if($('#selectionHolder').css('display') != 'none') {
//			$('#selectionHolder').slideToggle('fast', toggleHeaderText('selectionIndicator'));
//		}
		if($('#trackManipHolder').css('display') != 'none') {
			$('#trackManipHolder').slideToggle('fast', toggleHeaderText('trackManipIndicator'));
		}
	}
	$('#' + panel + 'Holder').slideToggle('fast', toggleHeaderText(panel + 'Indicator'));
}

function textFocused() {
	inFocus = true;
}

//function setText(text) {
//	querySent = text;
//	document.getElementById("geneName").value = text;
//}

function validate_form_genequery(postdata) {
	$("#genelistContentHolder").html('');
	$('#genelistLoading').removeClass('BoxHide');
	trackUpdatedCallback.data = event;
	trackUpdatedCallback.func = function(eventData) {
		$.post("cpbrowser/genelist.php<?php echo $in_debug? "?Debug=XCDebug": ""; ?>", postdata, regionUiHandler);
	};
	updateTracks(false);
	return false;
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

function toggleWindowButtonText(textstem, action) {
	toggleWindowButton(textstem, action);
}

function toggleWindowButton(buttonid, action) {
	if(action == 'hide') {
		document.querySelector('#' + buttonid).trackSelActive = false;
	} else if(action == 'show') {
		document.querySelector('#' + buttonid).trackSelActive = true;
	} else {
		document.querySelector('#' + buttonid).trackSelActive = !document.querySelector('#' + buttonid).trackSelActive;
	}
}

function toggleWindowHeaderText(header, action) {
	action = action || 'toggle';
	if($('#' + header).text() == '≪' || action == 'hide') {
		$('#' + header).text('≫');
	} else {
		$('#' + header).text('≪');
	}
}

function hideWindow(panel) {
	$('#' + panel).fadeOut('fast', toggleWindowButtonText(panel, 'hide'));
	hideSample();
	hideDownload();
}

function showWindow(panel) {
	indexToNav();
	$('#' + panel).fadeIn('fast', toggleWindowButtonText(panel, 'show'));
}

function toggleWindow(panel, queryCardsId) {
	/*for(var i = 0; i < listPanels.length; i++) {
		if(listPanels[i] == panel) {
			continue;
		}
		hidePanel(listPanels[i]);
	}*/
	indexToNav();
	$('#' + panel).fadeToggle('fast', toggleWindowButtonText(queryCardsId));
	hideDownload();
	hideSample();
}

function trackSettingsOnLoad() {
	if(document.getElementById('trackSettingFrame').contentWindow.location.href != "about:blank" && !$('#trackSettings').is(":visible")) {
		togglePanel('trackSettings');
	}
}

function markTrackInitialized(flag) {
	tracksInitialized = tracksInitialized || flag;
	if(flag) {
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
	} else {
		$('#EncodeData').addClass('BoxHide');
		$('#NonEncodeData').removeClass('BoxHide');
		$('#trackSelect').width(380);
		//$('#EncodeDataButton').html('View ENCODE Data');
		$('#encodeSampleSettings').hide();
	}
	document.querySelector('#mainQueryCard').checkEncodeSpecies();	
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

spcArray.updateAllSpcActiveNum = function () {
	this.activeNumber = 0;
	for(var i = 0; i < this.length; i++) {
		if(this[i].isActive) {
			this.activeNumber++;
		}
	}
}


$(document).ready( function () {

	<?php echo $genemoOn? "": "UI.initNavSidebar();"; ?>
	resize_tbody();
	
	
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
	
<?php
	// this is loading part
	if($isResuming) {
?>
	var sessionObj = new Object();
	sessionObj.id = '<?php echo $sessionInfo['id']; ?>';
	sessionObj.db = '<?php echo $sessionInfo['db']; ?>';
	sessionObj.list = '<?php echo $sessionInfo['selected_tracks']; ?>';
	sessionObj.urlToShow = '<?php echo $sessionInfo['display_file_url']; ?>';
	sessionObj.originalFile = '<?php echo ($sessionInfo['original_file_name']? $sessionInfo['original_file_name']: basename($sessionInfo['display_file_url'])); ?>';
	
	for(var i = 0; i < spcArray.length; i++) {
		spcArray[i].isActive = (spcArray[i].db == sessionObj.db);
	}
	spcArray.updateAllSpcActiveNum();
	
	trackUpdatedCallback.func = loadResults;
	trackUpdatedCallback.data = sessionObj;
<?php		
	} elseif(isset($sessionError)) {
?>
	trackUpdatedCallback.func = function(data) { UI.alert.call(UI, data); };
	trackUpdatedCallback.data = '<?php echo $sessionError; ?>';
<?php		
	}
?>
});

window.addEventListener("polymer-ready", function(e) {
	isEncodeOn = !isEncodeOn;		// because doing toggleEncode() will reverse isEncodeOn as well
	toggleEncode();
	var querycard = document.querySelector('#mainQueryCard');
	querycard.checkEncodeSpecies();
	querycard.addEventListener('submit-form', validateUploadFileOrURL);
	querycard.addEventListener('alert', function(e) { UI.alert(e.detail.msg); } );
	querycard.addEventListener('toggle-window', function(e) { toggleWindow('trackSelect', 'mainQueryCard');} );
	querycard.addEventListener('partial-genename', function(e) { 
		$.getJSON('cpbrowser/jsongenename.php', {name: querycard.querySent}, function(data) { querycard.updatePartialQuery(data); }); 
	});
	querycard.addEventListener('submit-genequery', function(e) {
		validate_form_genequery(e.detail.postdata); 
	});
	
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
</head>
<body unresolved class="<?php echo $genemoOn? "firstIndex": "twoColLiqLt"; ?>" onresize="resize_tbody();">
<div id="container">
  <div id="sidebar1">
    <polymer-element name="query-cards" attributes="selectedTab InputUrl InputFile selectedRefs currentRef DisplayUrl UserEmail trackSelActive isDisabled querySent">
      <template>
        <link rel="stylesheet" href="cpbrowser/query-cards.css">
        <section>
          <paper-tabs selected="{{selectedTab}}" selectedindex="0" noink>
            <paper-tab active>
              <core-icon class="smallInline" icon="search" alt="search"></core-icon>
              Search </paper-tab>
            <paper-tab>
              <core-icon class="smallInline" icon="view-list" alt="query genes"></core-icon>
              Query</paper-tab>
          </paper-tabs>
          <core-animated-pages selected="{{selectedTab}}" transition="slide-from-right">
            <div class="formstyle" slide-from-right> 
              <!-- This is the upload new file part -->
              <div class="vertMargined">
                <div class="vertCenterContainer clearFix">
                  <div class="vertCenterElement"> <strong>Peak file to search: </strong>
                    <core-tooltip large>
                      <core-icon class="smallInline transparent" icon="help" alt="help"></core-icon>
                      <div tip> Please specify the reference genome you would like to search against， then upload your custom peak file below for analysis. Either put your file on a public server and provide the URL, or directly upload the file here. (<a href="/goldenPath/help/customTrack.html#BED" target="_blank">bed file or peaks format accepted</a>) </div>
                    </core-tooltip>
                  </div>
                  <paper-button id="fillSample" class="rightFloat vertMargined vertCenterElement" noink raised>Use sample file</paper-button>
                </div>
                Reference:
                <paper-dropdown-menu id="regionDropdown" label="Reference" class="vertMargined">
                  <paper-dropdown class="dropdown">
                    <core-menu class="menu" id="speciesToUpload" valueattr="value">
                      <template repeat="{{ s in species | encodeFilter }}">
                        <paper-item value="{{s.db}}">{{s.commonName}} ({{s.db}})</paper-item>
                      </template>
                    </core-menu>
                  </paper-dropdown>
                </paper-dropdown-menu>
                <br>
                <paper-input id="urlFileInput" class="fullWidth" label="URL for data file" floatingLabel="true" value={{InputUrl}}></paper-input>
                <paper-button class="fullWidth" raised noink id="fileSelectButton">{{uploadButtonText}}</paper-button>
                <input style="display: none;" type="file" id="uploadFileInput" name="uploadFileInput" />
              </div>
              <core-tooltip large class="fullWidth">
                <paper-input id="returnEmail" class="fullWidth" label="Your email" floatingLabel="true" value={{UserEmail}}></paper-input>
                <div tip> Some results may take a while to compute. You may provide an email here to get notification once the analysis is completed. </div>
              </core-tooltip>
              <core-tooltip large class="fullWidth">
                <paper-input id="urlFileToShow" class="fullWidth" label="(Optional) Display file URL" floatingLabel="true" value={{DisplayUrl}}></paper-input>
                <div tip> You may also provide a URL for a <a href="/goldenPath/help/wiggle.html">wig</a> / <a href="/goldenPath/help/bigWig.html" target="_blank">bigWig</a> file <strong><em>for display purposes only</em></strong> </div>
              </core-tooltip>
              <paper-button class="fullWidth vertMargined" toggle raised noink id="trackSelectButton">Track Selection &amp; Data Download</paper-button>
              <paper-button class="colored fullWidth vertMargined" raised id="fileSubmit" disabled?="{{isDisabled}}">
                <core-icon class="smallInline" icon="search" alt="search"></core-icon>
                Search </paper-button>
              <!-- end upload new file part --> 
            </div>
            <div class="formstyle" slide-from-right>
              <paper-radio-group selected="{{geneRegionSelection}}">
                <paper-radio-button name="gene" label="Gene"></paper-radio-button>
                <paper-radio-button name="region" label="Region for"></paper-radio-button>
              </paper-radio-group>
              <paper-dropdown-menu disabled?="{{spcCoorDropDisabled}}" label="Reference" class="vertMargined">
                <paper-dropdown class="dropdown">
                  <core-menu class="menu" selected="{{spcCoorSelection}}" valueattr="value">
                    <template repeat="{{ s in selectedSpecies }}">
                      <paper-item value="{{s.db}}">{{s.db}}</paper-item>
                    </template>
                  </core-menu>
                </paper-dropdown>
              </paper-dropdown-menu>
              <div class="lineContainer vertMargined">
                <div relative id="geneNameHotRegion">
                  <paper-input class="fullWidth" id="geneName" label="Input your query here" value={{InputGeneName}}></paper-input>
                  <core-dropdown relatedTarget="{{$.geneName}}" id="geneNameDropDown" class="autoText" autoFocusDisabled>
                  	<core-menu class="menu" selected="{{partialSelection}}" valueattr="value">
                      <template repeat="{{ i in candidates }}">
                      	<core-item value="{{i.value}}" id="{{i.id}}">{{i.contentBefore}}<strong>{{i.contentBold}}</strong><em>{{i.contentItalic}}</em>{{i.contentAfter}}</core-item>
                      </template>
                    </core-menu>
                  </core-dropdown>
                </div>
                <div class="right">
                  <paper-button class="colored" raised id="querySubmit" disabled?="{{isDisabled}}">GO</paper-button>
                </div>
              </div>
              <form name="searchform" class="formstyle" id="searchform" onsubmit="return validate_form_genequery();">
                <div class="BoxHide" id="GListResponse" onmouseover="inGList(true);" onmouseout="inGList(false);"></div>
                <input type="hidden" id="direct" name="direct" value="false" />
                <table id="speciesTable" width="100%" border="1" cellspacing="0" cellpadding="1px" bordercolor="#666666" style="border: 1px solid #666666; margin: 3px 0px; min-height: 60px;">
                  <tr>
                    <td width="18px" bgcolor="#666666" style="border: 1px solid #666666;"><div class="rotatedCCW"><span class="subHeaderNoHover">Species</span></div></td>
                    <td style="border: 1px solid #666666;"><template repeat="{{ s in species }}">
                        <div id="{{s.db}}_checkboxwrapper" >
                          <core-label>
                            <paper-checkbox checked name="{{s.db}}" id="{{s.db}}" value="{{s.db}}"></paper-checkbox>
                            <em>{{s.name}}</em> ({{s.commonName}})
                            [{{s.db}}]</core-label>
                        </div>
                      </template></td>
                  </tr>
                </table>
              </form>
              <!-- end #selection -->
              <div style="clear: both;"></div>
            </div>
          </core-animated-pages>
        </section>
      </template>
      <script>
	    Polymer({
			
			MAX_FILENAME_LEN: 25,
			
			isEncodeOn: <?php echo $encodeOn? "true": "false"; ?>,
			
			selectedTab: <?php echo $genemoOn? "0": "1"; ?>,
			InputUrl: "",
			currentRef: "",
			DisplayUrl: "",
			UserEmail: "",
			trackSelActive: "",
			
			timerOn: false,
			mouseInGList: false,
			gListOpen: false,
			querySent: '',
			
			timeoutVar: null,
			
			geneRegionSelection: "gene",
			direct: false,
			spcCoorDropDisabled: true,
			
			checkEncodeSpecies: function () {
				var spcAvailableCount = 0;
				if(this.species) {
					for(var i = 0; i < this.species.length; i++) {
						if(this.isEncodeOn && !this.species[i].isEncode) {
							this.shadowRoot.querySelector('#' + this.species[i].db + '_checkboxwrapper').style.display = 'none';
							this.shadowRoot.querySelector('#' + this.species[i].db).checked = false;
						} else if (!this.isEncodeOn) {
							this.shadowRoot.querySelector('#' + this.species[i].db + '_checkboxwrapper').style.display = 'block';
							this.shadowRoot.querySelector('#' + this.species[i].db).checked = true;
							spcAvailableCount++;
						}
					}
					this.updateAllSpcActive();
					if(spcAvailableCount > 2) {
						this.$.speciesTable.style.display = 'block';
					} else {
						this.$.speciesTable.style.display = 'none';
					}
					this.updateType();
				}
			},
			
			updateAllSpcActive: function () {
				// numbersOnly means no update of checkboxes to species.isActive
				// otherwise species.isActive will be updated first to reflect choice
				this.updateAllSpcActiveUI();
				this.species.updateAllSpcActiveNum();
			},
			
			updateAllSpcActiveUI: function () {
				for(var i = 0; i < this.species.length; i++) {
					this.species[i].isActive = this.shadowRoot.querySelector('#' + this.species[i].db).checked;
				}
			},
			
			updateType: function () {
				var typeSelected = this.spcCoorSelection;
				if(!(this.species[this.species.map[typeSelected]]) || !this.species[this.species.map[typeSelected]].isActive) {
					typeSelected = null;
					this.geneRegionSelection = 'gene';
				}
				this.selectedSpecies = []
				for(var i = 0; i < this.species.length; i++) {
					if(this.species[i].isActive) {
						this.selectedSpecies.push(this.species[i]);
					}
				}
				this.spcCoorSelection = typeSelected;
			},
			
			encodeFilter: function(value) {
				if(value) {
					result = [];
					for(var i = 0; i < value.length; i++) {
						if(value[i].isEncode || !this.isEncodeOn) {
							result.push(value[i]);
						}
					}
					return result;
				}
			},
			
			geneRegionSelectionChanged: function() {
				this.spcCoorDropDisabled = (this.geneRegionSelection == 'gene');
			},
			
			create: function() {
				InputFile: new Blob();
				selectedRefs: {};
				candidates: [];
			},
						
			queryTextChanged: function() {
				// reset_selection();
				if(this.timerOn) {
					this.cancelAsync(this.timeoutVar);
					this.timerOn = false;
				}
				//$("#waiting").html($("#geneName").val());
				var chromRegex = /^chr\w+\s*(:|\s)/i;
				if(this.geneRegionSelection == "gene"
					&& this.InputGeneName.trim().length > 1
					&& this.InputGeneName.trim() != this.querySent
					&& !chromRegex.test(this.InputGeneName.trim())) {
						// length is enough for ajax and also not already updated
						// start the timer to prepare for ajax
						this.direct = false;
						if(!this.gListOpen) {
							timerOn = true;
							timeoutVar = this.async(this.sendPartialQuery, null, 500);
						} else {
							this.sendPartialQuery();
						}
				} else if(this.InputGeneName.trim().length <= 1
					|| chromRegex.test(this.InputGeneName.trim())) {
						this.toggleGList(false);
				}
			},
			
			sendPartialQuery: function() {
				this.timerOn = false;
				//$("#waiting").html($.trim($("#geneName").val()).length);
				if(this.InputGeneName.trim().length > 1
					&& this.InputGeneName.trim() != this.querySent) {
					// send Ajax
					this.querySent = this.InputGeneName.trim();
					//$('#geneName').addClass('searchFieldBusy');
					//toggleGList(0);
//					$('#GListResponse').html('<em>Loading...</em>');
//					toggleGList(1);
					this.fire("partial-genename");
				}
			},
			
			updatePartialQuery: function(data) {
				//$('#geneName').removeClass('searchFieldBusy');
				this.candidates = [];
				var hostNode = this;
				var hasItems = true;
				$.each(data, function(key, val) {
					//console.log(key);
					var entry = {};
					entry.contentBefore = '';
					entry.contentItalic = '';
					entry.contentBold = '';
					entry.contentAfter = '';
					if(key == "(none)") {
						entry.value = "(none)";
						entry.id = "none_dummy";
						entry.contentItalic = "(No results)";
						hostNode.candidates.push(entry);
						return false;
					} else {
						key = key.replace(/__[0-9]+/, "");		// remove potential duplicate aliases
						entry.id = val;
						entry.value = val;
						if(key == val) {
							entry.contentBold = val.substr(0, hostNode.querySent.length);
							entry.contentAfter = val.substr(hostNode.querySent.length);
						} else {
							// key is alias, val is real gene name
							entry.contentBefore = val + ' (';
							entry.contentBold = key.substr(0, hostNode.querySent.length);
							entry.contentAfter = key.substr(hostNode.querySent.length) + ')';
						}
						hostNode.candidates.push(entry);
					}
				});
				
				this.toggleGList(true);
				
			},
			
			partialSelectionChanged: function(oldValue, newValue) {
				if(newValue) {
					this.change_text(newValue);
				}
			},
			
			toggleGList: function(toggle) {
				if(toggle) {
					// turn on GList
					this.partialSelection = '';
					this.gListIsOn = true;
					this.$.geneNameDropDown.open();
				} else {
					this.gListIsOn = false;
					this.$.geneNameDropDown.close();
				}
			},

			textBlured: function() {
				if(this.timerOn) {
					this.cancelAsync(this.timeoutVar);
				}
				if(!this.mouseInGList) {
					this.timerOn = true;
					this.timeoutVar = this.async(this.hideGListResponse, null, 1000);
				}
			},
			
			inGList: function(flag) {
				if(timerOn) {
					this.cancelAsync(this.timeoutVar);
				}
				this.mouseInGList = flag;
				if(!this.mouseInGList) {
					this.timerOn = true;
					this.timeoutVar = this.async(this.hideGListResponse, null, 1000);
				}
			},
			
			hideGListResponse: function() {
				this.timerOn = false;
				this.toggleGList(false);
			},
			

			clear_text: function() {
				if(this.geneRegionSelection != "gene") {
					this.InputGeneName = "";
				}
			},
			
			change_text: function(txtValue) {
				this.querySent = txtValue;
				this.InputGeneName = this.querySent;
				this.direct = true;
				this.timerOn = false;
				this.toggleGList(false);
			},
			
			ready: function() {
				
				var hostNode = this;
				
				this.species = spcArray;
				this.uploadButtonText = "Upload local file";

				this.$.uploadFileInput.addEventListener("change", function(e) {
					var shortFileName = hostNode.$.uploadFileInput.files[0].name;
					if(shortFileName == "") {
						hostNode.$.fileSelectButton.classList.remove("noTextTransformButton");
						hostNode.uploadButtonText = "Upload local file";
					} else {
						shortFileName = shortFileName.replace(/^C:\\fakepath\\/, "");
						if(shortFileName.length > this.MAX_FILENAME_LEN) {
							shortFileName = "..." + shortFileName.substring(shortFileName.length - hostNode.MAX_FILENAME_LEN);
						}
						hostNode.$.fileSelectButton.classList.add("noTextTransformButton");
						hostNode.uploadButtonText = shortFileName;
					}
				});
				
				this.$.fileSelectButton.addEventListener("click", function(e) {
					hostNode.$.uploadFileInput.click();
				});
				
				this.$.trackSelectButton.addEventListener("click", function(e) {
					hostNode.fire("toggle-window");
				});
				
				this.$.fileSubmit.addEventListener("click", function(e) {

					if(hostNode.$.uploadFileInput.files.length <= 0 && hostNode.InputUrl.length <= 0) {
						hostNode.fire("alert", {msg: 'You need to provide the URL for your input file or select a file to upload!'});
						return false;
					} else if(hostNode.$.speciesToUpload.selected == null) {
						hostNode.fire("alert", {msg: 'You need to select the reference genome for your file!'});
						return false;
					} else if(hostNode.UserEmail.length > 0 && (hostNode.UserEmail.indexOf('@') <= 0 
						|| (hostNode.UserEmail.indexOf('@') >= hostNode.UserEmail.lastIndexOf('.') - 1))) {
							hostNode.fire("alert", {msg: 'Please provide a valid email address!'});
							return false;
					}
					
					hostNode.InputFile = hostNode.$.uploadFileInput.files[0];
					hostNode.currentRef = hostNode.$.speciesToUpload.selected;
					
					hostNode.fire("submit-form");
				});
				
				this.$.fillSample.addEventListener("click", function(e) {
					hostNode.InputUrl = "http://www.genemo.org/sample/wgEncodeEM001937.txt";
					hostNode.$.speciesToUpload.selected = "mm9";
				});
				
				checkboxList = this.shadowRoot.querySelectorAll('paper-checkbox');
				Array.prototype.forEach.call(checkboxList, function(item) {
					item.addEventListener("change", function(e) {
						hostNode.updateAllSpcActive();
						hostNode.updateType();
					});
				});
				
				this.$.geneName.addEventListener('input', function(e) {
					hostNode.queryTextChanged();
				});
				
				this.$.geneName.addEventListener('blur', function(e) {
					hostNode.textBlured();
				});
				
				this.$.geneNameHotRegion.addEventListener('mouseover', function(e) {
					hostNode.inGList(true);
				});
				
				this.$.geneNameHotRegion.addEventListener('mouseout', function(e) {
					hostNode.inGList(false);
				});

				this.$.querySubmit.addEventListener("click", function(e) {

					if(hostNode.InputGeneName == "") {
						hostNode.fire("alert", {msg: "You need to either choose a gene or type in part of its name before proceeding."});
						return false;
					}
					var chromRegex = /^chr\w+\s*(:|\s)\s*[0-9,]+\s*(-|\s)\s*[0-9,]+/i;
					if(chromRegex.test(hostNode.InputGeneName)) {
						if(hostNode.geneRegionSelection == "gene") {
							// should choose a species
							hostNode.fire("alert", {msg: "Please specify the species of the coordinates.\n\nYou can do this by clicking \"Gene Name\" to the left of\n the query field."});
							return false;
						}
					} else if(hostNode.geneRegionSelection != "gene") {
						// should input coordinate
						hostNode.fire("alert", {msg: "Please specify coordinates in one of the following formats:\n\n   \"chrX:XXXXX-XXXXX\"\n   \"chrX XXXXX XXXXX\"\n\n You can also select \"Gene name\" to query a gene across all species."});
						return false;
					}
					
					hostNode.updateAllSpcActive();
				
					if(hostNode.species.activeNumber < 2) {
						hostNode.fire("alert", {msg: "You need to choose at least TWO (2) species."});
						return false;
					}
					// Prepare post data
					var postdata = {};
					
					if(hostNode.geneRegionSelection == "gene") {
						postdata['species'] = "gene";
					} else {
						postdata['species'] = hostNode.spcCoorSelection;
					}
					postdata['geneName'] = hostNode.InputGeneName;
					postdata['direct'] = hostNode.direct? 'true': 'false';
					for(var i = 0; i < hostNode.species.length; i++) {
						if(hostNode.species[i].isActive) {
							postdata[hostNode.species[i].db] = hostNode.species[i].db;
						}
					}
					hostNode.isDisabled = true;
					
					hostNode.fire("submit-genequery", {postdata: postdata});
				});
				
			}
			
		});
	  </script> 
    </polymer-element>
    <div id="logoholder"> <a href="index.php" target="_self"><img src="cpbrowser/images/genemologo.png" alt="Comparative Genome Browser Logo" border="0" /></a> </div>
    <div class="header" onclick="togglePanel('trackManip', false);"><span class="tableHeader"><span class="headerIndicator" id="trackManipIndicator">[-]</span> Search / Query Panels</span> </div>
    <div id="trackManipHolder">
      <query-cards id='mainQueryCard'></query-cards>
    </div>
    <div id="peakFileHolder" class="formstyle" style="display: none;"> </div>
    <div id="displayFileHolder" class="formstyle" style="display: none;"> </div>
    <div style="display: none;">
      <iframe style="display: none;" name="uploadFileHolder" id="uploadFileHolder"></iframe>
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
      <div>
        <label>
        <input type="checkbox" id="useAllTracks" name="useAllTracks" />
        Use all ENCODE data.
        <core-tooltip large position="top">
          <core-icon class="smallInline transparent" icon="help" alt="help"></core-icon>
          <div tip> Use the entire ENCODE dataset to query similar tracks instead of the selected ones. <br>
            <strong><em>Caution: the result may take significant amount of time to compute, so providing your email is highly recommended.</em></strong> </div>
        </core-tooltip>
        </label>
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
	  echo "/cgi-bin/hgTracks?clade=mammal&org=" . $spcinfo[$i]["commonname"] . "&db=" . $spcinfo[$i]["dbname"] . "&Submit=submit&hgsid=" . requestSpeciesHgsID($spcinfo[$i]["dbname"]) . '&showEncode=' . ($encodeOn? 'on': 'off') . "&hgControlOnly=on" . ((isset($_SESSION['resetView']) && $_SESSION['resetView'])? "&hgt.reset=TRUE&hgt.defaultImgOrder=TRUE": ""); 
	  ?>">Your browser doesn't support &lt;iframe&gt; tag. You need a browser supporting &lt;iframe&gt; tag to use Comparison Browser. (Latest versions of mainstream browsers should all support this tag.)</iframe>
        <?php
	}
	$_SESSION['resetView'] = false;
		?>
      </div>
    </div>
    <div class="header buttons" style="float: right;" onclick="updateTracks(); hideWindow('trackSelect');">Update</div>
    <div class="header buttons" style="float: right;" onclick="resetTracks();">Reset view</div>
    <div class="header buttons" style="float: right;" onclick="hideWindow('trackSelect');">Close</div>
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
		if((!isset($_COOKIE['NoTipTrackSettings']) || $_COOKIE['NoTipTrackSettings'] != 'true') && !$genemoOn) {
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
    <div id="leftbutton" onclick="UI.switchLeft();"></div>
  </div>
  <div id="mainContent">
    <iframe id="cpbrowser" name="cpbrowser" src="cpbrowser/cpbrowser.php" width="100%" marginwidth="0" height="100%" marginheight="0" scrolling="auto" frameborder="0">Your browser doesn't support &lt;iframe&gt; tag. You need a browser supporting &lt;iframe&gt; tag to use Comparison Browser. (Latest versions of mainstream browsers should all support this tag.)</iframe>
    <!-- end #mainContent --> 
  </div>
  <!-- This clearing element should immediately follow the #mainContent div in order to force the #container div to contain all child floats --> 
  <br class="clearfloat" />
  <!-- end #container --> 
</div>
</body>
</html>
