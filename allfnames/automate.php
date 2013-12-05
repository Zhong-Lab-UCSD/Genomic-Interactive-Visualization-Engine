<?php
	//header("HTTP/1.0 200 OK");
	//header("Content-type: text/plain");
	$conn = mysql_connect('localhost', 'genomebrowser', 'ucscgbrowser');
	if(empty($conn)) {
		die("Comparison database is not ready.");
	}
	//ob_implicit_flush(true);
	$dbs = array("hg19", "mm9", "susScr2");
	echo("Starting...\n");
	flush();
	foreach($dbs as $dbname) {
		echo($dbname . "\n");
		$db = mysql_select_db($dbname, $conn);
		if(empty($db)) {
			die("Comparison database is not ready.");
		}
		$res = mysql_query("SELECT tableName FROM trackDb WHERE grp = 'lab'");
		while($trackitor = mysql_fetch_assoc($res)) {
			$resfilename = mysql_query("SELECT DISTINCT file from `" . $trackitor["tableName"] . "`");
			while($fnameitor = mysql_fetch_assoc($resfilename)) {
				echo($trackitor["tableName"] . "\t" . 
					str_replace(".wib", ".gz", str_replace("/gbdb/" . $dbname . "/wib/", "", $fnameitor["file"]))
					. "\n");
				flush();
			}
		}
		unset($db);
	}
	echo("done.\n");
	mysql_close($conn);
	unset($conn);
	//ob_implicit_flush(false);
?>
