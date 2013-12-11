<?php
	// First get an array of posts, showing the database and trackDb name
	require('../../includes/session.php');	
	// notice that this needs to be commented out after debug to improve performance
	
	require("../../includes/db/opendbcpb.php");
	// open the genome browser database
	
	$generesult = $mysqli->query("SELECT * FROM (SELECT * FROM `alias` WHERE `alias` LIKE '" 
		. $mysqli->real_escape_string($_REQUEST['name']) 
		. "%' ORDER BY `isGeneName` DESC, `genename`) as `T` GROUP BY `genename`");
	$result = array();
	if($generesult->num_rows <= 0) {
		$result["(none)"] = "none";
		//die(json_encode($result));
	} else {
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
	}
	echo json_encode($result);
	$generesult->free();
	
	require("../../includes/db/closedb.php");

?>