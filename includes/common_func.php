<?php
require_once('constants.php');

function byteSwap32($data) {
	$arr = unpack("V", pack("N", $data));
	return $arr[1];
}
?>