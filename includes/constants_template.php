<?php
  // TODO: change the include path, then rename this file to "constants.php" when deploying
  // Also mysql user and passwords
  // This file will not be pushed onto Github

  /**
   * Whether all server-side errors should be suppressed.
   * If this variable is defined, all server-side errors will be suppressed if they
   * have nothing to do with user input, and only general nature of the error
   * will be shown (such as "Database error").
   */
  # define('SUPPRESS_SERVER_ERRORS', 'TRUE');

  define('CPB_HOST', '<CPB_HOST>');
  define('CPB_USER', '<CPB_USER>');
  define('CPB_PASS', '<CPB_PASS>');

  define('CPB_EDIT_HOST', '[CPB_EDIT_HOST]');
  define('CPB_EDIT_USER', '[CPB_EDIT_USER]');
  define('CPB_EDIT_PASS', '[CPB_EDIT_PASS]');

  define('CLASS_DIR', '/usr/include/classes/');
  define('GOOGLE_ANALYTICS_ACCOUNT', '[GOOGLE_ANALYTICS_ACCOUNT]');

  define('CUSTOM_TRACK_TABLE_NAME', 'customTrackFiles');
  define('CUSTOM_TRACK_DB_NAME', 'customTrackDb');

  set_include_path(get_include_path() . PATH_SEPARATOR . CLASS_DIR);
  spl_autoload_extensions('.class.php');
  spl_autoload_register();

  define('MAX_UPLOAD_FILE_SIZE', 10000000);
