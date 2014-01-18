<?php
	// TODO: change the include path, then rename this file to "constants.php" when deploying
    define('CLASS_DIR', '/usr/include/classes/');
    set_include_path(get_include_path() . PATH_SEPARATOR . CLASS_DIR);
    spl_autoload_extensions('.class.php');
    spl_autoload_register();
	
	define("bpTreeSig", 0x78CA8C91);
	define("cirTreeSig", 0x2468ACE0);
?>