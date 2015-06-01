<?php
	require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
	$mysqli = connectCPB();
	$result = array();
	foreach($_REQUEST as $key=>$val) {
		$stmt = $mysqli->prepare("SELECT * FROM `TrackInfo` WHERE `db` = ? AND (`tableName` = ? OR `superTrack` = ?) ORDER BY `shortLabel`");
		$stmt->bind_param('sss', $key, $val, $val);
		$stmt->execute();
		$generesult = $stmt->get_result();
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
		$generesult->free();
		$stmt->close();
	}
	echo json_encode($result);
	$mysqli->close();
?>