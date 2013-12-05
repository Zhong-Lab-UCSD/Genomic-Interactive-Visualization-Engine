<?php
	$mysqli = new mysqli('localhost', 'genomebrowser', 'ucscgbrowser', $_POST['db']);
	if($mysqli->connect_errno) {
		die("Connect failed:" . $mysqli->connect_error);
	}
//	$conn = mysql_connect('localhost', 'genomebrowser', 'ucscgbrowser');
//	if(empty($conn)) {
//		die("Comparison database is not ready.");
//	}
//	$db = mysql_select_db($_POST['db'], $conn);
//	if(empty($db)) {
//		die("Comparison database is not ready.");
//	}
?>