<?php
	session_start();
	require_once('common_func.php');	
	$in_debug = false;
	if(strpos(getenv('SERVER_NAME'), 'encode') !== false) {
		$encodeOn = true;
		$_SESSION["Encode"] = "XCEncode";
	} else if(strpos(getenv('SERVER_NAME'), '132.239.135.28') !== false) {
		// testing server
		if(isset($_REQUEST["Encode"])) {
			// Encode command is attached
				$encodeOn = ($_REQUEST["Encode"] == "XCEncode");
				$_SESSION["Encode"] = $_REQUEST["Encode"];
		} else {
			// Encode command is not attached
			if(isset($_SESSION["Encode"])) {
				$encodeOn = ($_SESSION["Encode"] == "XCEncode");
				if(!$encodeOn) {
					unset($_SESSION["Encode"]);
				}
			} else {
				$encodeOn = false;
			}
		}
	} else {
		$encodeOn = false;
	}
	if((isset($_SESSION["Debug"]) && $_SESSION["Debug"] == "XCDebug") 
		|| (isset($_REQUEST["Debug"]) && $_REQUEST["Debug"] == "XCDebug")) {
			$in_debug = true;
			$_SESSION["Debug"] = "XCDebug";
	}
	if(isset($_COOKIE['NoTipTrackSettings'])) {
		// update the cookie so that it doesn't expire
		setcookie('NoTipTrackSettings', $_COOKIE['NoTipTrackSettings'], time() + 60*60*24*365*2, "/");
	}
	if(isset($_COOKIE['NoTipDomainChange'])) {
		// update the cookie so that it doesn't expire
		setcookie('NoTipDomainChange', $_COOKIE['NoTipDomainChange'], time() + 60*60*24*365*2, "/");
	}
	define ("max_session_id", 200000000);
	
	require("db/opendbcpb.php");
	
	// get session ID from database
	if(!isset($_SESSION['ID'])) {
		$mysqli->query("DELETE FROM sessions WHERE DATE_SUB(NOW(), INTERVAL 20 HOUR) >= lastactive");
		$existing_ids = $mysqli->query("SELECT sessionID FROM sessions ORDER BY sessionID DESC LIMIT 1");
		$max_current_id = $existing_ids->fetch_assoc();
		if($max_current_id) {
			$new_id = 0;
			if($max_current_id["sessionID"] + 1 > max_session_id) {
				// max_session_id exceeded, find the smallest id available
				$existing_asc_ids = $mysqli->query("SELECT sessionID FROM sessions ORDER BY sessionID");
				do {
					$new_id++;
					$current_id = $existing_asc_ids->fetch_assoc();
				} while($current_id && $current_id["sessionID"] == $new_id);
				$existing_asc_ids->free();
			} else {
				$new_id = $max_current_id["sessionID"] + 1;
			}
			$_SESSION['ID'] = $new_id;
		} else {
			$_SESSION['ID'] = 1;
		}
		$existing_ids->free();
		$_SESSION['resetView'] = true;
	}
	// update sessionID time
	$mysqli->query("INSERT INTO sessions (sessionID, lastactive, ip) VALUES (" 
		. $_SESSION['ID'] . ", NOW(), '" . $_SERVER['REMOTE_ADDR'] 
		. "') ON DUPLICATE KEY UPDATE lastactive = NOW(), ip = '" . $_SERVER['REMOTE_ADDR'] . "'");
	
//	if(!isset($_SESSION['ID'])) {
//		mysql_query("DELETE FROM sessions WHERE DATE_SUB(NOW(), INTERVAL 20 HOUR) >= lastactive");
//		$existing_ids = mysql_query("SELECT sessionID FROM sessions ORDER BY sessionID DESC LIMIT 1");
//		$max_current_id = mysql_fetch_assoc($existing_ids);
//		if($max_current_id) {
//			$new_id = 0;
//			if($max_current_id["sessionID"] + 1 > max_session_id) {
//				// max_session_id exceeded, find the smallest id available
//				$existing_asc_ids = mysql_query("SELECT sessionID FROM sessions ORDER BY sessionID");
//				do {
//					$new_id++;
//					$current_id = mysql_fetch_assoc($existing_asc_ids);
//				} while($current_id && $current_id["sessionID"] == $new_id);
//				mysql_free_result($existing_asc_ids);
//			} else {
//				$new_id = $max_current_id["sessionID"] + 1;
//			}
//			$_SESSION['ID'] = $new_id;
//		} else {
//			$_SESSION['ID'] = 1;
//		}
//		mysql_free_result($existing_ids);
//		$_SESSION['resetView'] = true;
//	}
//	// update sessionID time
//	mysql_query("INSERT INTO sessions (sessionID, lastactive, ip) VALUES (" . $_SESSION['ID'] . ", NOW(), '" . $_SERVER['REMOTE_ADDR'] . "') ON DUPLICATE KEY UPDATE lastactive = NOW(), ip = '" . $_SERVER['REMOTE_ADDR'] . "'");
//	
//	unset($db);
	require("db/closedb.php");

?>