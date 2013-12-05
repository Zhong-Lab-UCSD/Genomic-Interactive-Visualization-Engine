<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<?php
//include '../includes/session.php';
?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>Untitled Document</title>
<link href="../html/cpbrowser/mainstyles.css" rel="stylesheet" type="text/css" />
<style type="text/css"> 
<!-- 
html {
	height: 100%;
}
input {
	font-family: Verdana, Arial, Helvetica, sans-serif;
	font-size: 11px;
}
body  {
	background: #EBEBEB;
	margin: 0; /* it's good practice to zero the margin and padding of the body element to account for differing browser defaults */
	padding: 10pt;
	color: #000000;
	font-family: Verdana, Arial, Helvetica, sans-serif;
	font-size: 11px;
	line-height: 13px;
}
#form1 table {
	position: absolute;
	width: auto !important;
	left: 5px;
	right: 50px;
}
.inputboxclass {
	width: 120px;
}
select {
	font-family: Verdana, Arial, Helvetica, sans-serif;
	font-size: 11px;
}
-->
</style>
<script src="../html/cpbrowser/SpryAssets/SpryValidationTextField.js" type="text/javascript"></script>
<script src="../html/cpbrowser/SpryAssets/SpryValidationSelect.js" type="text/javascript"></script>
<script src="../html/cpbrowser/SpryAssets/SpryValidationCheckbox.js" type="text/javascript"></script>

<link href="../html/cpbrowser/SpryAssets/SpryValidationTextField.css" rel="stylesheet" type="text/css" />
<link href="../html/cpbrowser/SpryAssets/SpryValidationSelect.css" rel="stylesheet" type="text/css" />

<link href="../html/cpbrowser/SpryAssets/SpryValidationCheckbox.css" rel="stylesheet" type="text/css" />
</head>
<?php
	// Read the strain table
	$conn = mysql_connect('localhost', 'snpuser', 'shengsnp2011');
	if(empty($conn)) {
		die("Comparison database is not ready.");
	}
	$db = mysql_select_db('mm9Ref', $conn);
	if(empty($db)) {
		die("Mm9Ref database is not ready.");
	}
	$strain_res = mysql_query("SELECT * FROM strains");
	
?>

<body>
<form action="dbSNP.php" method="post" name="form1" target="dbSNP" id="form1">
<table border="0">
  <tr>
    <th colspan="2" scope="col"><span class="style3">SNP Parameters</span></th>
  </tr>
  <tr>
    <td>Strain</td>
    <td><span id="spryStrain">
      <label>
      <select name="strain" class="tabledInput" id="strain" accesskey="T" tabindex="0">
      <option></option>
      <option value="_all">(All strains)</option>
      <?php
	while($row = mysql_fetch_assoc($strain_res)) {
	  ?>
      <option value="<?php echo $row["ID"]; ?>"><?php echo $row["name"]; ?></option>
      <?php
	}
	$chrom_res = mysql_query("SELECT * FROM chromInfo");
	  ?>
        </select>
      </label>
      <span class="selectRequiredMsg">Please select a strain.</span></span></td>
  </tr>
  <tr>
    <td width="35%">Chrom</td>
    <td width="65%"><span id="spryChromSelect">
      <script type="text/javascript">
	  	var chromMaxes = {};
	  </script>
      <label>
      <select name="chrom" class="tabledInput" onchange="changeMaximum();" id="chrom">
      	<option></option>
      	<option value="_all">(All Chroms)</option>
      <?php
	while($row = mysql_fetch_assoc($chrom_res)) {
	  ?>
        <option value="<?php echo $row["Name"]; ?>">
		<?php echo $row["Name"]; ?></option>
        <script type="text/javascript">
			chromMaxes['<?php echo $row["Name"] ?>'] = <?php echo $row["Size"] + 1; ?>;
		</script>
      <?php
	}
	  ?>
      </select>
      </label>
      <span class="selectRequiredMsg">Please select a chromosome.</span></span></td>
  </tr>
  <tr>
    <td>Start</td>
    <td><span id="spryStart">
    <label>
    <input name="start" type="text" class="inputboxclass" id="start" />
    </label>
    <span class="textfieldInvalidFormatMsg">A positive number is required.</span><span class="textfieldMinValueMsg">A positive number is required.</span><span class="textfieldMaxValueMsg">Exceeded chromosome length, use blank for chromosome end.</span></span> </td>
  </tr>
  <tr>
    <td>End</td>
    <td><span id="spryEnd">
    <label>
    <input name="end" type="text" class="inputboxclass" id="end" />
    </label>
    <span class="textfieldInvalidFormatMsg">A positive number is required.</span><span class="textfieldMinValueMsg">A positive number is required.</span><span class="textfieldMaxValueMsg">Exceeded chromosome length, use blank for chromosome end.</span></span></td>
  </tr>
  <tr>
    <td colspan="2"></td>
  </tr>
  <tr>
    <td colspan="2"><span id="spryHomo">
      <label>
      <input name="homo" type="checkbox" id="homo" checked="checked" />
Homozygous SNP<br />
<input name="hetero" type="checkbox" id="hetero" checked="checked" />
Heterozygous SNP</label>
      <br />
      <span class="checkboxMinSelectionsMsg">You need to choose at least one category.</span></span></td>
    </tr>
  <tr>
    <td colspan="2">Annotation 
      <input name="annoplus" type="button" class="tabledButton" id="annoplus" value="Anno+" onclick="selectAnno();" />
      <input name="annoplus2" type="button" class="tabledButton" id="annominus" value="Anno-" onclick="deselectAnno();" /></td>
    </tr>
  <tr>
    <td colspan="2"><span id="spryAnno">
    <label>
    <input type="checkbox" name="noanno" id="noanno" />
No annotation<br />
    </label>
    <label>
    <input type="checkbox" name="noncoding" id="anno1" />
Non-coding gene</label>
    <br />
    <label>
    <input type="checkbox" name="upstream" id="anno2" />
Upstream 3kBp</label>
<br />
    <label>
    <input type="checkbox" name="intronic" id="anno3" />
Intronic - other</label>
<br />
<label>
<input type="checkbox" name="splice" id="anno4" />
Splice site</label>
<br />
<label>
<input type="checkbox" name="microrna" id="anno5" />
Micro RNA</label>
<br />
<label>
<input type="checkbox" name="utr" id="anno6" />
Exon - UTR</label>
<br />
<label>
<input type="checkbox" name="syn" id="anno7" />
Exon - synonymous</label>
<br />
<label>
<input type="checkbox" name="nonsyn" id="anno8" />
Exon - nonsynonymous</label>
<span class="checkboxMinSelectionsMsg">You need to choose at least one category.</span></span></td>
    </tr>
  <tr>
    <td colspan="2">Quality Filter</td>
    </tr>
  <tr>
    <td colspan="2"><label>
      <input type="checkbox" name="highconf" id="highconf" />
      High confidence only</label></td>
    </tr>
  <tr>
    <td>Read #</td>
    <td>&gt;<span id="spryReadNum">
    <label>
    <input name="read_num" type="text" class="inputboxclass" id="read_num" />
    </label>
    <br />
    <span class="textfieldInvalidFormatMsg">A positive number is required.</span></span></td>
  </tr>
  <tr>
    <td>Map qual</td>
    <td>&gt; <span id="spryMapQual">
      <label>
      <input name="map_qual" type="text" class="inputboxclass" id="map_qual" />
      </label><br />
       <span class="textfieldInvalidFormatMsg">A positive number is required.</span>
      </span></td>
  </tr>
  <tr>
    <td>SNP qual</td>
    <td>&gt; <span id="sprytextfield3">
    <label>
    <input name="snp_qual" type="text" class="inputboxclass" id="snp_qual" />
    </label><br />
      <span class="textfieldInvalidFormatMsg">A positive number is required.</span></span></td>
    </tr>
  <tr>
    <td colspan="2">
      <span id="spryOutput">
      <label>Output:
      <select name="responseType" id="outputType">
        <option value="table" selected="selected">HTML table</option>
        <option value="txtLink">Tab delimited text</option>
      </select>
      </label><span class="selectRequiredMsg">Please select an item.</span></span></td>
    </tr>
  <tr>
    <td colspan="2">
      Experiments<br />
      <label><select name="experiment" size="7" multiple="multiple" id="experiment">
      <?php
	  ?>
      
      <?php
	  ?>
                  </select>
      </label>
	  </td>
    </tr>
  <tr>
    <td colspan="2">
      <div align="right">
        <label><input type="submit" name="Submit" id="Submit" value="Submit" /></label>
        </div></td>
    </tr>
</table>
</form>

<script type="text/javascript">
<!--
var sprytextfield1 = new Spry.Widget.ValidationTextField("spryReadNum", "integer", {minValue:0, isRequired:false});
var sprytextfield2 = new Spry.Widget.ValidationTextField("spryMapQual", "integer", {isRequired:false, minValue:0});
var sprytextfield3 = new Spry.Widget.ValidationTextField("sprytextfield3", "integer", {isRequired:false, minValue:0});
//-->
</script>
</body>
<script type="text/javascript">
<!--
var spryselect1 = new Spry.Widget.ValidationSelect("spryChromSelect");
var sprytextfield1 = new Spry.Widget.ValidationTextField("spryStart", "integer", {minValue:1, isRequired:false, maxValue:1000000000});
var sprytextfield2 = new Spry.Widget.ValidationTextField("spryEnd", "integer", {minValue:1, isRequired:false, maxValue:1000000000});
var sprycheckbox1 = new Spry.Widget.ValidationCheckbox("spryHomo", {isRequired:false, minSelections:1});
var sprycheckbox2 = new Spry.Widget.ValidationCheckbox("spryAnno", {isRequired:false, minSelections:1});
var spryselect2 = new Spry.Widget.ValidationSelect("spryStrain");
function changeMaximum() {
	var size = 1000000000;
	if(document.getElementById("chrom").selectedIndex > 1) {
		size = chromMaxes[document.getElementById("chrom").options[document.getElementById("chrom").selectedIndex].value];
	}
	sprytextfield1.maxValue = size;
	sprytextfield2.maxValue = size;
}

function selectAnno() {
	var index;
	for (index = 1; index < 9; index++) {
		document.getElementById("anno" + index).checked = true;
	}
}

function deselectAnno() {
	var index;
	for (index = 1; index < 9; index++) {
		document.getElementById("anno" + index).checked = false;
	}
}
var spryselect3 = new Spry.Widget.ValidationSelect("spryOutput");
//-->
</script>
</html>
