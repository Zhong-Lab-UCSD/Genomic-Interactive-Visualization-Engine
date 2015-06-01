<?php
	require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
	$mysqli = connectCPB();
	$result = array();
	foreach($_REQUEST as $key=>$val) {
		// $key is db name, $val should be an json_encoded array of tables
		$tables = json_decode($val);
		foreach($tables as $entry) {
			$stmt = $mysqli->prepare("SELECT tableName FROM `TrackInfo` WHERE `db` = ? AND (`tableName` = ? OR `superTrack` = ?) ORDER BY `shortLabel`");
			$stmt->bind_param('sss', $key, $entry, $entry);
			$stmt->execute();
			$generesult = $stmt->get_result();
			if($generesult->num_rows > 0) {
				$result[$entry] = array();
				while($row = $generesult->fetch_assoc()) {
					$result[$entry] []= $row["tableName"];
				}
			}
			$generesult->free();
			$stmt->close();
		}
	}
	echo json_encode($result);
	$mysqli->close();
?>