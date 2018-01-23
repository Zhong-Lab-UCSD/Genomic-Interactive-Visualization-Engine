<?php
	require_once (realpath(dirname(__FILE__) . '/../../includes/common_func.php'));	
	require_once (realpath(dirname(__FILE__) . "/../../includes/session.php"));
	$res = initialize_session();
	$encodeOn = $res['encodeOn'];
	$in_debug = $res['in_debug'];
	$genemoOn = $res['genemoOn'];
	unset($res);

	$mysqli = connectCPB();
	$filenamearray = explode("__", trim($_REQUEST['file']));
	$filename = $filenamearray[1];
	$dbname = $filenamearray[0];
	// Need to check if the file is in database
	$stmt = $mysqli->prepare("SELECT * FROM `TrackInfo` WHERE `db` = ? AND `tableName` = ?");
	$stmt->bind_params('ss', $dbname, $filename);
	$stmt->execute();
	$generesult = $stmt->get_result();
	if($generesult->num_rows <= 0) {
		// The filename is either tampered or something else
		header("HTTP/1.0 404 Not Found");
		include(realpath(dirname(__FILE__) . "/error-docs/error-404.html"));
	} else {
		$resulttoken = $generesult->fetch_assoc();
		//error_log($resulttoken['file']);
		if(!$resulttoken['url']) {
			// it's local file
			error_log($resulttoken['file']);
			header("X-Sendfile: " . $resulttoken['file']);
			header("Content-type: application/gzip-compressed");
			header('Content-Disposition: attachment; filename="' . $dbname 
				. "_" . str_replace(" ", "_", $resulttoken['shortLabel']) . "." 
				. strtolower(substr($resulttoken["type"], 0, 3)) . '.gz"');
		} else {
			// it's url, use redirect
			header("Location: " . $resulttoken['file'], true, 303);
		}
	}
	$generesult->free();
	$mysqli->close();
?>