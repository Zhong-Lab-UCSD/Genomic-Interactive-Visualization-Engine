<?php
	require_once (realpath(dirname(__FILE__) . "/../includes/session.php"));
	return json_encode(loadGenemoSession($_REQUEST['sessionID']));