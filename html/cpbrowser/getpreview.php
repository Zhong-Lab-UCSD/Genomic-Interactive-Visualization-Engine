<?php
	require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
	$mysqli = connectCPB();
	$result = array();
	$db = $_REQUEST['db'];
	$region = new ChromRegion(trim($_REQUEST['region']));
	$length = floatval($region->getLength());
	$tableName = $_REQUEST['tableName'];
	foreach($_REQUEST as $key=>$val) {
		//error_log($key . "||" . $val);
		$generesult = $mysqli->query("SELECT tableName FROM `TrackInfo` WHERE `db` = '" 
			. $mysqli->real_escape_string($db) . "' AND (`tableName` = '"
			. $mysqli->real_escape_string($tableName) . "' OR `superTrack` = '"
			. $mysqli->real_escape_string($tableName) . "') ORDER BY `shortLabel`");
		if($generesult->num_rows <= 0) {
			$result["(none)"] = "none";
			//die(json_encode($result));
		} else {
			$mysqligb = connectGB($db);
			while($row = $generesult->fetch_assoc()) {
				$trackURL = $mysqligb->query("SELECT fileName FROM `" . $row['tableName'] . "`");
				$track = $trackURL->fetch_assoc();
				$bwFile = NULL;
				try {
					$bwFile = new BigWigFile($track['fileName'], true);
				} catch (Exception $e) {
					error_log($e->getMessage());
				}
				$trackURL->free();
				if($bwFile) {
					$summaries = $bwFile->getSummaryStatsSingleRegion($region, 1);
					reset($summaries);
					$summary = current($summaries);
					if($summary->validCount > $length) {
						// sometimes this will happen, maybe need a better fix later, but for now just a brute fix
						$length = $summary->validCount;
					}
					$data = array();
					$data['length'] = $length;
					$data['validCount'] = floatval($summary->validCount);
					$data['sum'] = floatval($summary->sumData);
					$data['sumSquare'] = floatval($summary->sumSquares);
					$result[$row["tableName"]] = $data;
				} else {
					$result[$row["tableName"]] = false;
				}
				
			}
			$mysqligb->close();
		}
	}
	echo json_encode($result);
	$generesult->free();
	$mysqli->close();
?>