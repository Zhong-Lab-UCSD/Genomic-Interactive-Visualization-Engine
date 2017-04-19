<?php
// This file is used to request demo user, demo password, and demo database
// If no token is supplied or token does not exist in table,
//    create a random stem (3-bytes hexadecimal string)
//    a new user ('demo_' + stem), a corresponding token (32-bytes hexadecimal string),
//    a database prefix ('demo_' + stem)
//    a password (another 32-bytes hexadecimal string,
//      this is used in creating the user only, not stored in any table)
// If a user token is supplied, check whether the token is already in demo table
//    If so, then do not generate a new user,
// A new database needs to be generated with
// (use CREATE DATABASE IF NOT EXISTS to prevent known suffixes)
require_once(realpath(dirname(__FILE__) . "/common_func.php"));

function connectDemoDb() {
  $mysqli = new mysqli(DEMO_HOST, DEMO_USER, DEMO_PASS);
  if($mysqli->connect_errno) {
    die("Connect failed:" . $mysqli->connect_error);
  }
  if(!$mysqli->select_db('demo')) {
    error_log("(DemoDaemon) DB does not exist: demo");
    die();
  }
  return $mysqli;
}

function getDemoUser($token) {

  $user = [];
  $mysqli = connectDemoDb();
  if (isset($token)) {
    // try to see if token is defined in the table
    $sqlstmt = "SELECT * FROM demoUsers WHERE token = ?";
    $stmt = $mysqli->prepare($sqlstmt);
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $users = $stmt->get_result();
    if ($users->num_rows > 0) {
      // known user
      $knownUser = $users->fetch_assoc();
      $user['username'] = 'demo_' . $knownUser['stem'];
      $user['stem'] = $knownUser['stem'];
      $user['token'] = $knownUser['token'];
      $users->free();
      $mysqli->close();
      return $user;
    }
  }

  // token not exist or new user

  define('DEMO_USER_NAME_LENGTH', 2);
  define('DEMO_USER_TOKEN_LENGTH', 32);
  define('DEMO_USER_PASS_LENGTH', 32);
  define('MAX_FAILURES', 32);

  $newUserToken = bin2hex(openssl_random_pseudo_bytes(DEMO_USER_TOKEN_LENGTH));
  $sqlstmt = "INSERT INTO demoUsers VALUES(?, ?)";
  $newStem = "";
  $stmt = $mysqli->stmt_init();
  $stmt->prepare($sqlstmt);
  $stmt->bind_param('ss', $newUserToken, $newStem);
  $failCount = 0;
  do {
    $failCount ++;
    if ($failCount > MAX_FAILURES) {
      // failed too many times
      throw new Exception("Error Processing Request, error: " . $stmt->error, 1);
    }
    $newStem = bin2hex(openssl_random_pseudo_bytes(DEMO_USER_NAME_LENGTH));
  } while (!$stmt->execute());

  $stmt->close();

  $user['token'] = $newUserToken;
  $user['stem'] = $newStem;

  // User is in demoUsers, now create the User
  $newUserName = 'demo_' . $newStem;
  $newPass = bin2hex(openssl_random_pseudo_bytes(DEMO_USER_PASS_LENGTH));
  $sqlstmt = "CREATE USER '" .
    $mysqli->real_escape_string($newUserName) .
    "' IDENTIFIED BY '" . $mysqli->real_escape_string($newPass) .
    "'";
  if(!$mysqli->query($sqlstmt)) {
    throw new Exception("Error creating user, error: " . $mysqli->error, 1);
  }

  $user['username'] = $newUserName;
  $user['pass'] = $newPass;

  // grant privileges
  $sqlstmt = "GRANT ALL PRIVILEGES ON `demo\_" .
    $mysqli->real_escape_string($newStem). "%`.* TO '" . $newUserName .
    "'";
  if(!$mysqli->query($sqlstmt)) {
    throw new Exception("Error granting privileges, error: " . $mysqli->error, 1);
  }

  $sqlstmt = "GRANT SELECT, INSERT, UPDATE ON `compbrowser`.`ref` TO '" . $newUserName .
    "'";
  if(!$mysqli->query($sqlstmt)) {
    throw new Exception("Error granting privileges, error: " . $mysqli->error, 1);
  }

  $mysqli->close();

  return $user;

}

function getDemoDataBase($user, $prefix) {
  $db = 'demo_' . $user['stem'];
  $mysqli = connectDemoDb();
  if(isset($prefix) && $mysqli->real_escape_string($prefix)) {
    $db .= '_' . $prefix;
  }
  $db = $mysqli->real_escape_string($db);

  $sqlstmt = "CREATE DATABASE IF NOT EXISTS `" . $db. "`";
  if(!$mysqli->query($sqlstmt)) {
    throw new Exception("Error creating database, error: " . $mysqli->error, 1);
  }

  $mysqli->close();
  return $db;
}
