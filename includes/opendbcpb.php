<?php
	$mysqli = new mysqli('localhost', 'cpbrowser', 'compbr0wser5', 'compbrowser');
	if($mysqli->connect_errno) {
		die("Connect failed:" . $mysqli->connect_error);
	}
	//$conn = mysql_connect('localhost', 'cpbrowser', 'compbr0wser5');
//	if(empty($conn)) {
//		die("Comparison database is not ready.");
//	}
//	$db = mysql_select_db('compbrowser', $conn);
//	if(empty($db)) {
//		die("Comparison database is not ready.");
//	}
?>