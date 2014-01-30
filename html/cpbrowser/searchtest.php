<?php
	require_once(realpath(dirname(__FILE__) . "/../../includes/session.php"));
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>Untitled Document</title>
<script type="text/javascript" src="js/jquery-1.7.js"></script>
<script language="javascript">
function validate_form() {
	// Now is the real Ajax part.
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
}

</script>
</head>

<body>
<form id="searchform" name="searchform" method="post" action="" onsubmit="return validate_form();">
  <p>
    <label for="wigfile">wigFile</label>
    <br />
    <textarea name="wigfile" cols="100" rows="5" id="wigfile">http://hgdownload.cse.ucsc.edu/goldenPath/hg19/encodeDCC/wgEncodeBroadHistone/wgEncodeBroadHistoneA549H3k04me3Dex100nmSig.bigWig
http://hgdownload.cse.ucsc.edu/goldenPath/hg19/encodeDCC/wgEncodeBroadHistone/wgEncodeBroadHistoneA549H3k09acEtoh02Sig.bigWig
http://hgdownload.cse.ucsc.edu/goldenPath/hg19/encodeDCC/wgEncodeBroadHistone/wgEncodeBroadHistoneA549H3k09me3Etoh02Sig.bigWig
    </textarea>
  <br />
  <label for="region">Region<br />
  </label>
  <textarea name="region" id="region" cols="100" rows="5">chr1:12345678-12456789</textarea>
  </p>
  <p><input type="submit" name="submit" id="submit" value="Submit" />
  </p>
</form>
<div id="contentHolder"></div>
</body>
</html>