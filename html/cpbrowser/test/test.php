<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>Untitled Document</title>
</head>
<?php 
require_once("../../includes/common_func.php");
function fseekable($stream) {
  $meta = stream_get_meta_data($stream);
  return $meta['seekable'];
}
?>
<body style="word-break: break-all;">
<?php
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, 'http://hgdownload.cse.ucsc.edu/goldenPath/mm9/encodeDCC/wgEncodeLicrHistone/wgEncodeLicrHistoneEse14H3k27acME0129olaStdSig.bigWig');
	curl_setopt($ch, CURLOPT_RANGE, '661-5562');
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	$result = curl_exec($ch);
	curl_close($ch);
	echo bin2hex($result);
	echo "<br />";
	echo "<br />";
	echo bin2hex(gzuncompress($result));
	
?>
</body>
</html>