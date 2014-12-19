<?php
	session_start();
	if(!isset($_SESSION['hgsIDs'])) {
		$_SESSION['hgsIDs'] = array();
	}
	$_SESSION['hgsIDs'][$_REQUEST['db']] = $_REQUEST['hgsID'];
?>