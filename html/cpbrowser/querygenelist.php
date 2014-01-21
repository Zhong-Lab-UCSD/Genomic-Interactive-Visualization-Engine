<?php
	require("../../includes/db/opendbcpb.php");
	$spcinfo = array();
	$spcflag = array();
	$spcmultiflag = array();
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
	
	$species->free();
	$num_spc = sizeof($spcinfo);
//		echo $num_spc;
	$directsubmit = false;
	
	if($_REQUEST["direct"] == "true") {
		// TODO: gene selected, directly reload the genes
		for($i = 0; $i < $num_spc; $i++) {
			$genes[] = $mysqli->query("SELECT * FROM " . $spcinfo[$i]["dbname"] 
				. " WHERE genename = '" . $mysqli->real_escape_string($_REQUEST["geneName"]) . "' ORDER BY similarity DESC");
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
					. "'%" . $mysqli->real_escape_string($_REQUEST["geneName"]) . "%' "
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
	
	$result = array();
	// normalize the results
	while($nextGene[0]) {
		$currentRegion = array();
		$currentRegionName = $nextGene[0]["genename"];
		$currentRegionAlias = "";
		if($_REQUEST["direct"] != "true") {
			$currentRegionAlias = (($nextGene[0]["isGeneName"] > 0)? "": $nextGene[0]["alias"]);
		}
		for($i = 0; $i < $num_spc; $i++) {
			$currentSpeciesGeneArray = array();
			while($nextGene[$i] && $nextGene[$i]["genename"] == $currentRegionName) {
				$currentSpeciesGeneArray []= $nextGene[$i];
				$nextGene[$i] = $genes[$i]->fetch_assoc();
				//echo $currentGeneName . "<br>";
				//echo $nextGene[$i]["genename"] . " (nextGene)<br>";
			}
			//print_r($currentSpeciesGeneArray);
			$currentRegion[$spcinfo[$i]["dbname"]] = $currentSpeciesGeneArray;
		}
		$currentRegion["alias"] = $currentRegionAlias;
		$result[$currentRegionName]= $currentRegion;
	}
		
	for($i = 0; $i < $num_spc; $i++) {
		$genes[$i]->free();
	}
	require("../../includes/db/closedb.php");
?>