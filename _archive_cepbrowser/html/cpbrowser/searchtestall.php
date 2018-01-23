<?php
	require_once (realpath(dirname(__FILE__) . '/../../includes/common_func.php'));	
	require_once (realpath(dirname(__FILE__) . "/../../includes/session.php"));
	
	$res = initialize_session();
	$encodeOn = $res['encodeOn'];
	$in_debug = $res['in_debug'];
	$genemoOn = $res['genemoOn'];
	unset($res);
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>Untitled Document</title>
<link href="mainstyles.css" rel="stylesheet" type="text/css" />
<script type="text/javascript" src="js/jquery-1.7.js"></script>
<script language="javascript">
function validate_form() {
	// Now is the real Ajax part.
	if($("#allDataSingleRegion").val() != "on") {
		var postdata = {};
	//	speciesDbName = new Array();
		$.each($('#searchform').serializeArray(), function(i, field) {
	//		if($('#' + field.name).is("checkbox")) {
	//			speciesDbName.push(field.name);
	//		}
			postdata[field.name] = field.value;
			});
		$.post("regionsearch.php<?php echo $in_debug? "?Debug=XCDebug": ""; ?>", postdata, function (data) {
			$("#contentHolder").html(data);
		});
		return false;
	} else {
		return true;
	}
}

function downloadAll() {
	// Now is the real Ajax part.
//	speciesDbName = new Array();
	$("#allDataSingleRegion").val("on");
	$("#searchform").submit();
	$("#allDataSingleRegion").val("off");
}
</script>
</head>

<body>
<form target="_blank" id="searchform" name="searchform" method="post" action="regionsearch.php" onsubmit="return validate_form();">
  <p>
    <label for="wigfile">wigFile</label>
    <br />
    <textarea name="wigfile" cols="100" rows="5" id="wigfile">
<?php  
	$mysqli = connectGB("mm9");
	$trackResult = $mysqli->query("SELECT tableName FROM trackDb WHERE grp = 'encode' AND tableName NOT LIKE '%super%'");
	while($currentTrack = $trackResult->fetch_assoc()) {
		$trackURL = $mysqli->query("SELECT fileName FROM `" . $currentTrack["tableName"] . "`");
		$track = $trackURL->fetch_assoc();
		echo $track["fileName"] . "\n";
		$trackURL->free();
	}
	$trackResult->free();
?>
    </textarea>
    <br />
    <label for="region">Region<br />
    </label>
    <textarea name="region" id="region" cols="100" rows="5">chr1:12345678-12456789</textarea>
  </p>
  <p>
    <input name="allDataSingleRegion" type="hidden" id="allDataSingleRegion" value="off" />
    <input type="submit" />
    <input type="button" value="Download" onclick="downloadAll();" />
  </p>
</form>
<div id="contentHolder"></div>
</body>
</html>