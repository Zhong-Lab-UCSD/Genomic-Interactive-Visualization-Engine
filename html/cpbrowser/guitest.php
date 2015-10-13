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
<title>GENEMO Graphical Engine</title>
<script src="components/bower_components/webcomponentsjs/webcomponents-lite.min.js"></script>
<link rel="import" href="components/genemo_components/genemo-card/genemo-card.html">
<link rel="import" href="components/genemo_components/chart-card-content/chart-card-content.html">
<link rel="import" href="components/bower_components/iron-icon/iron-icon.html">
<link rel="import" href="components/bower_components/iron-icons/editor-icons.html">
<link href="http://fonts.googleapis.com/css?family=Roboto:500,400italic,700italic,700,400" rel="stylesheet" type="text/css">
<link rel="import" href="components/genemo_components/genemo-styles.html">
<style is="custom-style" include="genemo-shared-styles">
</style>
</head>
<body unresolved>
<genemo-card>
  <div class="GenemoHead">
    <iron-icon class="smallInline" icon="editor:insert-photo" alt="chart"></iron-icon>
    Chart test
  </div>
  <chart-card-content class="GenemoBody" id="mainChart"></chart-card-content>
</genemo-card>
</body>
</html>
