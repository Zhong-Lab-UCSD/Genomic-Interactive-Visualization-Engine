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
  <link rel="import" href="components/bower_components/genemo-visual-components/genemo-styles.html">
  <link rel="import" href="components/bower_components/iron-flex-layout/iron-flex-layout-classes.html">
  <link rel="import" href="components/bower_components/genemo-visual-components/giv-main/giv-main.html">
  <style is="custom-style" include="genemo-shared-styles iron-flex iron-positioning">
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
</head>
<body unresolved class="fullbleed layout vertical">
<?php include_once(realpath(dirname(__FILE__) . '/../includes/analyticstracking.php')); ?>
  <chart-controller id="mainChartController" class="flex"></chart-controller>
</body>
</html>
