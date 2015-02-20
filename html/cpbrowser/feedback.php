<!DOCTYPE html>
<?php
require_once (realpath(dirname(__FILE__) . "/../../includes/session.php"));
?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<link href='//fonts.googleapis.com/css?family=Noto+Sans|Roboto' rel='stylesheet' type='text/css'>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>CEpBrowser Feedback</title>
<link href="newstyle.css" rel="stylesheet" type="text/css">
<?php
	if(empty($_REQUEST)) {
		// new page, show something else
?>
<script type="text/javascript" src="js/jquery-1.7.js"></script>
<script type="text/javascript">

function validate_comment() {
	hasError = false;
	if($('#usrname').val().length <= 0) {
		$('#usrnameerror').css('display', 'inline-block');
		hasError = true;
	} else {
		$('#usrnameerror').css('display', 'none');
	}
	if($('#email').val().length > 0 && ($('#email').val().indexOf('@') <= 0 
		|| ($('#email').val().indexOf('@') >= $('#email').val().lastIndexOf('.') - 1))) {
			$('#emailerror').css('display', 'inline-block');
			hasError = true;
	} else {
		$('#emailerror').css('display', 'none');
	}
	if($('#comment').val().length <= 0 && $('#email').val().length <= 0) {
		$('#commenterror').css('display', 'inline-block');
		hasError = true;
	} else {
		$('#commenterror').css('display', 'none');
	}
	return !hasError;
}
</script>
</head>

<body>
<div class="commentformtext">
<form action="./feedback.php" method="post" name="form1" target="_self" onSubmit="return validate_comment();">
  <div><strong>Your feedback is very important to us!</strong> Please let us know what kind of function you would like to see in future developments, how you feel about CEpBrowser and any other thoughts you would like to share.</div>
  <div>
    <label for="usrname">Your name: </label>
    <input name="usrname" type="text" id="usrname" size="40" maxlength="255">
    <span id='usrnameerror' class="error"> Please enter your name. </span>
  </div>
  <div>
    <label for="usrname">Your institute (optional): </label>
    <input name="institute" type="text" id="institute" size="50" maxlength="500">
  </div>
  <div>
    <label for="email">Please kindly leave your email if you would like to keep informed of development updates (optional): </label>
  </div>
  <div>
    <input type="text" name="email" id="email">
    <span id='emailerror' class="error"> Please enter a valid email address or leave the box blank if you prefer not to. </span> </div>
  <div>
    <label for="comment">Please leave your comment below:</label>
    <textarea name="comment" id="comment"></textarea>
    <span id='commenterror' class="error"> Please provide your comment if you don't wish to provide your email. </span> </div>
  <div>
    <input type="submit" name="button" id="button" value="Send your comment">
    <div style="clear: both;"></div>
  </div>
</form>
<?php
	} else {
		// there are stuff, so put into the database and display thanks message
		$mysqli = connectCPB();
		$stmt = $mysqli->prepare("INSERT INTO comments (name, institute, email, comment) VALUES (?, ?, ?, ?)");
		$stmt->bind_param('ssss', 
						  trim($_REQUEST['usrname']),
						  trim($_REQUEST['institute']),
						  trim($_REQUEST['email']),
						  trim($_REQUEST['comment']));
?>
</head>

<body>
<div class="commentformtext">
  <?php
		if($stmt->execute()) {
			echo "Thank you for your feedback! Your submitted information is included below for your reference.";
		} else {
			error_log($mysqli->error);
			echo "We are unable to send your comment to the server, please send email to <a href='mailt&#111;&#58;x9%&#54;3%61o&#37;&#52;0%&#55;5&#99;s&#100;&#46;ed&#117;'>x9cao <strong>at</strong> ucsd <strong>dot</strong> edu</a> instead. We are sorry for the inconvenience. (Your original comment is attached below.)";
		}
		// sanitize strings for output
		foreach($_REQUEST as &$value) {
			$value = htmlspecialchars($value);
		}
			
		echo "<div><strong>Your name: </strong>" . $_REQUEST['usrname'] . "</div>";
		echo "<div><strong>Your institute: </strong>" . $_REQUEST['institute'] . "</div>";
		echo "<div><strong>Your email: </strong>" . $_REQUEST['email'] . "</div>";
		echo "<div><strong>Your comment: </strong></div><div>" . $_REQUEST['comment'] . "</div>";
		echo "<input type='button' name='close' id='close' value='Close window' onClick='window.close();'>";
	}
?>
</div>
</body>
</html>