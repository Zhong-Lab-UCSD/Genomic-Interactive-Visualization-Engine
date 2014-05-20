<?php
	require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
	$mysqli = connectCPB();
	$filenamearray = explode("__", $mysqli->real_escape_string($_REQUEST['file']));
	$filename = $filenamearray[1];
	$dbname = $filenamearray[0];
	// Need to check if the file is in database
	$generesult = $mysqli->query("SELECT * FROM `TrackInfo` WHERE `db` = '"
		. $dbname . "' AND `tableName` = '" 
		. $filename . "'");
	if($generesult->num_rows <= 0) {
		// The filename is either tampered or something else
		header("HTTP/1.0 404 Not Found");
		include(realpath(dirname(__FILE__) . "/error-docs/error-404.html"));
	} else {
		$resulttoken = $generesult->fetch_assoc();
		//error_log($resulttoken['file']);
		if(!$resulttoken['url']) {
			// it's local file
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