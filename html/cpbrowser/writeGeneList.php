<?php 
	require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
	
	// TODO: convert this into a JavaScript function instead of a php function
	// Taking JSON data and populate the table
	
	function outputGeneListTable($result, $spcDbName, $directsubmit, $isError, $query, $in_debug) {
		$outputText = '<table width="100%" border="1" cellspacing="0" bordercolor="#666666">';
		
		$spcinfo = getSpeciesInfoFromArray($spcDbName);
		$spcflag = array_pad(array(), count($spcDbName), true);
		$spcmultiflag = array_pad(array(), count($spcDbName), false);

		$num_spc = count($spcinfo);
		foreach($result as $currentRegionName => $currentRegion) {
			$currentRegionAlias = (isset($currentRegion["alias"])? $currentRegion["alias"]: "");
			
			$outputText .= '
  <tr>
    <td class="formstyle"><form id="' . $currentRegionName . '" name="' . $currentRegionName . '" method="post" action="cpbrowser/cpbrowser.php' . ($in_debug? "?Debug=XCDebug": "") . '" target="cpbrowser" onSubmit="return updateNavigation(\'' . $currentRegionName . '\');">
        <table width="100%" border="0">
          <tr>
            <td valign="top" colspan="2"><strong>' . $currentRegionName . '</strong>';

			if(!empty($currentRegionAlias)) {
				$outputText .= "(<strong>" . $currentRegionAlias . "</strong>)";
			}
			$num_spc_to_show = 0;
			for($i = 0; $i < $num_spc; $i++) {
				
				if(isset($currentRegion[$spcinfo[$i]["dbname"]]) && sizeof($currentRegion[$spcinfo[$i]["dbname"]]) > 0) {
					$spcflag[$i] = true;
					$num_spc_to_show++;
					error_log($spcinfo[$i]["dbname"]);
					if(sizeof($currentRegion[$spcinfo[$i]["dbname"]]) > 1) {
						$spcmultiflag[$i] = true;
					} else {
						$spcmultiflag[$i] = false;
					}
				} else {
					$spcflag[$i] = false;
				}
				if($spcflag[$i]) {
					$outputText .= '
              <input name="speciesdb[]" type="hidden" value="' . $spcinfo[$i]["dbname"] . '" />
              <input name="speciesname[]" type="hidden" value="' . $spcinfo[$i]["name"] . '" />
              <input name="speciescmnname[]" id="' . $currentRegionName . 'SpcCmnName' . $i . '" type="hidden" value="' . $spcinfo[$i]["commonname"] . '" />
              ';
				}
			}
			$outputText .= '
              <input name="num_spc" id="' . $currentRegionName . 'NumSpc" type="hidden" value="' . $num_spc_to_show . '" />
              <input name="showinbrowser" type="submit" id="showinbrowser" style="float: right;" value="Visualize" />
              <div style="clear: both;"></div></td>
          </tr>
          ';
			for($i = 0; $i < $num_spc; $i++) {
				if($spcflag[$i]) {
					$currentRegionSpecies = $currentRegion[$spcinfo[$i]["dbname"]][0];
					$nameInSpc = isset($currentRegionSpecies["nameinspc"])? $currentRegionSpecies["nameinspc"]: NULL;
					$geneListToShow = isset($currentRegionSpecies["genenamelist"])? implode(", ", $currentRegionSpecies["genenamelist"]): NULL;
					$genesInRegion = isset($currentRegionSpecies["genenamelist"])? $currentRegionSpecies["genenamelist"]: NULL;
					$regionStart = isset($currentRegionSpecies["genestart"])? $currentRegionSpecies["genestart"]: $currentRegionSpecies["start"];
					$regionEnd = isset($currentRegionSpecies["geneend"])? $currentRegionSpecies["geneend"]: $currentRegionSpecies["end"];
					$extendedStart = isset($currentRegionSpecies["extendedstart"])? $currentRegionSpecies["extendedstart"]: $currentRegionSpecies["start"];
					$extendedEnd = isset($currentRegionSpecies["extendedend"])? $currentRegionSpecies["extendedend"]: $currentRegionSpecies["end"];
					$chrom = $currentRegionSpecies["chr"];
					$strand = $currentRegionSpecies["strand"];
					$outputText .= '
          <tr class="smallformstyle">
            <td width="20%" valign="top">' . $spcinfo[$i]["commonname"] . '</td>
            <td width="80%" valign="top">'; 
					$geneListNeeded = false;
			  		if(!is_null($nameInSpc)) {
						$outputText .= '
              <span id="' . $currentRegionName . $spcinfo[$i]["dbname"] . "NameDisp" . '"> ' . $nameInSpc . ' </span>
              ';
					} elseif(!is_null($geneListToShow)) {
						if(strlen($geneListToShow) > 19) {
							$geneListToShow = '';
							for($iGene = 0; $iGene < count($genesInRegion); $iGene++) {
								$geneListToShow .= $genesInRegion[$iGene] . ", ";
								if(strlen($geneListToShow) > 10) {
									$geneListToShow .= "...";
									// Write a hidden layer for gene names
									$geneListNeeded = true;
									break;
								}
							}
						}
						$outputText .= '
              <span id="' . $currentRegionName . $spcinfo[$i]["dbname"] . "GeneListDisp" . '"> ' . $geneListToShow . ' </span>
              ';
					}
					$outputText .= '
              ';
					if(!is_null($nameInSpc) || !is_null($geneListToShow)) {
						$outputText .=  "<br />";
					}
					if($geneListNeeded) {
								$outputText .= '
              <span class="geneNameExpander">More</span> <div class="geneNameInsert">
              ';
								for($jGene = 0; $jGene < count($genesInRegion); $jGene++) {
									$outputText .=  $genesInRegion[$iGene] . "<br />";
								}
                                $outputText .= '
              </div>
              <div style="clear: both;"></div>
              '; 
					}
					if(!$spcmultiflag[$i]) {
						$outputText .= '
              <input name="' . $spcinfo[$i]["dbname"] . '" type="hidden" id="' . $currentRegionName . $spcinfo[$i]["dbname"] . '" value="' . $chrom . ":" . $extendedStart . "-" . $extendedEnd . '" />
              <input type="hidden" name="' . $spcinfo[$i]["dbname"] . "strand" . '" id="' . $currentRegionName . $spcinfo[$i]["dbname"] . "strand" . '" value="' . $strand . '" />
              ';
						$outputText .=  $chrom . ":" . $regionStart . "-" . $regionEnd; 
					} else {
						 $outputText .= '
              <select class="combostyle" name="' . $spcinfo[$i]["dbname"] . '" type="hidden" id="' . $currentRegionName . $spcinfo[$i]["dbname"] . "NameDispselection" . '" onchange=\'changeGeneName("' . $currentRegionName . $spcinfo[$i]["dbname"] . "NameDisp" . '", "' . $currentRegionName . $spcinfo[$i]["dbname"] . "names" . '", "' . $currentRegionName . $spcinfo[$i]["dbname"] . "strand" . '", "' . $currentRegionName . $spcinfo[$i]["dbname"] . "strands" . '");\' >
                ';
			  			$selection_set = false;
						$selected_index = 0;
						for($j = 0; $j < sizeof($currentRegion[$spcinfo[$i]["dbname"]]); $j++) {
							$currentRegionSpecies = $currentRegion[$spcinfo[$i]["dbname"]][$j];
							$regionStart = isset($currentRegionSpecies["genestart"])? $currentRegionSpecies["genestart"]: $currentRegionSpecies["start"];
							$regionEnd = isset($currentRegionSpecies["geneend"])? $currentRegionSpecies["geneend"]: $currentRegionSpecies["end"];
							$extendedStart = isset($currentRegionSpecies["extendedstart"])? $currentRegionSpecies["extendedstart"]: $currentRegionSpecies["start"];
							$extendedEnd = isset($currentRegionSpecies["extendedend"])? $currentRegionSpecies["extendedend"]: $currentRegionSpecies["end"];
							$chrom = $currentRegionSpecies["chr"];
							$outputText .= '
                <option '; 
			  				if(!$selection_set && $currentRegionSpecies["liftovers"] > 0) { 
								$selection_set = true;
								$selected_index = $j;
								$outputText .=  "selected=\"selected\""; 
							} $outputText .= ' value="' . $chrom . ":" . $extendedStart . "-" . $extendedEnd . '">' . $chrom . ":" . $regionStart . "-" . $regionEnd; 
			  				if($currentRegionSpecies["liftovers"] <= 0) {
								$outputText .=  " (*)";
							}
			  				$outputText .= '</option>
                ';
						}
			  			$outputText .= '
              </select>
              <input type="hidden" name="' . $spcinfo[$i]["dbname"] . "strand" . '" id="' . $currentRegionName . $spcinfo[$i]["dbname"] . "strand" . '" value="' . $currentRegion[$spcinfo[$i]["dbname"]][$selected_index]["strand"] . '" />
              ';
						for($j = 0; $j < sizeof($currentRegion[$spcinfo[$i]["dbname"]]); $j++) {
							$currentRegionSpecies = $currentRegion[$spcinfo[$i]["dbname"]][$j];
							$nameInSpc = isset($currentRegionSpecies["nameinspc"])? $currentRegionSpecies["nameinspc"]: NULL;
							$strand = $currentRegionSpecies["strand"];
			  				$outputText .= '
              <input type="hidden" id="' . $currentRegionName . $spcinfo[$i]["dbname"] . "names". $j . '" value="' . $nameInSpc . '" />
              <input type="hidden" id="' . $currentRegionName . $spcinfo[$i]["dbname"] . "strands". $j . '" value="' . $strand . '" />
              ';
						}
					} 
 					$outputText .= '</td>
          </tr>
          '; 
				}
			}
		  $outputText .= '
        </table>
      </form></td>
  </tr>
  ';
  			if($directsubmit) {
				break;
			}
		} 
		
		if(sizeof($result) <= 0 && !$isError) {
		  $outputText .= '
  <tr>
    <td class="formstyle"> No results match the query &quot;' . $query . '&quot;. </td>
  </tr>
  ';
		}
		if(sizeof($result) == 1) {
			reset($result);
			$outputText .= '
  <script language="javascript">
	updateNavigation("' . key($result) . '");
	document.getElementById("' . key($result) . '").submit();
</script>
  ';
		}
			$outputText .= '
</table>
<script type="text/javascript">
	jQuery(function() {
		jQuery(".geneNameInsert").hide();
		jQuery(".geneNameExpander").click(function(event) {
			jQuery(this.nextElementSibling).toggle();
			jQuery(this.nextElementSibling).position().left 
				= jQuery(this).position().left + jQuery(this).width() 
				- jQuery(this.nextElementSibling).width();
			jQuery(this.nextElementSibling).position().top = jQuery(this).position().top;
			event.stopPropagation();
		});
		jQuery(".geneNameInsert").click(function(event) {
			jQuery(this).hide();
			event.stopPropagation();
		});
	});
</script>
';
		return $outputText;
	}
?>