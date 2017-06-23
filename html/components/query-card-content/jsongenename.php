<?php
	// First get an array of posts, showing the database and trackDb name
	require_once(realpath(dirname(__FILE__) . "/../../../../includes/common_func.php"));
	// notice that this needs to be commented out after debug to improve performance
	
	define('MAX_JSON_NAME_ITEMS', 100);
	define('MIN_JSON_QUERY_LENGTH', 2);
	
	$mysqli = connectCPB();
	$result = array();
	// open the genome browser database
	if(strlen($mysqli->real_escape_string($_REQUEST['name'])) >= MIN_JSON_QUERY_LENGTH) {
		$generesult = $mysqli->query("SELECT * FROM (SELECT * FROM `alias` WHERE `alias` LIKE '" 
			. $mysqli->real_escape_string($_REQUEST['name']) 
			. "%' ORDER BY `isGeneName` DESC, `genename`) as `T` GROUP BY `genename`");
		if($generesult->num_rows <= 0) {
			$result["(none)"] = "none";
			//die(json_encode($result));
		} else if($generesult->num_rows <= MAX_JSON_NAME_ITEMS) {
			while($row = $generesult->fetch_assoc()) {
				if(!empty($result[$row["alias"]])) {
					$suffix = 1;
					while(!empty($result[$row["alias"] . "__" . $suffix])) {
						$suffix++;
					}
					$result[$row["alias"] . "__" . $suffix] = $row["genename"];
				} else {
					$result[$row["alias"]] = $row["genename"];
				}
			}
		} else {
			// too many results
			$result["(too_many)"] = "too_many";
		}
		$generesult->free();
	}
	echo json_encode($result);
	
	$mysqli->close();

?>