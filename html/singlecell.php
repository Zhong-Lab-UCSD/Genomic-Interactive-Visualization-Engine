<?php
require_once (realpath(dirname(__FILE__) . "/../includes/session.php"));
?>
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Single Cell Data Browser (powered by UCSC Genome Browser)</title>
<link href="cpbrowser/mainstyles.css" rel="stylesheet" type="text/css">
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
<script type="text/javascript" src="cpbrowser/js/jquery-1.7.js"></script>
<script language="javascript">

function resize_tbody() {
	
	$('#mm10').height($(window).height() - 3);
	$('#trackSettings').height($(window).height() - 20); 
	$('#trackSettings').width($(window).width() - 44); 
	$('#trackSettingFrame').height($('#trackSettings').height() - 100); 
	$('#trackSettingFrame').width($('#trackSettings').width() - 6); 
}

function trackSettingsOnLoad() {
	if(document.getElementById('trackSettingFrame').contentWindow.location.href != "about:blank" && !$('#trackSettings').is(":visible")) {
		togglePanel('trackSettings');
	}
}

function trackSettingSubmit(db) {
	hidePanel('trackSettings');
}

function toggleHeaderText(header) {
	if($('#' + header).html() == '≪') {
		$('#' + header).html('≫');
	} else {
		$('#' + header).html('≪');
	}
}

function hideHeaderText(header) {
	$('#' + header).html('≪');
}

function showHeaderText(header) {
	$('#' + header).html('≫');
}

function hidePanel(panel) {
	$('#' + panel).fadeOut('fast', hideHeaderText(panel + 'Indicator'));
}

function togglePanel(panel) {
	$('#' + panel).fadeToggle('fast', toggleHeaderText(panel + 'Indicator'));
}

$(document).ready( function () {
	resize_tbody();
});
</script>
</head>

<body>
<iframe id="mm10" name="mm10" class="cpbrowserFrame"
         src="<?php 
	  echo "/cgi-bin/hgTracks?clade=mammal&org=mouse&db=mm10&position=chr17%3A35%2C504%2C846-35%2C511%2C964&pix=850&Submit=submit&hgControlOnly=off&hgSingleCell=on&hgsid=" . ($_SESSION['ID']*10) . ((isset($_SESSION['resetView']) && $_SESSION['resetView'])? "&hgt.reset=TRUE&hgt.defaultImgOrder=TRUE": "");?>">Your browser doesn't support &lt;iframe&gt; tag. You need a browser supporting &lt;iframe&gt; tag to use Single Cell Browser. (Latest versions of mainstream browsers should all support this tag.)</iframe>
<div class="header" style="height: 200px; float: right; display: none;" onclick="togglePanel('trackSettings');"> <span id="trackSettingsIndicator">≪</span>
  <div class="rotated">Track Info &amp; Settings</div>
</div>
<div id="singleCellTitle">
<p>Single-cell RNA-Seq Genome Browser </p>
<p>(powered by UCSC Genome Browser)</p>
<p>Welcome to the single-cell genome browser hosted by Zhong Lab at UCSD. Here we present our latest single-cell RNA-seq data along with mouse genome assembly GRCm38 (mm10) to provide better data comprehension and facilitate further comparative studies. Between the two hypotheses for the mechanism first cell fate decision, the asymmetric hypothesis and the equivalence hypothesis, the analysis of our single-cell RNA-seq data showed evidence for early cell asymmetry.</p>
<p>&nbsp;</p>
<p>The Browser can be used to </p>
</div>
<div id="trackSettings" class="trackSettingsClass" style="display: none;">
  <div id="trackSettingsHeader" class="headerNoHover2">Track information &amp; settings</div>
  <div style="position: absolute; top: 45px; left: 0px;">
    <iframe onload="trackSettingsOnLoad();" id="trackSettingFrame" name="trackSettingFrame" class="trackSettingFrame" src="about:blank">Your browser doesn't support &lt;iframe&gt; tag. You need a browser supporting &lt;iframe&gt; tag to use Comparison Browser. (Latest versions of mainstream browsers should all support this tag.)</iframe>
    <div class="header buttons" style="float: right; width: 150px;" onclick="hidePanel('trackSettings');">Close</div>
    <div style="clear: both"></div>
  </div>
</div>
</body>
</html>