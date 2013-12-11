<?php
	require('../../includes/session.php');
	$count = 0;
	if(empty($_REQUEST)) {
		// new page, doesn't do anything
	} else {
		// open database for table list (species)
		require("../../includes/db/opendbcpb.php");
		
		// first connect to database and find the number of species
		$species = $mysqli->query("SELECT * FROM species");
		while($spcitor = $species->fetch_assoc()) {
			// get all the species ready
			if($spcitor["dbname"] == "hg19" || isset($_REQUEST[$spcitor["dbname"]])) { //should use this later
			//if($spcitor["dbname"] == "hg19" || $spcitor["dbname"] == "mm9") {
				$spcinfo[] = $spcitor;
				$spcflag[] = true;
				$spcmultiflag[] = false;
			}
		}
		
		$num_spc = sizeof($spcinfo);
//		echo $num_spc;
		$directsubmit = false;
		
		if($_REQUEST["direct"] == "true") {
			// TODO: gene selected, directly reload the genes
			for($i = 0; $i < $num_spc; $i++) {
				$genes[] = $mysqli->query("SELECT * FROM " . $spcinfo[$i]["dbname"] 
					. " WHERE genename = '" . $_REQUEST["geneName"] . "' ORDER BY similarity DESC");
			}
			$directsubmit = true;
		} else {
			// find the gene
			for($i = 0; $i < $num_spc; $i++) {
				$genes[] = $mysqli->query("SELECT `alias`, `T1`.`genename` AS `genename`, "
				."`isGeneName`, `nameinspc`, `ensemblid`, `chr`, `genestart`, `geneend`, `strand`, "
				. "`extendedstart`, `extendedend`, `similarity`, `liftovers` FROM "
					. "(SELECT * FROM "
						. "(SELECT * FROM `alias` WHERE `alias` LIKE "
						. "'%" . $_REQUEST["geneName"] . "%' "
						. "ORDER BY `isGeneName` DESC, `genename`) AS `T` "
					. "GROUP BY `genename`) AS `T1` "
				. "LEFT JOIN `" . $spcinfo[$i]["dbname"] . "` "
				. "ON `" . $spcinfo[$i]["dbname"] . "`.`genename` = `T1`.`genename` "
				. "WHERE `nameinspc` IS NOT NULL ORDER BY `T1`.`genename`, `similarity` DESC");
			}
		}
		for($i = 0; $i < $num_spc; $i++) {
			$nextGene[] = $genes[$i]->fetch_assoc();
		}
?>

<table width="100%" border="1" cellspacing="0" bordercolor="#666666">
  <?php
		while($nextGene[0]) {
			$currentGeneArray = array();
			$currentGeneName = $nextGene[0]["genename"];
			$currentGeneAlias = "";
			if($_REQUEST["direct"] != "true") {
				$currentGeneAlias = (($nextGene[0]["isGeneName"] > 0)? "": $nextGene[0]["alias"]);
			}
			
			//echo $currentGeneName . "<br>";
			for($i = 0; $i < $num_spc; $i++) {
				$currentSpeciesGeneArray = array();
				while($nextGene[$i] && $nextGene[$i]["genename"] == $currentGeneName) {
					$currentSpeciesGeneArray []= $nextGene[$i];
					$nextGene[$i] = $genes[$i]->fetch_assoc();
					//echo $currentGeneName . "<br>";
					//echo $nextGene[$i]["genename"] . " (nextGene)<br>";
				}
				//print_r($currentSpeciesGeneArray);
				$currentGeneArray []= $currentSpeciesGeneArray;
			}
			
  ?>
  <tr>
    <td class="formstyle"><form id="<?php echo $currentGeneName; ?>" name="<?php echo $currentGeneName; ?>" method="post" action="cpbrowser/cpbrowser.php<?php echo $in_debug? "?Debug=XCDebug": ""; ?>" target="cpbrowser" onSubmit="return updateNavigation('<?php echo $currentGeneName; ?>');">
        <table width="100%" border="0">
          <tr>
            <td valign="top" colspan="2"><strong><?php echo $currentGeneName; ?></strong>
              <?php
			if(!empty($currentGeneAlias)) {
				echo "(<strong>" . $currentGeneAlias . "</strong>)";
			}
			$num_spc_to_show = 0;
			for($i = 0; $i < $num_spc; $i++) {
				if(sizeof($currentGeneArray[$i]) > 0) {
					$spcflag[$i] = true;
					$num_spc_to_show++;
					if(sizeof($currentGeneArray[$i]) > 1) {
						$spcmultiflag[$i] = true;
					} else {
						$spcmultiflag[$i] = false;
					}
				} else {
					$spcflag[$i] = false;
				}
				if($spcflag[$i]) {
			?>
              <input name="speciesdb[]" type="hidden" value="<?php echo $spcinfo[$i]["dbname"]; ?>" />
              <input name="speciesname[]" type="hidden" value="<?php echo $spcinfo[$i]["name"]; ?>" />
              <input name="speciescmnname[]" id="<?php echo $currentGeneName; ?>SpcCmnName<?php echo $i; ?>" type="hidden" value="<?php echo $spcinfo[$i]["commonname"]; ?>" />
              <?php
				}
			}
			?>
              <input name="num_spc" id="<?php echo $currentGeneName; ?>NumSpc" type="hidden" value="<?php echo $num_spc_to_show; ?>" />
              <input name="showinbrowser" type="submit" id="showinbrowser" style="float: right;" value="Visualize" />
              <div style="clear: both;"></div></td>
          </tr>
          <?php
			for($i = 0; $i < $num_spc; $i++) {
				if($spcflag[$i]) {
			?>
          <tr class="smallformstyle">
            <td width="20%" valign="top"><?php echo $spcinfo[$i]["commonname"]; ?></td>
            <td width="80%" valign="top"><span id="<?php echo $currentGeneName . $spcinfo[$i]["dbname"] . "NameDisp"; ?>"><?php echo $currentGeneArray[$i][0]["nameinspc"]; ?></span><br />
              <?php 
					if(!$spcmultiflag[$i]) {
					?>
              <input name="<?php echo $spcinfo[$i]["dbname"]; ?>" type="hidden" id="<?php echo $currentGeneName . $spcinfo[$i]["dbname"]; ?>" value="<?php echo $currentGeneArray[$i][0]["chr"] . ":" . $currentGeneArray[$i][0]["extendedstart"] . "-" . $currentGeneArray[$i][0]["extendedend"]; ?>" />
              <input type="hidden" name="<?php echo $spcinfo[$i]["dbname"] . "strand"; ?>" id="<?php echo $currentGeneName . $spcinfo[$i]["dbname"] . "strand"; ?>" value="<?php echo $currentGeneArray[$i][0]["strand"]; ?>" />
              <?php
						echo $currentGeneArray[$i][0]["chr"] . ":" . $currentGeneArray[$i][0]["genestart"] . "-" . $currentGeneArray[$i][0]["geneend"]; 
					} else {
						 ?>
              <select class="combostyle" name="<?php echo $spcinfo[$i]["dbname"]; ?>" type="hidden" id="<?php echo $currentGeneName . $spcinfo[$i]["dbname"] . "NameDispselection"; ?>" onchange='changeGeneName("<?php echo $currentGeneName . $spcinfo[$i]["dbname"] . "NameDisp"; ?>", "<?php echo $currentGeneName . $spcinfo[$i]["dbname"] . "names"; ?>", "<?php echo $currentGeneName . $spcinfo[$i]["dbname"] . "strand"; ?>", "<?php echo $currentGeneName . $spcinfo[$i]["dbname"] . "strands"; ?>");' >
                <?php
			  			$selection_set = false;
						$selected_index = 0;
						for($j = 0; $j < sizeof($currentGeneArray[$i]); $j++) {
					?>
                <option <?php 
			  				if(!$selection_set && $currentGeneArray[$i][$j]["liftovers"] > 0) { 
								$selection_set = true;
								$selected_index = $j;
								echo "selected=\"selected\""; 
							} ?> value="<?php echo $currentGeneArray[$i][$j]["chr"] . ":" . $currentGeneArray[$i][$j]["extendedstart"] . "-" . $currentGeneArray[$i][$j]["extendedend"]; ?>"><?php echo $currentGeneArray[$i][$j]["chr"] . ":" . $currentGeneArray[$i][$j]["genestart"] . "-" . $currentGeneArray[$i][$j]["geneend"]; 
			  				if($currentGeneArray[$i][$j]["liftovers"] <= 0) {
								echo " (*)";
							}
			  ?></option>
                <?php
						}
			  ?>
              </select>
              <input type="hidden" name="<?php echo $spcinfo[$i]["dbname"] . "strand"; ?>" id="<?php echo $currentGeneName . $spcinfo[$i]["dbname"] . "strand"; ?>" value="<?php echo $currentGeneArray[$i][$selected_index]["strand"]; ?>" />
              <?php
						for($j = 0; $j < sizeof($currentGeneArray[$i]); $j++) {
			  ?>
              <input type="hidden" id="<?php echo $currentGeneName . $spcinfo[$i]["dbname"] . "names". $j; ?>" value="<?php echo $currentGeneArray[$i][$j]["nameinspc"]; ?>" />
              <input type="hidden" id="<?php echo $currentGeneName . $spcinfo[$i]["dbname"] . "strands". $j; ?>" value="<?php echo $currentGeneArray[$i][$j]["strand"]; ?>" />
              <?php
						}
					} 
 ?></td>
          </tr>
          <?php 
				}
			}
		  ?>
        </table>
      </form></td>
  </tr>
  <?php
			$count++;
  			if($directsubmit) {
				break;
			}
		} 
		
		if($count <= 0) {
		  ?>
  <tr>
    <td class="formstyle"> No results match the query &quot;<?php echo $_REQUEST["geneName"]; ?>&quot;. </td>
  </tr>
  <?php
		}
		$species->free();
		for($i = 0; $i < $num_spc; $i++) {
			$genes[$i]->free();
		}
		require("../../includes/db/closedb.php");
		if($count == 1) {
			?>
  <script language="javascript">
	updateNavigation("<?php echo $currentGeneArray[0][0]["genename"]; ?>");
	document.getElementById("<?php echo $currentGeneArray[0][0]["genename"]; ?>").submit();
</script>
  <?php
		}
?>
</table>
<?php
	}
?>
