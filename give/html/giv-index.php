<?php
	require_once (realpath(dirname(__FILE__) . '/../includes/common_func.php'));	
	require_once (realpath(dirname(__FILE__) . "/../includes/session.php"));
	
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
<title>GIVe (Genomic Interaction Visualizer)</title>
<script src="components/bower_components/webcomponentsjs/webcomponents-lite.min.js"></script>
<link rel="import" href="components/bower_components/genemo-visual-components/chart-controller/chart-controller.html">
<link rel="import" href="components/bower_components/paper-dropdown-menu/paper-dropdown-menu.html">
<link rel="import" href="components/genemo_components/genemo-styles.html">
<link rel="import" href="components/bower_components/paper-toolbar/paper-toolbar.html">
<link rel="import" href="components/bower_components/paper-dialog-scrollable/paper-dialog-scrollable.html">
<link rel="import" href="components/bower_components/paper-scroll-header-panel/paper-scroll-header-panel.html">
<link rel="import" href="components/bower_components/iron-flex-layout/iron-flex-layout-classes.html">
<link href="http://fonts.googleapis.com/css?family=Roboto:500,400italic,700italic,700,400" rel="stylesheet" type="text/css">
<style is="custom-style" include="genemo-shared-styles iron-flex iron-flex-alignment iron-positioning">
body {
	font-family: 'Roboto';
	font-size: 14px;
}
h2 {
	font-family: 'Roboto';
	font-size: 16px;
	line-height: 1.4em;
	margin: 1em 1em 0.5em 1em;
}
p {
	margin: 0.5em 1.5em;
	line-height: 1.4em;
}
</style>
<script type="text/javascript">
// initialize species and tracks
function initTrackComponent(spcArray) {
	var mainCard = this.querySelector('#mainCard');
	if(mainCard && mainCard.initTracks) {
		// webcomponents are ready before species are ready
		mainCard.initTracks(spcArray);
	}
}
	
window.addEventListener("WebComponentsReady", function(e) {
	var mainCard = document.querySelector('#mainCard');
	var spcArray = GIVe.SpeciesObject.initAllSpecies(null, null, initTrackComponent.bind(document));
	mainCard.initTracks = function(spcArray) {
		var mainChartArea = new GIVe.ChartController(spcArray);
		Polymer.dom(mainCard).appendChild(mainChartArea);
	};
	if(spcArray && spcArray.ready) {
		// species are ready before webcomponents
		mainCard.initTracks(spcArray);
	}
});
</script>
</head>
<body unresolved class="fullbleed layout vertical">
<?php include_once(realpath(dirname(__FILE__) . '/../includes/analyticstracking.php')); ?>
  <paper-scroll-header-panel class="flex" fixed>
    <paper-toolbar>
      <paper-icon-button icon="menu" id="drawerToggle"></paper-icon-button>
      <div class="title">GIVe (Genomic Interaction Visualizer)</div>
    </paper-toolbar>
    <div id="mainCard"></div>
  </paper-scroll-header-panel>
</body>
</html>
