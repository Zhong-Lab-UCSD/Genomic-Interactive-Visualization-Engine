<?php
//include '../includes/session.php';

$oldQuery = false;
$num_rows = -1;

if(!empty($_REQUEST['query'])) {
	$oldQuery = true;
	$query = $_REQUEST['query'];
} else {
	$query = "";
}

if(empty($_REQUEST['pagesize'])) {
	$pagesize = 50;
} else {
	$pagesize = (int) $_REQUEST['pagesize'];
}

if(empty($_REQUEST['p'])) {
	$p = 1;
} else {
	$p = (int) $_REQUEST['p'];
}

define("DEBUG", false);

$pure_txt = false;

function combineItems($arrayToCombine, $inBetween, $token, $needle_in_token, $paratheses) {
	// also notice that combineItems will add paratheses if needed
	// $needle_in_token will be replaced by the item in $arrayToCombine
	$firstItem = true;
	$result = "";
	foreach($arrayToCombine as $item) {
		if(!$firstItem) {
			$result .= $inBetween;
		}
		if($paratheses) {
			$result .= "(";
		}
		if(!empty($token)) {
			$result .= str_replace($needle_in_token, $item, $token);
		} else {
			$result .= $item;
		}
		if($paratheses) {
			$result .= ")";
		}
		$firstItem = false;
	}
	return($result);
}

if(!empty($_REQUEST) && ($_REQUEST["responseType"] == "txt" || $_REQUEST["responseType"] == "vcf")) {
	$pure_txt = true;
}

$link_only = false;

if(!empty($_REQUEST) && ($_REQUEST["responseType"] == "txtLink")) {
	$link_only = true;
}

// echo $link_only . " " . $_REQUEST["responseType"] . "\n";

$conn = mysql_connect('localhost', 'snpuser', 'shengsnp2011');
if(empty($conn)) {
	die("Comparison database is not ready.");
}
$db = mysql_select_db('mm9Ref', $conn);
if(empty($db)) {
	die("Mm9Ref database is not ready.");
}

$strain_map = array();

if($pure_txt) {
	// need to output txt files or vcf files
	header("Cache-Control: no-cache, must-revalidate");	// need to be re-validated every-time
	header("Content-type: text/plain");				// output text
	header("Content-Disposition: attachment; filename=SNPresult.txt");	// save as file
} else {
	// normal HTML
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>SNP result</title>
<style type="text/css">
<!--
.mainContent {
	clear: both;
	position: absolute;
	left: 5px;
	width: auto;
	padding-bottom: 30px;
}
.mainTable {
	font-family: Verdana, Arial, Helvetica, sans-serif;
	font-size: 11px;
	border-color: #666666;
	border-width: 1px;
	text-align: center;
	width: auto !important;
}
.mainTable td {
	border-top-color: #FFFFFF;
	border-right-color: #FFFFFF;
	border-bottom-color: #FFFFFF;
	border-left-color: #FFFFFF;
}
.mainTableHeader {
	background-color: #003366;
	color: #FFFFFF;
	border: 1px solid #CCCCCC;
}
#PageNumPlaceHolder {
	padding: 3px;
	clear: none;
	height: 25px;
	position: fixed;
	left: 5px;
	font-family: Verdana, Arial, Helvetica, sans-serif;
	font-size: 11px;
	overflow: hidden;
	z-index: 2;
	top: 0px;
}
.mainTableSubHeader {
	background-color: #006699;
	color: #FFFFFF;
	border: 1px solid #FFFFFF;
}
.Intronic {
	background-color: #DEDEDE;
}
.Exonic {
	background-color: #FFFF99;
}
.Splice {
	background-color: #CCCCFF;
}
.Coding {
	background-color: #FFCCFF;
}
.WithinGene {
	background-color: #99EE99;
}
.NonGene {
	background-color: #FFFFFF;
}
.Hetero {
	font-weight: bold;
	color: #660000;
}
.mainTableFixedHeader {
	font-family: Verdana, Arial, Helvetica, sans-serif;
	font-size: 11px;
	text-align: center;
	left: 0px;
	border-top-color: #666666;
	border-right-color: #666666;
	border-bottom-color: #666666;
	border-left-color: #666666;
	width: auto;
}
#FixedHeader {
	position: fixed;
	left: 5px;
	top: 0px;
	clear: none;
	z-index: 1;
	width: auto;
}
.mainTableBrowse {
	background-color: #FFFFFF;
	color: #FFFFFF;
	border-top-width: 1px;
	border-right-width: 1px;
	border-bottom-width: 1px;
	border-left-width: 1px;
	border-top-color: #FFFFFF;
	border-right-color: #FFFFFF;
	border-bottom-color: #FFFFFF;
	border-left-color: #FFFFFF;
}
#PageNum {
	padding: 3px;
	clear: none;
	height: 25px;
	position: fixed;
	left: 5px;
	font-family: Verdana, Arial, Helvetica, sans-serif;
	font-size: 11px;
	z-index: 3;
	top: 0px;
	overflow: hidden;
	width: auto;
}
#PageNum #pagechange input {
	font-family: Verdana, Arial, Helvetica, sans-serif;
	font-size: 11px;
	width: 30px;
}
.Upstream {
	background-color: #FFABDE;
}
-->
</style>
<script src="../html/cpbrowser/SpryAssets/SpryValidationTextField.js" type="text/javascript"></script>
<script type="text/javascript">
function tableHeaderShowHide() {
	//alert(document.body.scrollTop + " " + (document.getElementById("TableTop").top + 15));
	if(document.body.scrollTop > document.getElementById("TableTop").offsetTop + 20) {
		document.getElementById("FixedHeader").style.display = "block";
	} else {
		document.getElementById("FixedHeader").style.display = "none";
	}
}

function submitForm(txtonly, page) {
	//document.getElementById("pagenum").value = page;
	if(txtonly == true) {
		document.getElementById("responseType").value = "txt";
		document.getElementById("pagechange").submit();
	} else {
		document.getElementById("page").value = page;
		document.getElementById("pagechange").submit();
	}
}

function submitFormCustomPageNumber() {
	if(document.getElementById("pagenum").value < page_num) {
		document.getElementById("page").value = document.getElementById("pagenum").value;
		document.getElementById("pagechange").submit();
	}
}

</script>
<link href="../html/cpbrowser/SpryAssets/SpryValidationTextField.css" rel="stylesheet" type="text/css" />
</head>
<body onscroll="tableHeaderShowHide();">
<?php
}
if(empty($_REQUEST)) {
	// empty page, show something else
?>
<?php
} else {
	// Insert database queries here
	// will need to format the output
	
	// First read all the input into the variables
	// If there is an md5 already for query, use the query
	$sql_exists = false;
	$sql_comm = "";
	
	mysql_query("DELETE FROM oldQueries WHERE DATE_SUB(NOW(), INTERVAL 10 HOUR) >= lastactive");
	
	if($oldQuery) {
		// something written by query, need to look up database for its corresponding SQL command
		// if successful, mark $sql_exists = true
		$sql_query = mysql_query("SELECT * FROM oldQueries WHERE md5Value = '" 
			. mysql_real_escape_string($query) . "'");
		if($row = mysql_fetch_assoc($sql_query)) {
			$sql_comm = $row['sqlString'];
			if($row['rows'] >= 0) {
				$num_rows = $row['rows'];
			}
			$sql_exists = true;
		} else {
		?>
<script type="text/javascript">
	alert("Query error, please re-start from left panel.");			
</script>
<?php
		}
	}
	
	$strains = array();
	if($_REQUEST["strain"] != "_all") {
		//$tablenames[] = $_REQUEST["strain"];
		$strain_res = mysql_query("SELECT * FROM strains WHERE ID = '" 
			. mysql_real_escape_string($_REQUEST["strain"]) . "'");
		$row = mysql_fetch_assoc($strain_res);
		$strains[] = mysql_real_escape_string($_REQUEST["strain"]);
		$strain_map[$row["ID"]] = $row["name"];
	} else {
		// use all strains
		$strain_res = mysql_query("SELECT * FROM strains");
		while($row = mysql_fetch_assoc($strain_res)) {
			//$tablenames[] = $row["ID"];
			$strains[] = $row["ID"];
			$strain_map[$row["ID"]] = $row["name"];
		}
	}
	
	if(!$sql_exists) {
		
		// add filters
		$filters = array();
		
		if($_REQUEST["chrom"] != "_all") {
			$filters[] = "RefSNP.Chr = '" . mysql_real_escape_string($_REQUEST["chrom"]) . "'";
		}

		if(!empty($_REQUEST["start"])) {
			$filters[] = "RefSNP.Pos >= " . mysql_real_escape_string($_REQUEST["start"]);
		}
		if(!empty($_REQUEST["end"])) {
			$filters[] = "RefSNP.Pos <= " . mysql_real_escape_string($_REQUEST["end"]);
		}
		
		if(isset($_REQUEST["homo"]) != isset($_REQUEST["hetero"])) {
			// Only one is set, filter is needed, otherwise no filter is needed
			$heterozygosity = "";
			if(isset($_REQUEST["homo"])) {
				$heterozygosity = "%%strain%%.Heterozygosity = 0";
			} else {
				$heterozygosity = "%%strain%%.Heterozygosity = 1";
			}
			$filters[] = combineItems($strains, " OR ", $heterozygosity, "%%strain%%", false);
		}
		
		
		if(!(isset($_REQUEST["noanno"]) && isset($_REQUEST["noncoding"]) && isset($_REQUEST["intronic"])
			&& isset($_REQUEST["splice"]) && isset($_REQUEST["microrna"]) && isset($_REQUEST["utr"])
			&& isset($_REQUEST["syn"]) && isset($_REQUEST["nonsyn"]))) {
			// not every choice is selected, filter is needed
			$consequences = array();
			if(isset($_REQUEST["noanno"])) {
				$consequences[] = combineItems($strains, " OR ", 
					"%%strain%%.Consequences = ''", "%%strain%%", false);
			}
			if(isset($_REQUEST["noncoding"])) {
				$consequences[] = combineItems($strains, " OR ", 
					"%%strain%%.Consequences LIKE '%WITHIN_NON_CODING%'", "%%strain%%", false);
			}
			if(isset($_REQUEST["upstream"])) {
				$consequences[] = combineItems($strains, " OR ", 
					"%%strain%%.Consequences LIKE '%UPSTREAM%'", "%%strain%%", false);
			}
			if(isset($_REQUEST["intronic"])) {
				$consequences[] = combineItems($strains, " OR ", 
					"%%strain%%.Consequences LIKE '%INTRONIC%'", "%%strain%%", false);
			}
			if(isset($_REQUEST["splice"])) {
				$consequences[] = combineItems($strains, " OR ", 
					"%%strain%%.Consequences LIKE '%SPLICE%'", "%%strain%%", false);
			}
			if(isset($_REQUEST["microrna"])) {
				$consequences[] = combineItems($strains, " OR ", 
					"%%strain%%.Consequences LIKE '%MIR%'", "%%strain%%", false);
			}
			if(isset($_REQUEST["utr"])) {
				$consequences[] = combineItems($strains, " OR ", 
					"%%strain%%.Consequences LIKE '%PRIME_UTR%'", "%%strain%%", false);
			}
			if(isset($_REQUEST["syn"])) {
				$consequences[] = combineItems($strains, " OR ", 
					"%%strain%%.Consequences LIKE '%:SYNONYMOUS_CODING%'", "%%strain%%", false);
			}
			if(isset($_REQUEST["nonsyn"])) {
				$consequences[] = combineItems($strains, " OR ", 
					"%%strain%%.Consequences LIKE '%:NON_SYNONYMOUS_CODING%'", "%%strain%%", false);
			}
			
			$filters[] = combineItems($consequences, " OR ", "", "", true);
		}
		
		if(isset($_REQUEST["highconf"])) {
			$filters[] = combineItems($strains, " OR ", 
				"%%strain%%.HighConfGenotype = 1", "%%strain%%", false);
		}
		
		if(!empty($_REQUEST["read_num"])) {
			$filters[] = combineItems($strains, " OR ", 
				"%%strain%%.ReadDepth >= " . $_REQUEST["read_num"], "%%strain%%", false);
		}
		
		if(!empty($_REQUEST["map_qual"])) {
			$filters[] = combineItems($strains, " OR ", 
				"%%strain%%.MappingQual >= " . $_REQUEST["map_qual"], "%%strain%%", false);
		}
		
		if(!empty($_REQUEST["snp_qual"])) {
			$filters[] = combineItems($strains, " OR ", 
				"%%strain%%.GenotypeQual >= " . $_REQUEST["snp_qual"], "%%strain%%", false);
		}
	
		// Then construct the SQL for query
		$sql_comm = "SELECT RefSNP.ID AS ID, RefSNP.Chr AS Chr, RefSNP.Pos AS Pos, RefSNP.RefNuc AS RefNuc, "
			. combineItems($strains, ", ", "%%strain%%.ID AS '%%strain%%.ID', %%strain%%.Heterozygosity AS '%%strain%%.Heterozygosity', %%strain%%.Genotype AS '%%strain%%.Genotype', %%strain%%.ReadDepth AS '%%strain%%.ReadDepth', %%strain%%.GenotypeQual AS '%%strain%%.GenotypeQual', %%strain%%.MappingQual AS '%%strain%%.MappingQual', %%strain%%.HighConfGenotype AS '%%strain%%.HighConfGenotype', %%strain%%.AboveThrdGenotype AS '%%strain%%.AboveThrdGenotype', %%strain%%.Consequences AS '%%strain%%.Consequences'", "%%strain%%", false)
			. " FROM RefSNP LEFT JOIN " 
			. combineItems($strains, " LEFT JOIN ", "%%strain%% ON ( %%strain%%.ID = RefSNP.ID )", "%%strain%%", false) 
			. " WHERE (" . combineItems($strains, " OR ", "%%strain%%.ID IS NOT NULL", "%%strain%%", false) 
			. ")";
		if(!empty($filters)) {
			$sql_comm .= " AND " . combineItems($filters, " AND ", "", "", true);
		}
			
		// generate an md5 of the sql query for future use (and page limit)
		$query = md5($sql_comm);
		
		// update the md5 into mysql table
		mysql_query("INSERT INTO oldQueries (md5Value, sqlString, lastactive) VALUES ('" . $query . "', '" 
			. mysql_real_escape_string($sql_comm) . "', NOW()) ON DUPLICATE KEY UPDATE lastactive = NOW()");
	}
	
	if($num_rows >= 0) {
		// number of rows already known
		// add page limiting stuff to the sql command
		$sql_comm .= " LIMIT " . (($p - 1) * $pagesize) . ", " . $pagesize;
	}
	
	if($link_only !== true) {
	
		$SNP_res = mysql_unbuffered_query($sql_comm);
		
	}
		
	if(DEBUG && !$pure_txt) {
		echo $sql_comm . "<br />";
		echo $num_rows . "<br />";
	}
	// write table header
	if(!$pure_txt) {
		if($link_only !== true) {
?>
<div id="PageNumPlaceHolder"><a href="dbSNP.php?responseType=txt&amp;strain=<?php echo htmlentities(urlencode($_REQUEST['strain'])); ?>&amp;query=<?php echo $query; ?>">Click here to download tab delimited text file</a> | Retriving number of pages ...</div>
<div id="FixedHeader" style="display:none">
  <table cellpadding="1" cellspacing="0" class="mainTableFixedHeader" id="TableTop">
    <tr style="height:25px">
      <th colspan="3" scope="col" class="mainTableBrowse">&nbsp;</th>
      <?php
			foreach($strain_map as $strainID => $strainName) {
?>
      <th colspan="6" scope="col" class="mainTableBrowse">&nbsp;</th>
      <?php 
			}
?>
    </tr>
    <tr>
      <th colspan="3" scope="col" class="mainTableHeader">General Information</th>
      <?php
			foreach($strain_map as $strainID => $strainName) {
?>
      <th colspan="6" scope="col" class="mainTableHeader"><?php echo $strainName; ?></th>
      <?php 
			}
?>
    </tr>
    <tr>
      <th style="width:90px" class="mainTableSubHeader" title="The ID of SNP" scope="col">ID</th>
      <th style="width:115px" class="mainTableSubHeader" title="Location of SNP, <Chromosome>:<Position>" scope="col">Location</th>
      <th style="width:55px" class="mainTableSubHeader" title="Reference Genome, Click link to show in UCSC Genome Browser" scope="col">Ref</th>
      <?php
			foreach($strain_map as $strainID => $strainName) {
?>
      <th style="width:36px" class="mainTableSubHeader" title="Genotype" scope="col">GT</th>
      <th style="width:31px" class="mainTableSubHeader" title="Read depth" scope="col">RD</th>
      <th style="width:31px" class="mainTableSubHeader" title="Genotype quality" scope="col">GQ</th>
      <th style="width:31px" class="mainTableSubHeader" title="Mapping quality" scope="col">MQ</th>
      <th style="width:31px" class="mainTableSubHeader" title="High Confidence Genotype" scope="col">HCG</th>
      <th style="width:360px" class="mainTableSubHeader" title="Annotation" scope="col">Annotation</th>
      <?php 
			}
?>
    </tr>
  </table>
</div>
<div class="mainContent">
  <table cellpadding="1" cellspacing="0" class="mainTable">
    <tr style="height:25px">
      <th colspan="3" scope="col" class="mainTableBrowse">&nbsp;</th>
      <?php
			foreach($strain_map as $strainID => $strainName) {
?>
      <th colspan="6" scope="col" class="mainTableBrowse">&nbsp;</th>
      <?php 
			}
?>
    </tr>
    <tr>
      <th colspan="3" scope="col" class="mainTableHeader">General Information</th>
      <?php
			foreach($strain_map as $strainID => $strainName) {
?>
      <th colspan="6" scope="col" class="mainTableHeader"><?php echo $strainName; ?></th>
      <?php 
			}
?>
    </tr>
    <tr>
      <th style="width:90px" class="mainTableSubHeader" title="The ID of SNP" scope="col">ID</th>
      <th style="width:115px" class="mainTableSubHeader" title="Location of SNP, <Chromosome>:<Position>" scope="col">Location</th>
      <th style="width:55px" class="mainTableSubHeader" title="Reference Genome, Click link to show in UCSC Genome Browser" scope="col">Ref</th>
      <?php
			foreach($strain_map as $strainID => $strainName) {
?>
      <th style="width:36px" class="mainTableSubHeader" title="Genotype" scope="col">GT</th>
      <th style="width:31px" class="mainTableSubHeader" title="Read depth" scope="col">RD</th>
      <th style="width:31px" class="mainTableSubHeader" title="Genotype quality" scope="col">GQ</th>
      <th style="width:31px" class="mainTableSubHeader" title="Mapping quality" scope="col">MQ</th>
      <th style="width:31px" class="mainTableSubHeader" title="High Confidence Genotype" scope="col">HCG</th>
      <th style="width:360px" class="mainTableSubHeader" title="Annotation" scope="col">Annotation</th>
      <?php 
			}
?>
    </tr>
    <?php 
			$written_rows = 0;
			while($row = mysql_fetch_array($SNP_res)) {
				if($written_rows < $pagesize) {
					// decide SNP class
					$classname = "NonGene";
					if(strpos($row[$strains[0] . ".Consequences"], "SYNONYMOUS") !== false) {
						// coding
						$classname = "Coding";
					} else if(strpos($row[$strains[0] . ".Consequences"], "UPSTREAM") !== false) {
						// splice
						$classname = "Upstream";
					} else if(strpos($row[$strains[0] . ".Consequences"], "SPLICE") !== false) {
						// splice
						$classname = "Splice";
					} else if(strpos($row[$strains[0] . ".Consequences"], "UTR") !== false) {
						// exonic
						$classname = "Exonic";
					} else if(strpos($row[$strains[0] . ".Consequences"], "INTRONIC") !== false) {
						$classname = "Intronic";
					} else if(!empty($row[$strains[0] . ".Consequences"])) {
						$classname = "WithinGene";
					}			 
?>
    <tr class="<?php echo $classname; ?>">
      <td style="width:90px; border-bottom:1px solid #666666;"><?php echo $row["ID"]; ?></td>
      <td style="width:115px; border-bottom:1px solid #666666;"><?php echo $row["Chr"] . ":" . $row["Pos"]; ?></td>
      <td style="width:50px; border-bottom:1px solid #666666;"><strong><?php echo $row["RefNuc"]; ?> </strong>[<a href="/cgi-bin/hgTracks?clade=mammal&amp;org=Mouse&amp;db=mm9&amp;position=<?php echo $row["Chr"]; ?>%3A<?php echo (($row["Pos"] - 100 > 0)? $row["Pos"] - 100: 1); ?>-<?php echo $row["Pos"] + 100; ?>&amp;hgt.suggest=&amp;pix=850&amp;Submit=submit&amp" target="_blank">link</a>]</td>
      <?php
					foreach($strain_map as $strainID => $strainName) {
						if($row[$strainID . ".Heterozygosity"]) {
							$subclassinfo = " class=\"Hetero\"";
						} else {
							$subclassinfo = "";
						}
?>
      <td style="width:36px; border-bottom:1px solid #666666;"<?php echo $subclassinfo; ?>><?php echo $row[$strainID . ".Genotype"]; ?></td>
      <td style="width:31px; border-bottom:1px solid #666666;"<?php echo $subclassinfo; ?>><?php echo $row[$strainID . ".ReadDepth"]; ?></td>
      <td style="width:31px; border-bottom:1px solid #666666;"<?php echo $subclassinfo; ?>><?php echo $row[$strainID . ".GenotypeQual"]; ?></td>
      <td style="width:31px; border-bottom:1px solid #666666;"<?php echo $subclassinfo; ?>><?php echo $row[$strainID . ".MappingQual"]; ?></td>
      <td style="width:31px; border-bottom:1px solid #666666;"<?php echo $subclassinfo; ?>><?php echo ($row[$strainID . ".HighConfGenotype"]? "Y": "&nbsp;"); ?></td>
      <td style="width:360px; border-bottom:1px solid #666666;" align="left"<?php echo $subclassinfo; ?>><?php 
						$consequence_array = array();
						$consequence_token = strtok($row[$strainID . ".Consequences"], ",+");
						while($consequence_token !== false) {
							if(empty($consequence_array[$consequence_token])) {
								$consequence_array[$consequence_token] = $consequence_token;
								$ensembl_token = substr($consequence_token, 0, 18);
								$other_stuff = substr($consequence_token, 18);
								echo "<a href='http://www.ensembl.org/Mus_musculus/Transcript/Summary?db=core;t=" 
									. $ensembl_token . "' target='_blank'>" . $ensembl_token . "</a>" 
									. str_replace(":", ": ", $other_stuff) . "<br />";
							}
							$consequence_token = strtok(",+");
						}
	?>
      </td>
      <?php 
					}
?>
    </tr>
    <?php 
					flush();
				}
				$written_rows++;
			}
?>
  </table>
</div>
<?php
		}
?>
<div id="PageNum">
  <form action="dbSNP.php" target="_self" method="post" name="pagechange" id="pagechange">
    <a href="dbSNP.php?responseType=txt&amp;strain=<?php echo htmlentities(urlencode($_REQUEST['strain'])); ?>&amp;query=<?php echo $query; ?>">
    <?php if($link_only === true) { echo "Click here to download tab"; } else { echo "Tab"; } ?>
    delimited text file</a>
    <input type="hidden" name="query" id="query" value="<?php echo $query; ?>" />
    <input type="hidden" name="responseType" id="responseType" value="table" />
    <input type="hidden" name="p" id="page" value="<?php echo $p; ?>" />
    <input type="hidden" name="strain" id="strain" value="<?php echo $_REQUEST['strain']; ?>" />
    <?php
		if($link_only !== true) {
	?>
     | 
    <label>Rows per page:
    <select name="pagesize" id="pagesize" onchange="submitForm(false, <?php echo $p; ?>);">
      <option value="10"<?php if($pagesize == 10) { echo " selected=\"selected\""; } ?>>10</option>
      <option value="20"<?php if($pagesize == 20) { echo " selected=\"selected\""; } ?>>20</option>
      <option value="50"<?php if($pagesize == 50) { echo " selected=\"selected\""; } ?>>50</option>
      <option value="100"<?php if($pagesize == 100) { echo " selected=\"selected\""; } ?>>100</option>
      <option value="200"<?php if($pagesize == 200) { echo " selected=\"selected\""; } ?>>200</option>
    </select>
    </label>
    &nbsp; Go to page: <strong>
    <?php
			if($num_rows < 0) {
				$num_rows = $written_rows;
				mysql_query("UPDATE oldQueries SET rows = " . $num_rows . " WHERE md5Value = '"
					. $query ."'");
			}
			
			$num_pages = ((int)(($num_rows - 1) / $pagesize)) + 1;
			
			if($p > $num_pages) {
				$p = $num_pages;
			}
			
			// ready to write something about the page
			// First, "1" is always there
			// if $p != 1, then add links to "1"
			if($p > 1) { 
				// it's not the first page here
				echo "<a href=\"Javascript:submitForm(false, 1)\">1</a>";
			} else {
				// it is the first page
				echo "1";
			}
			
			$pageloop = 2;
			
			if($p > 4) {
				// far from the beginning
				echo "</strong> ... <strong>";
				$pageloop = $p - 2;
			}
			
			for(; $pageloop < $p; $pageloop++) {
				// the two pages before current page
				echo " <a href=\"Javascript:submitForm(false, " . $pageloop . ")\">" . $pageloop . "</a>\n";
			}
			
			if($p > 1) {
				// current page
				echo " " . $p . "";
			}
			
			for($pageloop = $p + 1; $pageloop < $p + 3 && $pageloop <= $num_pages; $pageloop++) {
				// the two pages before current page
				echo " <a href=\"Javascript:submitForm(false, " . $pageloop . ")\">" . $pageloop . "</a>\n";
			}
			
			if($pageloop < $num_pages) {
				// far from the end
				echo "</strong> ... <strong>";
			}
			
			if($p + 2 < $num_pages) {
				// needs to print last page and add link
				echo " <a href=\"Javascript:submitForm(false, " . $num_pages . ")\">" . $num_pages . "</a>\n";
			}			
		
			// If num_pages > 1, then the last page is always there
			
				
			/*
				foreach($row as $key => $value) {
					echo $key . " " . $value . " | ";
				}
				echo "<br>\n";
				$i = 0;
				foreach($row as $value) {
					echo "#" . $i / 2 . " " . mysql_field_name($SNP_res, $i / 2) . " " . $value . " | ";
					$i++;
				}
				echo "<br>\n";
				flush();
			}*/
	?>
    </strong>&nbsp; <span id="spryPageNum">
    <label> Page
    <input type="text" name="pagenum" id="pagenum" />
    </label>
    <a href="Javascript:submitFormCustomPageNumber();">GO</a> <span class="textfieldInvalidFormatMsg">Page number is a positive integer.</span><span class="textfieldMinValueMsg">Page number is a positive integer.</span><span class="textfieldMaxValueMsg">Exceeding maximum page number.</span></span>
    <?php 
		}
?>
  </form>
</div>
<script type="text/javascript">
document.getElementById("PageNumPlaceHolder").style.display = "none";
var sprytextfield1 = new Spry.Widget.ValidationTextField("spryPageNum", "integer", {minValue:1, isRequired:false, maxValue:<?php echo $num_pages; ?>, validateOn:["blur"]});
var page_num = <?php echo $num_pages; ?>;
</script>
<?php
		
	} else {
		
		// TODO: pure text stuff here
		echo "ID\tChrom\tLocation\tRef";
		
		$properties = array('Genotype', 'Heterozygosity', 'Read_Depth', 'Genotype_Quality', 'Mapping_Quality', 'High_Confidence_Genotype', 'Consequences');
		$property_names = array('Genotype', 'Heterozygosity', 'ReadDepth', 'GenotypeQual', 'MappingQual', 'HighConfGenotype', 'Consequences');
		
		foreach($strains as $strainID) {
			echo "\t" . combineItems($properties, "\t", $strainID . ".%%prop%%", "%%prop%%", false);
		}
		
		echo "\n";
		
		while($row = mysql_fetch_array($SNP_res)) {
			echo $row['ID'] . "\t" . $row['Chr'] . "\t" . $row['Pos'] . "\t" . $row["RefNuc"];
			
			foreach($strains as $strainID) {
				foreach($property_names as $propname) {
					echo "\t" . $row[$strainID . "." . $propname];
				}
			}
			
			echo "\n";
			flush();
		}
	
	}
	
	// TODO: add page stuff here.
	// Maybe also add counting stuff here
	//echo mysql_num_rows($SNP_res);
	
?>
<?php
}
if(!$pure_txt) {
?>
</body>
</html>
<?php
}
?>
