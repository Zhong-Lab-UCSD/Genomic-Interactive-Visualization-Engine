<?php
	require_once (realpath(dirname(__FILE__) . '/../../includes/common_func.php'));	
	require_once (realpath(dirname(__FILE__) . "/../../includes/session.php"));
	
	$res = initialize_session();
	$encodeOn = $res['encodeOn'];
	$in_debug = $res['in_debug'];
	$genemoOn = $res['genemoOn'];
	unset($res);
	if(!isset($_SESSION['hgsIDs'])) {
		$_SESSION['hgsIDs'] = array();
	}
	$_SESSION['hgsIDs'][$_REQUEST['db']] = $_REQUEST['hgsID'];
?>