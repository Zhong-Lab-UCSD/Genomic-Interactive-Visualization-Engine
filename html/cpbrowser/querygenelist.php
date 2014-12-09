<?php
	require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
	
	function findGeneList($geneName, $isDirect, $spcDbNames) {
		// notice that the function has its own mysqli
		// and spcDbNames only include the db names
		$mysqli = connectCPB();
		$geneName = $mysqli->real_escape_string($geneName);
		// sanitation first
		
		$spcInfo = getSpeciesInfoFromArray($spcDbNames);
		
		if($isDirect) {
			// TODO: gene selected, directly reload the genes
			for($i = 0; $i < count($spcInfo); $i++) {
				$genes[] = $mysqli->query("SELECT * FROM " . $spcInfo[$i]["dbname"] 
					. " WHERE genename = '" . $geneName . "' ORDER BY similarity DESC");
			}
		} else {
			// find the gene
			for($i = 0; $i < count($spcInfo); $i++) {
				$genes[] = $mysqli->query("SELECT `alias`, `T1`.`genename` AS `genename`, "
				."`isGeneName`, `nameinspc`, `ensemblid`, `chr`, `genestart`, `geneend`, `strand`, "
				. "`extendedstart`, `extendedend`, `similarity`, `liftovers` FROM "
					. "(SELECT * FROM "
						. "(SELECT * FROM `alias` WHERE `alias` LIKE "
						. "'%" . $geneName . "%' "
						. "ORDER BY `isGeneName` DESC, `genename`) AS `T` "
					. "GROUP BY `genename`) AS `T1` "
				. "LEFT JOIN `" . $spcInfo[$i]["dbname"] . "` "
				. "ON `" . $spcInfo[$i]["dbname"] . "`.`genename` = `T1`.`genename` "
				. "WHERE `nameinspc` IS NOT NULL ORDER BY `T1`.`genename`, `similarity` DESC");
			}
		}
		for($i = 0; $i < count($spcInfo); $i++) {
			$nextGene[] = $genes[$i]->fetch_assoc();
		}
		
		$result = array();
		// normalize the results
		while($nextGene[0]) {
			$currentRegion = array();
			$currentRegionName = $nextGene[0]["genename"];
			$currentRegionAlias = "";
			if($_REQUEST["direct"] != "true") {
				$currentRegionAlias = (($nextGene[0]["isGeneName"] > 0)? "": $nextGene[0]["alias"]);
			}
			for($i = 0; $i < count($spcInfo); $i++) {
				$currentSpeciesGeneArray = array();
				while($nextGene[$i] && $nextGene[$i]["genename"] == $currentRegionName) {
					$currentSpeciesGeneArray []= $nextGene[$i];
					$nextGene[$i] = $genes[$i]->fetch_assoc();
					//echo $currentGeneName . "<br>";
					//echo $nextGene[$i]["genename"] . " (nextGene)<br>";
				}
				//print_r($currentSpeciesGeneArray);
				$currentRegion[$spcInfo[$i]["dbname"]] = $currentSpeciesGeneArray;
			}
			$currentRegion["alias"] = $currentRegionAlias;
			$result[$currentRegionName]= $currentRegion;
		}
			
		for($i = 0; $i < count($spcInfo); $i++) {
			$genes[$i]->free();
		}
		$mysqli->close();
		return $result;
	}
?>