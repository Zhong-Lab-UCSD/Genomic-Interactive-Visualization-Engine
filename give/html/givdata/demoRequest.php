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
// (use CREATE DATABASE IF NOT EXISTS to prevent known suffixes),
// returning database name.

require_once(realpath(dirname(__FILE__) . "/../../includes/demo_func.php"));

$result = array();
$req = getRequest();    // this also handle CORS preflights

$user = getDemoUser($req['token']);
$db = getDemoDataBase($user, $req['suffix']);

$result['username'] = $user['username'];
$result['pass'] = $user['pass'];
$result['token'] = $user['token'];
$result['db'] = $db;

header('Content-Type: application/json');
echo json_encode($result);
