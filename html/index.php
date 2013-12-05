<?php
require '../includes/session.php';
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
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
<!--[if IE]>
<style type="text/css"> 
/* place css fixes for all versions of IE in this conditional comment */
.twoColLiqLt #sidebar1 { padding-top: 30px; }
.twoColLiqLt #mainContent { zoom: 1; padding-top: 15px; }
/* the above proprietary zoom property gives IE the hasLayout it needs to avoid several bugs */
</style>
<![endif]-->
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
var numSpc = 0;
var speciesCoor = {};
var speciesStrand = {};
var speciesGeneName = {};
var numSpcReady = 0;
var mouseInGList = false;
var inFocus = false;
var maxGeneListHeight;

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
		document.getElementById('leftbutton').style.backgroundImage = "url(images/right_arrow.gif)";
	} else {
		left_value = 0;
		document.getElementById('sidebar1').style.left = left_value + "px";
		document.getElementById('leftborder').style.left = left_value + left_width + "px";
		document.getElementById('mainContent').style.left = left_value + left_width + 5 + "px";
		document.getElementById('leftbutton').style.backgroundImage = "url(images/left_arrow.gif)";
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
	$('#GListResponse').removeClass("GListShow");
	$('#GListResponse').addClass("GListHide");
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
		$('#GListResponse').removeClass("GListHide");
		$('#GListResponse').addClass("GListShow");
	} else {
		gListIsOn = 0;
		$('#GListResponse').removeClass("GListShow");
		$('#GListResponse').addClass("GListHide");
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
	if($.trim($("#geneName").val()).length > 1
		&& $.trim($("#geneName").val()) != querySent) {
			// length is enough for ajax and also not already updated
			// start the timer to prepare for ajax
			$("#direct").val("false");
			if(gListIsOn == 0) {
				timerOn = 1;
				timeoutVar = setTimeout("sendAjax();", 500);
			} else {
				sendAjax();
			}
	} else if($.trim($("#geneName").val()).length <= 1) {
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
		$('#waiting').removeClass('WaitingHide');
		$('#waiting').addClass('WaitingShow');
		//toggleGList(0);
		$('#GListResponse').html('<em>Loading...</em>');
		toggleGList(1);
		$.getJSON('cpbrowser/jsongenename.php', {name: querySent}, function(data) {
			$('#waiting').removeClass('WaitingShow');
			$('#waiting').addClass('WaitingHide');
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
	var items = $("#" + currentGeneName.replace(".", "\\.")).serializeArray();
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
		var currentGName = $('#' + currentGeneName.replace(".", "\\.") + speciesDbName[i] + "NameDisp").html();
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
	$('#masterHolder').removeClass("GListHide");
	
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
	$('#' + db + 'Loading').removeClass('GListHide');
	$('#masterLoading').removeClass('GListHide');
	numSpcReady--;
}

function setReady(db, coor) {
	$('#' + db + 'Coor').html(coor);
	$('#' + db + 'Loading').addClass('GListHide');
	numSpcReady++;
	if(numSpcReady >= numSpc) {
		numSpcReady = numSpc;
		$('#masterLoading').addClass('GListHide');
	}
}

function callViewChange(db, change) {
	setUnReady(db);
	document.getElementById('cpbrowser').contentWindow.callViewChange(db, change);
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

$(document).ready( function () {
	document.getElementById('sidebar1').style.left = left_value + "px";
	document.getElementById('leftborder').style.left = left_value + left_width + "px";
	document.getElementById('mainContent').style.left = left_value + left_width + 5 + "px";
	attachTextListener(document.getElementById('geneName'), textChanged);
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
	require("../includes/opendbcpb.php");
?>
</head>
<body class="twoColLiqLt">
<div id="container">
  <div id="sidebar1">
    <div id="logoholder"> <a href="index.php" target="_self"><img src="cpbrowser/images/Logo.gif" alt="Comparative Genome Browser Logo" border="0" /></a> </div>
    <div class="header" id="selectHeader" onclick="togglePanel('selection', false);"> <span class="tableHeader"><span class="headerIndicator" id="selectionIndicator">[-]</span> Gene Query</span></div>
    <div id="selectionHolder">
      <form name="searchform" class="formstyle" id="searchform" onsubmit="return validate_form();">
        <div class="GListHide" id="GListResponse" onmouseover="inGList(true);" onmouseout="inGList(false);"></div>
        Gene name:
        <input name="geneName" id="geneName" type="text" size="18" maxlength="15" onfocus="textChanged();" onblur="textBlured();" autocomplete="off" />
        <img align="baseline" src="cpbrowser/images/loading1.gif" id="waiting" class="WaitingHide" />
        <input style="position:absolute; right: 5px;" name="search" type="submit" value="GO" id="search" />
        <input type="hidden" id="direct" name="direct" value="false" />
        <div class="speciesPanel">
          <div class="subHeaderNoHover" style="position: absolute; width: 14px; top: 0px; bottom: 0px;">
            <div class="rotated">Species</div>
          </div>
          <?php
	// TODO: need to do something about the species here
	// first connect to database and find the number of species
	$species = $mysqli->query("SELECT * FROM species");
	while($spcitor = $species->fetch_assoc()) {
		// get all the species ready
		//	if(isset($_REQUEST[$spcitor["dbname"]])) { should use this later
		$spcinfo[] = $spcitor;
	}
	$num_spc = sizeof($spcinfo);
	for($i = 0; $i < $num_spc; $i++) {
		
?>
          <label>
            <input type="checkbox" name="<?php echo $spcinfo[$i]["dbname"]; ?>" id="<?php echo $spcinfo[$i]["dbname"]; ?>" value="<?php echo $spcinfo[$i]["dbname"]; ?>" checked <?php if($i == 0) echo "disabled"; ?> />
            <em><?php echo $spcinfo[$i]["name"]; ?></em> (<?php echo $spcinfo[$i]["commonname"]; ?>)
            [<?php echo $spcinfo[$i]["dbname"]; ?>]</label>
          <br />
          <?php
	}
	$species->free();
	require("../includes/closedb.php");
		?>
        </div>
      </form>
      <!-- end #selection --> 
    </div>
    <div class="header" id="genelistHeader" onclick="togglePanel('genelist', false);"> <span class="tableHeader"><span class="headerIndicator" id="genelistIndicator">[-]</span> Gene Selection</span></div>
    <div id="genelistHolder">
      <div id="genelistContentHolder"> </div>
      <!-- end #genelist -->
      <div id="genelistfooter"> <span class="smallformstyle">(*): there is no orthologous region in that section.</span> </div>
    </div>
    <div class="header" id="navigationHeader" onclick="togglePanel('navigation', false);"> <span class="tableHeader"><span class="headerIndicator" id="navigationIndicator">[-]</span> Navigation</span></div>
    <div class="smallformstyle" id="navigationHolder">
      <div style="border: 1px #000000 solid;" id="masterHolder" class="GListHide">
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
  <div id="spcNaviTemplate" class="GListHide">
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
  <div style="position: absolute; top: 0px; bottom: 0px; right: 0px; width: 22px; padding: 0px; 
	font-family:Verdana, Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold;
    background: #999999; color: #FFFFFF;">
    <div class="header" style="height: 170px; float: right;" onclick="togglePanel('trackSelect');"> <span id="trackSelectIndicator">≪</span>
      <div class="rotated" style="width: 150px;">Tracks &amp; Data</div>
    </div>
    <div style="clear: both; height: 5px;"></div>
    <div class="header" style="height: 200px; float: right; display: none;" onclick="togglePanel('trackSettings');"> <span id="trackSettingsIndicator">≪</span>
      <div class="rotated">Track Info &amp; Settings</div>
    </div>
    <div class="header" style="height: 160px; float: right;" onclick="togglePanel('tableBrowser');"> <span id="tableBrowserIndicator">≪</span>
      <div class="rotated" style="width: 140px;">Table Browser</div>
    </div>
  </div>
  <div id="trackSelect" class="trackSelectClass">
    <div class="loadingCover" id="trackSelectLoading">
      <div class="loadingCoverBG"></div>
      <div class="loadingCoverImage"></div>
    </div>
    <div class="headerNoHover">Tracks &amp; Data</div>
    <div class="settingsNormal"> Tracks can be turn on/off via the checkboxes below: </div>
    <div class="subBox">
      <div class="subHeader" onclick="toggleSubPanel('cmnTrack', false);"><span class="headerIndicator" id="cmnTrackIndicator">[-]</span> Common tracks</div>
      <div class="trackHolder" id="cmnTrackHolder"></div>
    </div>
    <div class="subBox">
      <div class="subHeader" onclick="toggleSubPanel('unique', false);"><span class="headerIndicator" id="uniqueIndicator">[-]</span> Unique tracks</div>
      <div id="uniqueHolder"></div>
    </div>
    <div class="header buttons" style="float: right;" onclick="updateTracks();">Update &amp; close ≫</div>
    <div class="header buttons" style="float: right;" onclick="resetTracks();">Reset view ≫</div>
    <div style="clear: both"></div>
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
function doNotShow() {
	$.post('postcookie.php', { varName: 'NoTipTrackSettings', value: 'true' } );
	$('#trackSelectHint').fadeOut('fast');
}
setTimeout("$('#trackSelectHint').fadeOut('fast')", 7500);
</script>
  <div id="trackSelectHint" style="z-index: 20; width: 250px; display: block; padding: 5px; font-family: Verdana, Arial, Helvetica, sans-serif;
font-size: 12px; line-height: 17px; background: #FFFFCC;" class="trackSelectClass"> Hint: tracks can be turned on / off via the <span class="panel">track selection</span> panel, click button on the right to show. --&gt;
    <div class="header buttons" style="float: right; margin-top: 5px;" onclick="doNotShow();">Do not show in the future</div>
    <div style="clear: both"></div>
  </div>
  <?php
		}
?>
  <div style="display: none;" id="uniqueTemplate">
    <div class="speciesTrackHeader">spcCmnName</div>
    <div class="trackHolder" id="spcDbNameHolder"></div>
  </div>
  <div id="trackSettings" class="trackSettingsClass" style="display: none;">
    <div id="trackSettingsHeader" class="headerNoHover2">Track information &amp; settings</div>
    <div style="position: absolute; top: 45px; left: 0px;">
      <iframe onload="trackSettingsOnLoad();" id="trackSettingFrame" name="trackSettingFrame" class="trackSettingFrame" src="about:blank">Your browser doesn't support &lt;iframe&gt; tag. You need a browser supporting &lt;iframe&gt; tag to use Comparison Browser. (Latest versions of mainstream browsers should all support this tag.)</iframe>
      <div class="header buttons" style="float: right; width: 150px;" onclick="hidePanel('trackSettings');">Close</div>
      <div style="clear: both"></div>
    </div>
  </div>
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
function doNotShow() {
	$.post('postcookie.php', { varName: 'NoTipChangeDomain', value: 'true' } );
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
    <div class="header buttons" style="float: right; margin-top: 5px;" onclick="doNotShow();">Do not show in the future</div>
    <div style="clear: both"></div>
  </div>
  <?php
		}
	}
?>
</div>
</body>
</html>
