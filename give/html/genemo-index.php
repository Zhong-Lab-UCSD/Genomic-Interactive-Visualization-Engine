<?php
require_once( realpath( dirname( __FILE__ ) . '/../includes/common_func.php' ) );
require_once( realpath( dirname( __FILE__ ) . "/../includes/session.php" ) );

$res = initialize_session();
$encodeOn = $res[ 'encodeOn' ];
$in_debug = $res[ 'in_debug' ];
$genemoOn = $res[ 'genemoOn' ];
$experimentalFeatures = false;

if ( isset( $res[ 'experimental' ] ) && $res[ 'experimental' ] ) {
	$experimentalFeatures = true;
}
unset( $res );

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
	<link href="genemo/mainstyles.css" rel="stylesheet" type="text/css"/>
	<script type="text/javascript" src="js/jquery-1.7.js"></script>
	<script type="text/javascript" src="js/uicomponent.js"></script>
	<script type="text/javascript" src="js/generegion.js"></script>
	<script type="text/javascript" src="js/regionlistui.js"></script>
	<script type="text/javascript" src="js/sessionControl.js"></script>
	<script type="text/javascript" src="js/navui.js"></script>
	<script type="text/javascript" src="js/uploadui.js"></script>
	<script type="text/javascript" src="js/libtracks.js"></script>
	<script type="text/javascript" src="js/languagechange.js"></script>
	<link rel="import" href="components/genemo_components/manual-icon/manual-icon.html">
	<link rel="import" href="components/bower_components/genemo-data-components/meta-entries/meta-entries.html">
	<link rel="import" href="components/genemo_components/cell-line-info-card/cell-line-info-card.html">
	<link rel="import" href="components/genemo_components/search-card-content/search-card-content.html">
	<link rel="import" href="components/genemo_components/query-card-content/query-card-content.html">
	<link rel="import" href="components/genemo_components/genemo-track-filter/genemo-track-filter.html">
	<?php if(isset($experimentalFeatures)) { ?>
	<link rel="import" href="components/genemo_components/genemo-tab-cards/genemo-tab-cards.html">
	<?php } ?>
	<link rel="import" href="components/genemo_components/genemo-card/genemo-card.html">
	<link rel="import" href="components/genemo_components/genemo-styles.html">
	<link rel="import" href="components/bower_components/paper-button/paper-button.html">
	<link rel="import" href="components/bower_components/paper-dialog/paper-dialog.html">
	<link rel="import" href="components/bower_components/google-youtube/google-youtube.html">
	<link rel="import" href="components/bower_components/paper-tooltip/paper-tooltip.html">
	<link rel="import" href="components/bower_components/iron-signals/iron-signals.html">
	<link rel="import" href="components/bower_components/iron-icons/iron-icons.html">
	<link rel="import" href="components/bower_components/iron-icons/notification-icons.html">
	<style is="custom-style" include="genemo-shared-styles"></style>
	<script type="text/javascript">
		
		$( document ).ready( function () {

			<?php echo $genemoOn? "": "UI.initNavSidebar();"; ?>
			resize_tbody();

			jQuery( function () {
				jQuery( ".geneNameInsert" ).hide();
				jQuery( ".geneNameExpander" ).click( function ( event ) {
					jQuery( this.nextElementSibling ).toggle();
					jQuery( this.nextElementSibling ).position().left = jQuery( this ).position().left + jQuery( this ).width() -
						jQuery( this.nextElementSibling ).width();
					jQuery( this.nextElementSibling ).position().top = jQuery( this ).position().top;
					event.stopPropagation();
				} );
				jQuery( ".geneNameInsert" ).click( function ( event ) {
					jQuery( this ).hide();
					event.stopPropagation();
				} );
			} );

		} );

		window.addEventListener( "WebComponentsReady", function ( e ) {
			fireCoreSignal( 'content-dom-ready', null );
			var searchCard = document.querySelector( '#searchCard' );
			if ( searchCard ) {
				searchCard.addEventListener( 'submit-form', validateUploadFileOrURL );
			}

			var manualBtn = document.querySelector( '#manualBtn' );
			if ( manualBtn ) {
				manualBtn.addEventListener( 'click', window.open.bind( window, 'cpbrowser/manual_genemo.php', '_blank' ) );
			}
			var videoBtn = document.querySelector( '#videoBtn' );
			if ( videoBtn ) {
				var videoDialog = document.querySelector( '#videoDialog' );
				var videoPlayer = document.querySelector( '#videoPlayer' );
				if ( videoDialog ) {
					videoDialog.addEventListener( 'iron-overlay-opened', function ( e ) {
						if ( videoPlayer && videoPlayer.playsupported ) {
							videoPlayer.play();
						}
					} );
					videoDialog.addEventListener( 'iron-overlay-closed', function ( e ) {
						if ( videoPlayer && videoPlayer.playsupported ) {
							videoPlayer.pause();
						}
					} );
					videoBtn.addEventListener( 'click', videoDialog.open.bind( videoDialog ) );
				}
			}
			var engBtn = document.querySelector( '#engBtn' );
			if ( engBtn ) {
				engBtn.addEventListener( 'click', setTexts.bind( window, "en" ) );
			}

			var zhBtn = document.querySelector( '#zhBtn' );
			if ( zhBtn ) {
				zhBtn.addEventListener( 'click', setTexts.bind( window, "zh" ) );
			}

			encodeMeta = new MetaEntries();
			Polymer.dom( document.documentElement ).appendChild( encodeMeta );

			document.addEventListener( 'alert', function ( e ) {
				UI.alert( e.detail.msg );
			} );
			document.addEventListener( 'species-changed', function ( e ) {
				toggleWindow( 'trackSelect', 'hide' );
				if ( document.querySelector( 'genemo-track-filter' ) ) {
					document.querySelector( 'genemo-track-filter' ).initialize( e.detail.newRef, expMap, cellLineMap, tissueMap, labMap );
				}
			} );
			document.addEventListener( 'toggle-window', function ( e ) {
				toggleWindow( 'trackSelect', e.detail.action );
			} );
			document.addEventListener( 'species-ready', function ( e ) {
				allSpeciesDoneCheck( spcArray, cmnTracks, cmnTracksEncode );
			} );
			document.addEventListener( 'filter-tracks', function ( e ) {
				filterTracksFromList( e.detail.map, e.detail.flags );
			} );

			<?php
	// this is loading part
	if($sessionInfo) {
?>
			var sessionObj = new Object();
			sessionObj.id = '<?php echo $sessionInfo['
			id ']; ?>';
			sessionObj.db = '<?php echo $sessionInfo['
			db ']; ?>';
			sessionObj.list = '<?php echo $sessionInfo['
			selected_tracks ']; ?>';
			sessionObj.urlToShow = '<?php echo $sessionInfo['
			display_file_url ']; ?>';
			sessionObj.originalFile = '<?php echo ($sessionInfo['
			original_file_name ']? $sessionInfo['
			original_file_name ']: basename($sessionInfo['
			display_file_url '])); ?>';
			sessionObj.hasDisplay = <?php echo ((strpos($sessionInfo['display_file_url'], $sessionInfo['id']) !== false) || (strpos($sessionInfo['display_file_url'], $sessionInfo['original_file_name']) !== false))? 'false': 'true'; ?>;
			sessionObj.searchRange = '<?php echo trim($sessionInfo['
			search_range ']); ?>';

			fireCoreSignal( 'updatecontent', {
				sessionObj: sessionObj
			} );

			for ( var i = 0; i < spcArray.length; i++ ) {
				spcArray[ i ].isActive = ( spcArray[ i ].db == sessionObj.db );
			}
			spcArray.updateAllSpcActiveNum();

			trackUpdatedCallback.func = loadResults;
			trackUpdatedCallback.data = sessionObj;
			<?php		
	} elseif(isset($sessionError)) {
?>
			trackUpdatedCallback.func = function ( data ) {
				UI.alert.call( UI, data );
			};
			trackUpdatedCallback.data = '<?php echo $sessionError; ?>';
			<?php		
	}
?>
		} );
	</script>

</head>

<body unresolved class="fullbleed layout vertical">
	<?php include_once(realpath(dirname(__FILE__) . '/../includes/analyticstracking.php')); ?>
	<div id="genemo-container">
		<div id="sidebar1">
			<a href="./genemo-index.php" target="_self"><img id="genemoLogo" src="genemo-assets/images/GenemoLogo.svg" alt="GENEMO Logo" border="0" /></a>
			<genemo-card collapse-group='query-search'></genemo-card>

		</div>
	</div>
	<cell-line-info-card></cell-line-info-card>
</body>

</html>