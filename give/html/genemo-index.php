<?php
require_once( realpath( dirname( __FILE__ ) . '/../includes/common_func.php' ) );
require_once( realpath( dirname( __FILE__ ) . "/../includes/session.php" ) );

$res = initialize_session();
$encodeOn = $res[ 'encodeOn' ];
$in_debug = $res[ 'in_debug' ];
$genemoOn = $res[ 'genemoOn' ];

$sessionInfo = NULL;
if(isset($_REQUEST['sessionID'])) {
  // this is to recover an old session
  // went to database to make sure this is a correct sessionID

  $ch = curl_init((isset($_SERVER["HTTPS"])? "https": "http") +
  "://comp.genemo.org/cpbrowser/loadSession.php?sessionID=" + urlencode($_REQUEST['sessionID']));
  try {
    $sessionInfo = json_decode(curl_exec($ch));
  } catch(Exception $e) {
    $sessionError = "Invalid address or address expired.";
  }
}
?>
<!DOCTYPE html>
<html>

<head>
  <link href='//fonts.googleapis.com/css?family=Roboto:400,400italic,500,700italic,700' rel='stylesheet' type='text/css'>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="keywords" content="Comparative study,Epigenomics,Epigenetics,Visualization,Epigenome browser"/>
  <meta name="description" content="CEpBrowser (Comparative Epigenome Browser) is a gene-centric genome browser that visualize the genomic features of multiple species with color-coded orthologous regions, aiding users in comparative genomic research. The genome browser is adapted from UCSC Genome Browser and the orthologous regions are generated from cross-species lift-over pairs."/>
  <title>GENEMO Search</title>
  <script src="components/bower_components/webcomponentsjs/webcomponents-lite.min.js"></script>
  <link rel="import" href="components/bower_components/genemo-visual-components/manual-icon/manual-icon.html">
  <link rel="import" href="components/bower_components/genemo-data-components/meta-entries/meta-entries.html">
  <link rel="import" href="components/bower_components/genemo-data-components/chrom-region-display/chrom-region-disp.html">
  <link rel="import" href="components/bower_components/genemo-data-components/species-object/species-object.html">
  <link rel="import" href="components/bower_components/genemo-data-components/task-scheduler/task-scheduler.html">
  <link rel="import" href="components/bower_components/genemo-visual-components/ui-component/ui-component.html">
  <link rel="import" href="components/bower_components/genemo-visual-components/cell-line-info-card/cell-line-info-card.html">
  <link rel="import" href="components/bower_components/genemo-visual-components/chart-track-list/chart-track-list.html">
  <link rel="import" href="components/bower_components/genemo-visual-components/chart-area/chart-area.html">
  <link rel="import" href="components/bower_components/genemo-visual-components/track-control/track-control.html">
  <link rel="import" href="components/bower_components/genemo-visual-components/search-card-content/search-card-content.html">
  <link rel="import" href="components/bower_components/genemo-visual-components/genemo-track-filter/genemo-track-filter.html">
  <link rel="import" href="components/bower_components/genemo-visual-components/chrom-region-list/chrom-region-list.html">
  <link rel="import" href="components/bower_components/genemo-visual-components/genemo-card/genemo-card.html">
  <link rel="import" href="components/bower_components/genemo-visual-components/genemo-styles.html">
  <link rel="import" href="components/bower_components/paper-button/paper-button.html">
  <link rel="import" href="components/bower_components/paper-dialog/paper-dialog.html">
  <link rel="import" href="components/bower_components/google-youtube/google-youtube.html">
  <link rel="import" href="components/bower_components/paper-tooltip/paper-tooltip.html">
  <link rel="import" href="components/bower_components/paper-toolbar/paper-toolbar.html">
  <link rel="import" href="components/bower_components/iron-signals/iron-signals.html">
  <link rel="import" href="components/bower_components/iron-icons/iron-icons.html">
  <link rel="import" href="components/bower_components/iron-icons/notification-icons.html">
  <link rel="import" href="components/bower_components/iron-flex-layout/iron-flex-layout.html">
  <link rel="import" href="components/bower_components/iron-flex-layout/iron-flex-layout-classes.html">
  <link rel="import" href="components/bower_components/paper-drawer-panel/paper-drawer-panel.html">
  <style is="custom-style" include="genemo-shared-styles iron-flex iron-flex-alignment"></style>
  <script type="text/javascript" src="js/genemoMain.js"></script>
  <script type="text/javascript">
  <?php
  // this is loading part
  if($sessionInfo) {
    ?>
    GIVe.loadSessionInfo(
      '<?php echo $sessionInfo['id']; ?>',
      '<?php echo $sessionInfo['db']; ?>',
      '<?php echo $sessionInfo['selected_tracks']; ?>',
      '<?php echo $sessionInfo['display_file_url']; ?>',
      '<?php echo ($sessionInfo['original_file_name']?
      $sessionInfo['original_file_name']:
      basename($sessionInfo['display_file_url'])); ?>',
      <?php echo ((strpos($sessionInfo['display_file_url'], $sessionInfo['id']) !== false) ||
      (strpos($sessionInfo['display_file_url'], $sessionInfo['original_file_name']) !== false))?
      'false': 'true'; ?>,
      '<?php echo trim($sessionInfo['search_range']); ?>');

    <?php
  } elseif(isset($sessionError)) {
    ?>
    GIVe.sessionError = '<?php echo $sessionError; ?>';
    <?php
  }
  ?>
  </script>
</head>

<body unresolved class="fullbleed layout vertical">
  <?php include_once(realpath(dirname(__FILE__) . '/../includes/analyticstracking.php')); ?>
  <div id="genemoFirstContainer" class="layout vertical center">
    <img class="genemoLogo" src="genemo-assets/images/GenemoLogo.svg" alt="GENEMO Logo" border="0" />
    <iron-pages id='searchAndTrackTabs' selected='genemoSearchPanel'
      attr-for-selected='id' class="flex layout vertical">
      <genemo-card disable-folding id="genemoSearchPanel">
        <search-card-content genemo-body id='searchCard'></search-card-content>
      </genemo-card>
      <genemo-card disable-folding id="trackSelectionPanel">
        <chart-track-list genemo-body id="mainChartTrackList"
          group-id-list='["encode"]' setting-key="isGenemoSelected">
        </chart-track-list>
      </genemo-card>
    </iron-pages>
  </div>
  <paper-drawer-panel id='mainPanel' hidden force-narrow>
    <div main>
      <paper-toolbar>
        <paper-icon-button icon='menu' paper-drawer-toggle></paper-icon-button>
        <img class="genemoLogo" src="genemo-assets/images/GenemoLogoNoText.svg" alt="GENEMO Logo" border="0" />
      </paper-toolbar>
      <div class="layout horizontal">
        <genemo-card id='resultPanel' disable-folding>
          <chrom-region-list genemo-body id='mainRegionList'></chrom-region-list>
        </genemo-card>
        <chart-area id="mainChartArea" num-of-subs="1" group-id-list='["genes", "encode", "queryGroup"]'></chart-area>
      </div>
    </div>
    <div drawer id="mainPanelDrawer" class="layout vertical">
      <!-- searchAndTrackTabs go here afterwards -->
    </div>
  </paper-drawer-panel>
  <cell-line-info-card></cell-line-info-card>
  <genemo-track-filter id="trackFilter"></genemo-track-filter>
</body>

</html>
