<?php
	require_once(realpath(dirname(__FILE__) . '/common_func.php'));	
	
	function initialize_session() {
		session_start();
		$result = array();
		$result['in_debug'] = false;
		$result['persistEncode'] = false;
		
		if(strpos(getenv('SERVER_NAME'), 'genemo') !== false) {
			$result['genemoOn'] = true;
			$_SESSION["Genemo"] = "XCGenemo";
		} else if(strpos(getenv('SERVER_NAME'), '132.239.135.28') !== false || strpos(getenv('SERVER_NAME'), 'szbio.ucsd.edu') !== false) {
			// testing server
			if(isset($_REQUEST["Genemo"])) {
				// Encode command is attached
					$result['genemoOn'] = ($_REQUEST["Genemo"] == "XCGenemo");
					$_SESSION["Genemo"] = $_REQUEST["Genemo"];
					unset($_REQUEST["Genemo"]);
			} else {
				// Encode command is not attached
				if(isset($_SESSION["Genemo"])) {
					$result['genemoOn'] = ($_SESSION["Genemo"] == "XCGenemo");
					if(!$result['genemoOn']) {
						unset($_SESSION["Genemo"]);
					}
				} else {
					$result['genemoOn'] = false;
				}
			}
		} else {
			$result['genemoOn'] = false;
		}
		
		if($result['genemoOn'] && isset($_REQUEST['exp']) && $_REQUEST['exp'] == "XCExp") {
			$result['experimental'] = true;
		}
		
		if($result['genemoOn'] || strpos(getenv('SERVER_NAME'), 'encode') !== false) {
			$result['encodeOn'] = true;
			$_SESSION["Encode"] = "XCEncode";
		} else if(strpos(getenv('SERVER_NAME'), '132.239.135.28') !== false || strpos(getenv('SERVER_NAME'), 'szbio.ucsd.edu') !== false) {
			// testing server
			if(isset($_REQUEST["Encode"])) {
				// Encode command is attached
					$result['encodeOn'] = ($_REQUEST["Encode"] == "XCEncode");
					$_SESSION["Encode"] = $_REQUEST["Encode"];
					unset($_REQUEST["Encode"]);
			} else {
				// Encode command is not attached
				if(isset($_SESSION["Encode"])) {
					$result['encodeOn'] = ($_SESSION["Encode"] == "XCEncode");
					if(!$result['encodeOn']) {
						unset($_SESSION["Encode"]);
					}
				} else {
					$result['encodeOn'] = false;
				}
			}
		} else {
			$result['encodeOn'] = false;
		}
		
		
		$result['persistEncode'] = $result['encodeOn'];
		if((isset($_SESSION["Debug"]) && $_SESSION["Debug"] == "XCDebug") 
			|| (isset($_REQUEST["Debug"]) && $_REQUEST["Debug"] == "XCDebug")) {
				$result['in_debug'] = true;
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
		
		$mysqli = connectCPB();
		
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
		$stmt = $mysqli->prepare("INSERT INTO sessions (sessionID, lastactive, ip) VALUES (?, NOW(), ?) ON DUPLICATE KEY UPDATE lastactive = NOW(), ip = ?");
		$stmt->bind_param('iss', $_SESSION['ID'], $_SERVER['REMOTE_ADDR'], $_SERVER['REMOTE_ADDR']);
		$stmt->execute();
		
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
		$mysqli->close();
		return $result;
	}
	
	function loadGenemoSession($sessionID) {
		// get session info (raw php object)
		$mysqli = connectCPB();
		$stmt = $mysqli->prepare("SELECT * FROM `userInput` WHERE `id` = ?");
		$sessionID = trim($sessionID);
		$stmt->bind_param('s', $sessionID);
		$stmt->execute();
		$sessionresult = $stmt->get_result();
		$sessionInfo = NULL;
		if($sessionresult->num_rows > 0) {
			$sessionInfo = $sessionresult->fetch_assoc();
			$sessionresult->free();
		} else {
			$stmt->close();
			$mysqli->close();
			throw new Exception("Invalid address or address expired.");
		}
		$stmt->close();
		$mysqli->close();
		return $sessionInfo;
	}
