<?php

	// this file is for reading chromosome lengths and centromeme locations
	// input will be database name ("mm9" or "hg19" or others)
	// currently the return format will be JSON chromosome information
	// may incorporate other data (such as chromosomal bands) in the future

	require_once(realpath(dirname(__FILE__) . "/../../../../../includes/common_func.php"));
	
	if(isset($_REQUEST['db'])) {
		$mysqli = connectGB($_REQUEST['db']);
		if($mysqli) {
			$chromIdeos = $mysqli->query("SELECT * FROM cytoBandIdeo");
			if($chromIdeos && $chromIdeos->num_rows > 0) {
				
			}
		}
	}
?>