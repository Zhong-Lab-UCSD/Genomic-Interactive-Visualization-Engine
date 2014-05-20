<?php
	require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
	$mysqli = connectCPB();
	$result = array();
	foreach($_REQUEST as $key=>$val) {
		//error_log($key . "||" . $val);
		$generesult = $mysqli->query("SELECT * FROM `TrackInfo` WHERE `db` = '" 
			. $mysqli->real_escape_string($key) . "' AND (`tableName` = '"
			. $mysqli->real_escape_string($val) . "' OR `superTrack` = '"
			. $mysqli->real_escape_string($val) . "') ORDER BY `shortLabel`");
		if($generesult->num_rows <= 0) {
			$result["(none)"] = "none";
			//die(json_encode($result));
		} else {
			while($row = $generesult->fetch_assoc()) {
				$typeString = $row["type"];
				$result[$row["db"] . "__" . $row["tableName"]]
					= $row["shortLabel"] . "||" . strtok($typeString, " ")
					. "||" . $row["longLabel"];
			}
		}
	}
	echo json_encode($result);
	$generesult->free();
	$mysqli->close();
?>