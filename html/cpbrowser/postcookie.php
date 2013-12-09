<?php
	setcookie($_REQUEST['varName'], $_REQUEST['value'], time() + 60 * 60 * 24 * 365 * 2, "/");
?>