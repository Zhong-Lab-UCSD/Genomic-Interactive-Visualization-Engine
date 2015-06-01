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
	define('GOOGLE_ANALYTICS_ACCOUNT', 'GOOGLE_ANALYTICS_ACCOUNT');
	
    set_include_path(get_include_path() . PATH_SEPARATOR . CLASS_DIR);
    spl_autoload_extensions('.class.php');
    spl_autoload_register();
	
	define('MAX_UPLOAD_FILE_SIZE', 10000000);
	define('CUSTOMTRACK_UCSC', '/cgi-bin/hgCustom');

?>