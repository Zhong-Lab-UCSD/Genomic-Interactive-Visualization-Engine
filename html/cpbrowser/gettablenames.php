<?php
	require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
	$mysqli = connectCPB();
	$result = array();
	foreach($_REQUEST as $key=>$val) {
		// $key is db name, $val should be an json_encoded array of tables
		$tables = json_decode($val);
		foreach($tables as $entry) {
			$generesult = $mysqli->query("SELECT tableName FROM `TrackInfo` WHERE `db` = '" 
				. $mysqli->real_escape_string($key) . "' AND (`tableName` = '"
				. $mysqli->real_escape_string($entry) . "' OR `superTrack` = '"
				. $mysqli->real_escape_string($entry) . "') ORDER BY `shortLabel`");
			if($generesult->num_rows > 0) {
				$result[$entry] = array();
				while($row = $generesult->fetch_assoc()) {
					$result[$entry] []= $row["tableName"];
				}
			}
		}
	}
	echo json_encode($result);
	$generesult->free();
	$mysqli->close();
?>