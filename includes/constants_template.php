<?php
  // TODO: change the include path, then rename this file to "constants.php" when deploying
  // Also mysql user and passwords
  // This file will not be pushed onto Github

  define('CPB_HOST', '<CPB_HOST>');
  define('CPB_USER', '<CPB_USER>');
  define('CPB_PASS', '<CPB_PASS>');

  define('CPB_EDIT_HOST', '[CPB_EDIT_HOST]');
  define('CPB_EDIT_USER', '[CPB_EDIT_USER]');
  define('CPB_EDIT_PASS', '[CPB_EDIT_PASS]');

  define('CLASS_DIR', '/usr/include/classes/');
  define('GOOGLE_ANALYTICS_ACCOUNT', 'GOOGLE_ANALYTICS_ACCOUNT');

  define('CUSTOM_TRACK_TABLE_NAME', 'customTrackFiles');
  define('CUSTOM_TRACK_DB_NAME', 'customTrackDb');

  set_include_path(get_include_path() . PATH_SEPARATOR . CLASS_DIR);
  spl_autoload_extensions('.class.php');
  spl_autoload_register();

  define('MAX_UPLOAD_FILE_SIZE', 10000000);
  define('CUSTOMTRACK_UCSC', '/cgi-bin/hgCustom');
