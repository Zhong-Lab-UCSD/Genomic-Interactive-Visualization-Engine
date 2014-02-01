<?php
	// TODO: change the include path, then rename this file to "constants.php" when deploying
	// Also mysql user and passwords
	// This file will not be pushed onto Github
	
	define('CPB_HOST', 'CPB_HOST');
	define('CPB_USER', 'CPB_USER');
	define('CPB_PASS', 'CPB_PASS');
	
	define('GB_HOST', 'GB_HOST');
	define('GB_USER', 'GB_USER');
	define('GB_PASS', 'GB_PASS');
	
    define('CLASS_DIR', '/usr/include/classes/');
    set_include_path(get_include_path() . PATH_SEPARATOR . CLASS_DIR);
    spl_autoload_extensions('.class.php');
    spl_autoload_register();
	
	define("bpTreeSig", 0x78CA8C91);
	define("cirTreeSig", 0x2468ACE0);
?>