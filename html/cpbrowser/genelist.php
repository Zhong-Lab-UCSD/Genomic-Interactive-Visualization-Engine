<?php
	require('../../includes/session.php');
	if(empty($_REQUEST)) {
		// new page, doesn't do anything
	} else {
		$chrPattern = "/^chr\w+\s*(:|\s)\s*[0-9]+\s*(-|\s)\s*[0-9]+/i";
		$isError = false;
		if(preg_match($chrPattern, $_REQUEST["geneName"])) {
			if(!isset($_REQUEST["species"]) || $_REQUEST["species"] == "gene") {
				$isError = true;
				echo "<p class=\"formstyle\"> Please specify the species of the coordinates. </p>";
			} else {
				// ***** Please use require to include the region code *****
				// ***** Then remove this line
				$isError = true;
				echo "<p class=\"formstyle\"> Coordinates currently under development and will be published within the next update. </p>";
			}
		} else if(!isset($_REQUEST["species"]) || $_REQUEST["species"] == "gene") {
			require('querygenelist.php');
		} else {
			$isError = true;
			echo "<p class=\"formstyle\"> Please specify coordinates in \"chrX:XXXXX-XXXXX\" format or \"chrX XXXXX XXXXX\" format or select \"Gene name\" to query a gene across all species. </p>";
		}
		// open database for table list (species)
?>

<table width="100%" border="1" cellspacing="0" bordercolor="#666666">
  <?php
		foreach($result as $currentRegionName => $currentRegion) {
			$currentRegionAlias = $currentRegion["alias"];
			
  ?>
  <tr>
    <td class="formstyle"><form id="<?php echo $currentRegionName; ?>" name="<?php echo $currentRegionName; ?>" method="post" action="cpbrowser/cpbrowser.php<?php echo $in_debug? "?Debug=XCDebug": ""; ?>" target="cpbrowser" onSubmit="return updateNavigation('<?php echo $currentRegionName; ?>');">
        <table width="100%" border="0">
          <tr>
            <td valign="top" colspan="2"><strong><?php echo $currentRegionName; ?></strong>
              <?php
			if(!empty($currentRegionAlias)) {
				echo "(<strong>" . $currentRegionAlias . "</strong>)";
			}
			$num_spc_to_show = 0;
			for($i = 0; $i < $num_spc; $i++) {
				if(sizeof($currentRegion[$spcinfo[$i]["dbname"]]) > 0) {
					$spcflag[$i] = true;
					$num_spc_to_show++;
					if(sizeof($currentRegion[$spcinfo[$i]["dbname"]]) > 1) {
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
              <input name="speciescmnname[]" id="<?php echo $currentRegionName; ?>SpcCmnName<?php echo $i; ?>" type="hidden" value="<?php echo $spcinfo[$i]["commonname"]; ?>" />
              <?php
				}
			}
			?>
              <input name="num_spc" id="<?php echo $currentRegionName; ?>NumSpc" type="hidden" value="<?php echo $num_spc_to_show; ?>" />
              <input name="showinbrowser" type="submit" id="showinbrowser" style="float: right;" value="Visualize" />
              <div style="clear: both;"></div></td>
          </tr>
          <?php
			for($i = 0; $i < $num_spc; $i++) {
				if($spcflag[$i]) {
					$currentRegionSpecies = $currentRegion[$spcinfo[$i]["dbname"]][0];
					$nameInSpc = isset($currentRegionSpecies["nameinspc"])? $currentRegionSpecies["nameinspc"]: "";
					$regionStart = isset($currentRegionSpecies["genestart"])? $currentRegionSpecies["genestart"]: $currentRegionSpecies["start"];
					$regionEnd = isset($currentRegionSpecies["geneend"])? $currentRegionSpecies["geneend"]: $currentRegionSpecies["end"];
					$extendedStart = isset($currentRegionSpecies["extendedstart"])? $currentRegionSpecies["extendedstart"]: $currentRegionSpecies["start"];
					$extendedEnd = isset($currentRegionSpecies["extendedend"])? $currentRegionSpecies["extendedend"]: $currentRegionSpecies["end"];
					$chrom = $currentRegionSpecies["chr"];
					$strand = $currentRegionSpecies["strand"];
			?>
          <tr class="smallformstyle">
            <td width="20%" valign="top"><?php echo $spcinfo[$i]["commonname"]; ?></td>
            <td width="80%" valign="top"><span id="<?php echo $currentRegionName . $spcinfo[$i]["dbname"] . "NameDisp"; ?>"><?php echo $nameInSpc; ?></span><br />
              <?php 
					if(!$spcmultiflag[$i]) {
					?>
              <input name="<?php echo $spcinfo[$i]["dbname"]; ?>" type="hidden" id="<?php echo $currentRegionName . $spcinfo[$i]["dbname"]; ?>" value="<?php echo $chrom . ":" . $extendedStart . "-" . $extendedEnd; ?>" />
              <input type="hidden" name="<?php echo $spcinfo[$i]["dbname"] . "strand"; ?>" id="<?php echo $currentRegionName . $spcinfo[$i]["dbname"] . "strand"; ?>" value="<?php echo $strand; ?>" />
              <?php
						echo $chrom . ":" . $regionStart . "-" . $regionEnd; 
					} else {
						 ?>
              <select class="combostyle" name="<?php echo $spcinfo[$i]["dbname"]; ?>" type="hidden" id="<?php echo $currentRegionName . $spcinfo[$i]["dbname"] . "NameDispselection"; ?>" onchange='changeGeneName("<?php echo $currentRegionName . $spcinfo[$i]["dbname"] . "NameDisp"; ?>", "<?php echo $currentRegionName . $spcinfo[$i]["dbname"] . "names"; ?>", "<?php echo $currentRegionName . $spcinfo[$i]["dbname"] . "strand"; ?>", "<?php echo $currentRegionName . $spcinfo[$i]["dbname"] . "strands"; ?>");' >
                <?php
			  			$selection_set = false;
						$selected_index = 0;
						for($j = 0; $j < sizeof($currentRegion[$spcinfo[$i]["dbname"]]); $j++) {
							$currentRegionSpecies = $currentRegion[$spcinfo[$i]["dbname"]][$j];
							$regionStart = isset($currentRegionSpecies["genestart"])? $currentRegionSpecies["genestart"]: $currentRegionSpecies["start"];
							$regionEnd = isset($currentRegionSpecies["geneend"])? $currentRegionSpecies["geneend"]: $currentRegionSpecies["end"];
							$extendedStart = isset($currentRegionSpecies["extendedstart"])? $currentRegionSpecies["extendedstart"]: $currentRegionSpecies["start"];
							$extendedEnd = isset($currentRegionSpecies["extendedend"])? $currentRegionSpecies["extendedend"]: $currentRegionSpecies["end"];
							$chrom = $currentRegionSpecies["chr"];
					?>
                <option <?php 
			  				if(!$selection_set && $currentRegionSpecies["liftovers"] > 0) { 
								$selection_set = true;
								$selected_index = $j;
								echo "selected=\"selected\""; 
							} ?> value="<?php echo $chrom . ":" . $extendedStart . "-" . $extendedEnd; ?>"><?php echo $chrom . ":" . $regionStart . "-" . $regionEnd; 
			  				if($currentRegionSpecies["liftovers"] <= 0) {
								echo " (*)";
							}
			  ?></option>
                <?php
						}
			  ?>
              </select>
              <input type="hidden" name="<?php echo $spcinfo[$i]["dbname"] . "strand"; ?>" id="<?php echo $currentRegionName . $spcinfo[$i]["dbname"] . "strand"; ?>" value="<?php echo $currentRegion[$spcinfo[$i]["dbname"]][$selected_index]["strand"]; ?>" />
              <?php
						for($j = 0; $j < sizeof($currentRegion[$spcinfo[$i]["dbname"]]); $j++) {
							$currentRegionSpecies = $currentRegion[$spcinfo[$i]["dbname"]][$j];
							$nameInSpc = isset($currentRegionSpecies["nameinspc"])? $currentRegionSpecies["nameinspc"]: "";
							$strand = $currentRegionSpecies["strand"];
			  ?>
              <input type="hidden" id="<?php echo $currentRegionName . $spcinfo[$i]["dbname"] . "names". $j; ?>" value="<?php echo $nameInSpc; ?>" />
              <input type="hidden" id="<?php echo $currentRegionName . $spcinfo[$i]["dbname"] . "strands". $j; ?>" value="<?php echo $strand; ?>" />
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
  			if($directsubmit) {
				break;
			}
		} 
		
		if(sizeof($result) <= 0 && !$isError) {
		  ?>
  <tr>
    <td class="formstyle"> No results match the query &quot;<?php echo $_REQUEST["geneName"]; ?>&quot;. </td>
  </tr>
  <?php
		}
		if(sizeof($result) == 1) {
			reset($result);
			?>
  <script language="javascript">
	updateNavigation("<?php echo key($result); ?>");
	document.getElementById("<?php echo key($result); ?>").submit();
</script>
  <?php
		}
?>
</table>
<?php
	}
?>
