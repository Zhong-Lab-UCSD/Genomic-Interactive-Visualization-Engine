<?php
	require_once (realpath(dirname(__FILE__) . '/../../includes/common_func.php'));	
	require_once (realpath(dirname(__FILE__) . "/../../includes/session.php"));
	$res = initialize_session();
	$encodeOn = $res['encodeOn'];
	$in_debug = $res['in_debug'];
	$genemoOn = $res['genemoOn'];
	unset($res);
?>
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Single Cell Data Browser (powered by UCSC Genome Browser)</title>
<link href='//fonts.googleapis.com/css?family=Roboto:500,400italic,700italic,700,400' rel='stylesheet' type='text/css'>
<link href="cpbrowser/mainstyles.css" rel="stylesheet" type="text/css">
<script type="text/javascript" src="cpbrowser/js/jquery-1.7.js"></script>
<script language="javascript">

var slideIsShow = false;

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

function togglePanelUpdown() {
	slideIsShow = !slideIsShow;
	if(slideIsShow) {
		$('#indextext').html('<span class="trianglearrow">&#x25B2;</span>  Click here to fold');
		$('#singleCellTitle').css('background', '#FFF');
	}
	$('#singleCellDescHolder').slideToggle('slow');
	if(!slideIsShow) {
		if($('#DoNotShow').is(':checked')) {
			$.post('cpbrowser/postcookie.php', { varName: 'NoSingleCellIntro', value: 'true' } );
		} else {
			$.post('cpbrowser/postcookie.php', { varName: 'NoSingleCellIntro', value: 'false' } );
		}
		$('#indextext').html('<span class="trianglearrow">&#x25BC;</span>  Single-cell RNA-Seq Genome Browser on Mouse Dec. 2011 (GRCm38/mm10) Assembly');
		$('#singleCellTitle').css('background', 'none');
	}
}

$(document).ready( function () {
	resize_tbody();
  <?php
	if(!isset($_COOKIE['NoSingleCellIntro']) || $_COOKIE['NoSingleCellIntro'] != 'true') {
?>
	togglePanelUpdown();
<?php
	}
?>
	jQuery(function() {
		jQuery(".refbody").hide();
		jQuery(".refnum").click(function(event) {
			jQuery(this.nextElementSibling).removeClass("refbodyrightjustify");
			jQuery(this.nextElementSibling).toggle();
			if(jQuery(this.nextElementSibling).offset().left 
				+ jQuery(this.nextElementSibling).width() 
				> jQuery(window).width()) {
					jQuery(this.nextElementSibling).addClass("refbodyrightjustify");
			}
			event.stopPropagation();
		});
		jQuery("body").click(function(event) {
			jQuery(".refbody").hide();
		});
	});
});

</script>
</head>

<body onResize="resize_tbody();" style="overflow: hidden;">
<?php include_once(realpath(dirname(__FILE__) . '/../includes/analyticstracking.php')); ?>
<iframe id="mm10" name="mm10" class="cpbrowserFrame" src="<?php 
	  echo "/cgi-bin/hgTracks?clade=mammal&org=mouse&db=mm10&position=chr17%3A35%2C504%2C846-35%2C511%2C964&pix=850&Submit=submit&hgControlOnly=off&hgSingleCell=on&hgsid=" . ($_SESSION['ID']*10) . ((isset($_SESSION['resetView']) && $_SESSION['resetView'])? "&hgt.reset=TRUE&hgt.defaultImgOrder=TRUE": "");?>">Your browser doesn't support &lt;iframe&gt; tag. You need a browser supporting &lt;iframe&gt; tag to use Single Cell Browser. (Latest versions of mainstream browsers should all support this tag.)</iframe>
<div class="header" style="height: 200px; float: right; display: none;" onclick="togglePanel('trackSettings');"> <span id="trackSettingsIndicator">≪</span>
  <div class="rotated">Track Info &amp; Settings</div>
</div>
<div id="singleCellTitle" style="z-index: 5; width: 100%; left: 0px; top: 0px; position: fixed; height: auto;">
  <div id="singleCellDescHolder" style="width: 100%; height: auto; padding: 1px; background: #FFF; z-index: 5; display: none;">
    <p class="Header2">Single-cell RNA-Seq Genome Browser <span class="normaltext"><strong>(powered by <a href="http://genome.ucsc.edu/" target="_parent">UCSC Genome Browser</a>)</strong></span></p>
    <p class="normaltext">Welcome to the single-cell genome browser! It presents 49 new single-cell RNA-seq datasets (Biase <em>et al.</em> under review) along with mouse genome assembly GRCm38 (mm10) for comparative studies. Published RNA-seq datasets of  <span class="ref"><span class="refnum">sperms</span> <span class="refbody">Gan, H. <em>et al.</em> Dynamics of 5-hydroxymethylcytosine during mouse spermatogenesis. <em>Nat Commun</em> 4 [<a href="http://www.ncbi.nlm.nih.gov/pubmed/23759713" target="_blank">PUBMED</a>] [<a href="http://www.nature.com/ncomms/2013/130613/ncomms2995/full/ncomms2995.html" target="_blank">ARTICLE</a>]</span></span> and <span class="ref"><span class="refnum">oocytes</span> <span class="refbody">Ramskold, D. <em>et al.</em> Full-length mRNA-Seq from single-cell levels of RNA and individual circulating tumor cells. <em>Nat Biotech</em> 30, 777-782 [<a href="http://www.ncbi.nlm.nih.gov/pubmed/22820318" target="_blank">PUBMED</a>] [<a href="http://www.nature.com/nbt/journal/v30/n8/full/nbt.2282.html" target="_blank">ARTICLE</a>]</span></span> are also incorporated. To show these tracks, please scroll down the page and turn corresponding tracks (sperm and/or oocyte) on in "Single Cell Expression Profiling for Embryos group".</p>
    <p class="normaltext">The interface and usage of Single-cell Genome Browser is similar to <a href="http://genome.ucsc.edu/" target="_blank">UCSC Genome Browser</a>.</p>
    <p class="normaltext">The height of the signals in every track is the natural log of number of reads stacked at the genomic position. <strong>The scale is set for each track to normalize the effect from different total numbers of reads for all samples. Therefore, in the browser, signals across cells at the same genomic region would be comparable by height in image.</strong> To see the total number of mapped reads, please click the button to the left of the track or click track name in track settings below.
    <p class="normaltext">For questions, please contact Xiaoyi Cao (<a href='mailt&#111;&#58;x9%&#54;3%61o&#37;&#52;0%&#55;5&#99;s&#100;&#46;ed&#117;'>x9cao <strong>at</strong> ucsd <strong>dot</strong> edu</a>).</p>
    <p class="normaltext">
      <input name="DoNotShow" type="checkbox" id="DoNotShow" value="true" <?php echo (!isset($_COOKIE['NoSingleCellIntro']) || $_COOKIE['NoSingleCellIntro'] != 'true')? "": "checked"; ?>>
      <label for="DoNotShow">Do not show this automatically in the future.</label>
    </p>
  </div>
  <div id="singleCellButton" class="floatingindex" style="width: 100%; overflow: hidden;" onClick="togglePanelUpdown();"><span id="indextext"><span class="trianglearrow">&#x25BC;</span> Single-cell RNA-Seq Genome Browser on Mouse Dec. 2011 (GRCm38/mm10) Assembly</span></div>
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