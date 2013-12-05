<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title></title>
<style type="text/css">
<!--
.style1 {
	color: #FFFFFF
}
.shortLabel {
	width: 80px;
}
.type {
	width: 120px;
}
.longLabel {
	width: 150px;
}
.priority {
	width: 70px;
}
.html {
	width: 300px;
}
.settings {
	width: 300px;
}
-->
</style>
<script language="javascript">
<!--
function setEnable(numbers) {
	var i=1;
	for(i=1; i<8; i++) {
		document.getElementById("input" + numbers + "_" + i).disabled = !document.getElementById("input" + numbers + "_0").checked;
	}	
}
-->
</script>
</head>
<body style="overflow: hidden;">
<div style="position: fixed; background: #FFFFFF; left: 0px; right: 0px; top: 0px; padding: 5px; z-index: 10;">
  <div style="float: left;">
    <form id="form2" name="form2" method="post" action="dbmanip.php">
      <label>
      <select name="db" id="db">
        <option value="mm9" selected="selected">mm9</option>
        <option value="hg19">hg19</option>
        <option value="susScr2">susScr2</option>
      </select>
      </label>
      <label>
      <input type="submit" name="Submit2" id="Submit2" value="Change database" />
      </label>
    </form>
  </div>
  <div style="float: left; overflow: auto;">
    <?php
	if(isset($_POST['db'])) {
		//echo $_POST['editflag']."<br />";
		require("../../../includes/opendbgb.php");
		if(isset($_POST['editflag'])) {
			// edit the content
			for($j=1; $j <= $_POST['num_of_tracks']; $j++) {
				if(isset($_POST['edit'.$j])) {
					$grp = 'LabPrivate';
					//echo $_POST['settings'.$j]."<br />";
					//echo addslashes(htmlspecialchars_decode($_POST['settings'.$j]));
					//echo addslashes(htmlspecialchars_decode($_POST['html'.$j]));
					if(isset($_POST['public'.$j])) {
						$grp = 'lab';
					}
					$mysqli->query("UPDATE trackDb SET shortLabel = '". $_POST['shortLabel'.$j] ."', type = '". $_POST['type'.$j] ."', longLabel = '". $_POST['longLabel'.$j] ."', priority = '". $_POST['priority'.$j] ."', html = '". addslashes(htmlspecialchars_decode(str_replace("\r\n", "\n", $_POST['html'.$j]))) ."', settings = '". addslashes(htmlspecialchars_decode(str_replace("\r\n", "\n", $_POST['settings'.$j]))) ."', grp = '" . $grp . "' WHERE tableName = '". $_POST['tableName'.$j] ."'");
					echo $_POST['tableName'.$j] . " has been updated. ";
				}
			}
		}
		
		$trackresult = $mysqli->query("SELECT tableName, shortLabel, type, longLabel, priority, html, settings, grp FROM trackDb WHERE grp = 'lab' OR grp = 'LabPrivate' ORDER BY priority");
		
?>
  </div>
</div>
<form id="form1" name="form1" method="post" action="dbmanip.php">
  <div style="position: absolute; top: 35px; width: 100%; z-index: 10; background: #FFFFFF;">
    <label>
    <input type="submit" name="SubmitUp" id="SubmitUp" value="Submit" />
    </label>
    <table style="width: 1244px; table-layout: fixed;" border="1" cellpadding="4" cellspacing="0" bordercolor="#003333">
      <tr>
        <th style="width: 21px;" bgcolor="#003333" scope="col"><span class="style1">Ed</span></th>
        <th style="width: 21px;" bgcolor="#003333" scope="col"><span class="style1">Pb</span></th>
        <th style="width: 81px; word-wrap: break-word;" bgcolor="#003333" scope="col">
        <span class="style1">tableName</span>
        </th>
        <th style="width: 81px;" bgcolor="#003333" scope="col"><span class="style1">shortLabel</span></th>
        <th style="width: 121px;" bgcolor="#003333" scope="col"><span class="style1">type</span></th>
        <th style="width: 151px;" bgcolor="#003333" scope="col"><span class="style1">longLabel</span></th>
        <th style="width: 71px;" bgcolor="#003333" scope="col"><span class="style1">priority</span></th>
        <th style="width: 301px;" bgcolor="#003333" scope="col"><span class="style1">html</span></th>
        <th style="width: 301px;" bgcolor="#003333" scope="col"><span class="style1">settings</span></th>
      </tr>
    </table>
  </div>
  <div style="clear: both; position: absolute; top: 93px; bottom: 40px; overflow: auto; left: 8px; right: 5px;">
    <input name="db" type="hidden" id="db" value="<?php echo $_POST['db']; ?>" />
    <input name="editflag" type="hidden" id="editflag" value="1" />
    <table style="overflow: hidden; width: 1244px; table-layout: fixed;" border="1" cellpadding="4" cellspacing="0" bordercolor="#003333">
      <!--<tr>
        <th style="width: 21px;" bgcolor="#003333" scope="col"><span class="style1">Ed</span></th>
        <th style="width: 21px;" bgcolor="#003333" scope="col"><span class="style1">Pb</span></th>
        <th style="width: 81px; word-wrap: break-word;" bgcolor="#003333" scope="col"><span class="style1">tableName</span></th>
        <th style="width: 81px;" bgcolor="#003333" scope="col"><span class="style1">shortLabel</span></th>
        <th style="width: 121px;" bgcolor="#003333" scope="col"><span class="style1">type</span></th>
        <th style="width: 151px;" bgcolor="#003333" scope="col"><span class="style1">longLabel</span></th>
        <th style="width: 71px;" bgcolor="#003333" scope="col"><span class="style1">priority</span></th>
        <th style="width: 301px;" bgcolor="#003333" scope="col"><span class="style1">html</span></th>
        <th style="width: 301px;" bgcolor="#003333" scope="col"><span class="style1">settings</span></th>
      </tr>-->
      <?php
  		$i=1;
  		while($trackitor = $trackresult->fetch_assoc()) {
  ?>
      <tr>
        <td style="width: 21px;"><label>
          <input type="checkbox" name="edit<?php echo $i; ?>" id="<?php echo "input".$i."_0"; ?>" onclick="<?php echo "setEnable(".$i.");"; ?>" />
          </label></td>
        <td style="width: 21px;"><label>
          <input type="checkbox" name="public<?php echo $i; ?>" id="<?php echo "input".$i."_7"; ?>" <?php 
	  if($trackitor["grp"] == "lab") echo "checked"; ?> disabled="disabled" />
          </label></td>
        <td style="word-wrap: break-word; width: 81px;"><input name="tableName<?php echo $i; ?>" type="hidden" id="tableName" value="<?php echo $trackitor["tableName"]; ?>" />
          <?php echo $trackitor["tableName"]; ?></td>
        <td style="width: 81px;"><label>
          <input name="shortLabel<?php echo $i; ?>" type="text" id="<?php echo "input".$i."_1"; ?>" class="shortLabel" value="<?php echo $trackitor["shortLabel"]; ?>" disabled="disabled" />
          </label></td>
        <td style="width: 121px;"><label>
          <input type="text" name="type<?php echo $i; ?>" id="<?php echo "input".$i."_2"; ?>" class="type" value="<?php echo $trackitor["type"]; ?>" disabled="disabled" />
          </label></td>
        <td style="width: 151px;"><label>
          <input type="text" name="longLabel<?php echo $i; ?>" id="<?php echo "input".$i."_3"; ?>" class="longLabel" value="<?php echo $trackitor["longLabel"]; ?>" disabled="disabled" />
          </label></td>
        <td style="width: 71px;"><label>
          <input type="text" name="priority<?php echo $i; ?>" id="<?php echo "input".$i."_4"; ?>" class="priority" value="<?php echo $trackitor["priority"]; ?>" disabled="disabled" />
          </label></td>
        <td style="width: 301px;"><label>
          <textarea name="html<?php echo $i; ?>" id="<?php echo "input".$i."_5"; ?>" class="html" cols="45" rows="7" disabled="disabled"><?php echo htmlspecialchars($trackitor["html"]); ?></textarea>
          </label></td>
        <td style="width: 301px;"><label>
          <textarea name="settings<?php echo $i; ?>" id="<?php echo "input".$i."_6"; ?>" class="settings" cols="45" rows="7" disabled="disabled"><?php echo htmlspecialchars($trackitor["settings"]); ?></textarea>
          </label></td>
      </tr>
      <?php
  			$i++;
  		}
		$i--;
		$trackresult->free();
  ?>
    </table>
    <div style="position: fixed; bottom: 0px; width: 100%; left: 0px; right: 0px; background: #FFFFFF; padding: 4px 10px;">
      <label>
      <input type="submit" name="Submit" id="Submit" value="Submit" />
      </label>
    </div>
    <input name="num_of_tracks" type="hidden" id="num_of_tracks" value="<?php echo $i; ?>" />
  </div>
</form>
<?php
		require("../../../includes/closedb.php");
	}
?>
</body>
</html>
