<?php
	// through the gene region to search conresponding gene region in different species
	require_once(realpath(dirname(__FILE__) . "/common_func.php"));
	set_time_limit(100);
	ini_set('memory_limit','30G');
	
	// function of mergeRegion
	function mergeRegion($geneSpecy, $geneName, $spcDbName){
		$mysqlcon = connectCPB();
		
		$species = $mysqlcon->real_escape_string($geneSpecy);
		$position = $mysqlcon->real_escape_string($geneName);
		
		$genePosition = preg_split("/[\s-:]+/",$position);
		$chromosome = strtolower($genePosition[0]);
	 	$geneStart = $genePosition[1];
	 	$geneEnd = $genePosition[2];
		$gap = ($geneEnd-$geneStart)/10;
		
		// all species
		$spcinfo = getSpeciesInfoFromArray($spcDbName);
		$num_spc = count($spcinfo);
		
		$arrSpeciesDbInit = array();
		for($i = 0; $i < $num_spc; $i++){
			$dbname = getSpeciesDatabaseFromGapInfo($gap, $spcinfo[$i]['specdatabase']);
			$arrSpeciesDbInit += array($spcinfo[$i]['dbname'] => $dbname);
		}

		//$arrSpeciesDbInit=array('hg19' => 'multishade1', 'mm9' => 'multishade2', 'susScr2' => 'multishade3');
		
		// Other species need to query and it coressponding database name
		$arrSpeciesDb=array();
		if(array_key_exists($species,$arrSpeciesDbInit)){
			$arrSpeciesDb = array_diff($arrSpeciesDbInit,array($species => $arrSpeciesDbInit[$species]));
		}else {
			die("Error:$species<br/>");
		}

		// store the comparative result to array, they don't merge
		for($i = 1; $i <= $num_spc; $i++){
			$array[$i]=array();
			$num[$i] = 1;
		}
	
		//traverse three species to find gene name
		$table1 = $arrSpeciesDbInit[$species];
		$arrKey = array_keys($arrSpeciesDb);
		for($i = 0; $i < count($arrKey); $i++){
			$table2 = $arrSpeciesDb[$arrKey[$i]];
			$sql = "SELECT compbrowser.$table1.chrom, compbrowser.$table1.chromStart, compbrowser.$table1.chromEnd, compbrowser.$table1.name, compbrowser.$table1.strand, compbrowser.$table2.chrom, compbrowser.$table2.chromStart, compbrowser.$table2.chromEnd, compbrowser.$table2.name, compbrowser.$table2.strand".
					" FROM compbrowser.$table1".
					" LEFT JOIN compbrowser.$table2".
					" ON (compbrowser.$table1.name = compbrowser.$table2.name)".
					" WHERE (compbrowser.$table1.chrom='$chromosome' AND compbrowser.$table1.chromStart>=$geneStart AND compbrowser.$table1.chromEnd<=$geneEnd)";
		
			if($result1 = $mysqlcon->prepare($sql)) {
				$result1->execute();
				$result1->bind_result($chrom1,$start1,$end1,$name1,$strand1,$chrom2,$start2,$end2,$name2,$strand2);
				$result1->store_result();
				while($result1->fetch()) {
					//save the first
					if($i == 0) {
						$arr1=array('species' => $species, 'chr' => $chrom1, 'start' => $start1, 'end' => $end1, 'strand' => $strand1, 'name' => $name1);
						$array[1][$num[1]++] = $arr1;
					}
					//save the second specy or the third specy
					if(!empty($name2)) {
						$arr2=array('species' => $arrKey[$i], 'chr' => $chrom2, 'start' => $start2, 'end' => $end2,	'strand' => $strand2, 'name' => $name2);
						$array[$i+2][$num[$i+2]++] = $arr2;
					}
				}
			}
			$result1->free_result();
			$result1->close();
		}
		//print_r($array);  echo "\n";
			
		// merge the region
		$sumFlag1 = 0;
		for($i = 1; $i <= $num_spc; $i++){
			$sum[$i] = count($array[$i]);
			$number[$i] = 1;
			$name1_[$i] = $array[$i][$number[$i]]['name'];
			
			$flag1_[$i] = 0;
			if($number[$i] < $sum[$i]){
				$flag1_[$i] = 1;
			}
			$sumFlag1 += $flag1_[$i];
		}
		
		$arrayResult = array();
		$Number = 1;
		$flag1 = 0;
		// while each array number less than the total number
		while($sumFlag1 == $num_spc) {
			$Max = '0';
			$sumFlag2 = 0;
			$flag2 = 0;
			for($i = 1; $i < $num_spc; $i++){
				for($j = $i+1; $j <= $num_spc; $j++){
					if($name1_[$i] != $name1_[$j]){
						$flag2 = 1;		
					}
					$flag2_[$i] = 0;
					//echo $name1_[$i]." ".$name1_[$j]."**"."\n";
					if($name1_[$i] == $name1_[$j]){
						$flag2_[$i] = 1;
					}
					$sumFlag2 += $flag2_[$i];
						
					if($name1_[$i] > $name1_[$j]){
						$max = $name1_[$i];
					}else{
						$max = $name1_[$j];
					}
					if($max > $Max){
						$Max = $max;
					}
					//echo "max: ".$max." Max: ".$Max."\n";
				}
			}

			$factorial = 0;
			for($i = 1; $i < $num_spc; $i++){
				$factorial += $i;
			}

			// if only have two the same species
			if($flag2 == 1){
				$sumFlag3 = 0;
				for($i = 1; $i <= $num_spc; $i++){
					if($name1_[$i] < $Max){
						if($flag1 == 0){
							$startRegion[$i] = $array[$i][$number[$i]]['start'];
							$endRegion[$i] = $array[$i][$number[$i]]['end'];
						}else{
							if($startRegion[$i] == 0){
								$startRegion[$i] = $array[$i][$number[$i]]['start'];
								$endRegion[$i] = $array[$i][$number[$i]]['end'];
							}else{
								if($array[$i][$number[$i]]['strand'] == '+'){
									$endRegion[$i] = $array[$i][$number[$i]]['end'];
								}else{
									$startRegion[$i] = $array[$i][$number[$i]]['start'];
								}
							}
						}

						$chr1_[$i] = $array[$i][$number[$i]]['chr'];
						$strand1_[$i] = $array[$i][$number[$i]]['strand'];
						$chr2_[$i] = $array[$i][$number[$i]+1]['chr'];
						$strand2_[$i] = $array[$i][$number[$i]+1]['strand'];

						if($array[$i][$number[$i]]['strand'] == '+'){
							$gap1_[$i] = $array[$i][$number[$i]+1]['start'] - $array[$i][$number[$i]]['end'];
						}else{
							$gap1_[$i] = $array[$i][$number[$i]]['start'] - $array[$i][$number[$i]+1]['end'];
						}
							
						$flag3_[$i] = 0;
						if($chr1_[$i] == $chr2_[$i] && $strand1_[$i] == $strand2_[$i] && $gap1_[$i] < $gap && $gap1_[$i] >= 0) {
							$flag3_[$i] = 1;
						}
						$sumFlag3 += $flag3_[$i];
					}else{
						if($flag1 == 0){
							$startRegion[$i] = 0;
							$endRegion[$i] = 0;
						}
					}
				}
				// if two species can merge continue
				if($sumFlag3 == $num_spc-1){
					$flag1 = 1;
					for($i = 1; $i <= $num_spc; $i++){
						if($name1_[$i] < $Max){
							$name1_[$i] = $array[$i][++$number[$i]]['name'];
						}
					}
				// else save current region and calculate next
				}else{
					for($i = 1; $i <= $num_spc; $i++){
					//	echo "&&&".$array[$i][$number[$i]]['chr']." ".$startRegion[$i]." ".$endRegion[$i]."\n";
						$flag1 = 0;
						if($name1_[$i] < $Max){
							$arr1_temp[$i] = array('chr' => $array[$i][$number[$i]]['chr'], 'start' => $startRegion[$i], 'end' => $endRegion[$i], 'strand' => $array[$i][$number[$i]]['strand'],'extendedstart' => $startRegion[$i]-2000, 'extendedend' => $endRegion[$i]+2000);
							$arr2_temp[$i] = array(0 => $arr1_temp[$i]);
							$arr3_temp[$array[$i][1]['species']] = $arr2_temp[$i];
							$name1_[$i] = $array[$i][++$number[$i]]['name'];
						}else{
							if($startRegion[$i] == 0){
								$arr1_temp[$i] = array('chr' => $array[$i][$number[$i]]['chr'], 'start' => 0, 'end' => 0, 'strand' => '0','extendedstart' => 0, 'extendedend' => 0);
							}else{
								$arr1_temp[$i] = array('chr' => $array[$i][$number[$i]]['chr'], 'start' => $startRegion[$i], 'end' => $endRegion[$i], 'strand' => $array[$i][$number[$i]]['strand'],'extendedstart' => $startRegion[$i]-2000, 'extendedend' => $endRegion[$i]+2000);
							}
							$arr2_temp[$i] = array(0 => $arr1_temp[$i]);
							$arr3_temp[$array[$i][1]['species']] = $arr2_temp[$i];
						}
					}
					$arrayResult['Region'.$Number]=$arr3_temp;
					$Number++;
					unset($arr3_temp);
					$arr3_temp = array();	
				}

			//if three species all have same begin (name)
			}elseif($sumFlag2 == $factorial){
				for($i = 1; $i <= $num_spc; $i++){
					if($flag1 == 0){
						$startRegion[$i] = $array[$i][$number[$i]]['start'];
						$endRegion[$i] = $array[$i][$number[$i]]['end'];
					}
				}

				$flag4 = 0;
				$flag5 = 0;
				for($i = 1; $i <= $num_spc; $i++){
					$len[$i] = $endRegion[$i] - $startRegion[$i];
					if($len[$i] == 0){
						$flag4 = 1;
					}elseif($len[$i] > $gap){
						$flag5 = 1;
					}
				}

				// save the two of three species when they have first same name and one of len large than gap
				if($flag4 == 1 && $flag5 == 1) {
					for($i = 1; $i <= $num_spc; $i++){
				//		echo "$$$$".$array[$i][$number[$i]]['chr']." ".$name1_[$i]." ".$startRegion[$i]." ".$endRegion[$i]."\n";
						$flag1 = 0;
						if($endRegion[$i] - $startRegion[$i] != 0){
							$arr1_temp[$i] = array('chr' => $array[$i][$number[$i]]['chr'], 'start' => $startRegion[$i], 'end' => $endRegion[$i], 'strand' => $array[$i][$number[$i]]['strand'],'extendedstart' => $startRegion[$i]-2000, 'extendedend' => $endRegion[$i]+2000);
							$arr2_temp[$i] = array(0 => $arr1_temp[$i]);
							$arr3_temp[$array[$i][1]['species']] = $arr2_temp[$i];
							
						}else{
							$arr1_temp[$i] = array('chr' => $array[$i][$number[$i]]['chr'], 'start' => 0, 'end' => 0, 'strand' => '0','extendedstart' => 0, 'extendedend' => 0);
							$arr2_temp[$i] = array(0 => $arr1_temp[$i]);
							$arr3_temp[$array[$i][1]['species']] = $arr2_temp[$i];
						}
						$name1_[$i] = $array[$i][$number[$i]]['name'];
					}
					$arrayResult['Region'.$Number]=$arr3_temp;
					$Number++;
					unset($arr3_temp);
					$arr3_temp = array();

				// else they don't the first time having same name
				}else{
					$sumFlag5 = 0;
					for($i = 1; $i <= $num_spc; $i++){
						$chr1_[$i] = $array[$i][$number[$i]]['chr'];
						$strand1_[$i] = $array[$i][$number[$i]]['strand'];
						$chr2_[$i] = $array[$i][$number[$i]+1]['chr'];
						$strand2_[$i] = $array[$i][$number[$i]+1]['strand'];

						$len[$i] = $endRegion[$i] - $startRegion[$i];
						if($len[$i] == 0){
							$startRegion[$i] = $array[$i][$number[$i]]['start'];
							$endRegion[$i] = $array[$i][$number[$i]]['end'];
						}else{
							if($array[$i][$number[$i]]['strand'] == '+'){
								$endRegion[$i] = $array[$i][$number[$i]]['end'];
							}else{
								$startRegion[$i] = $array[$i][$number[$i]]['start'];
							}
						}

						if($array[$i][$number[$i]]['strand'] == '+'){
							$gap1_[$i] = $array[$i][$number[$i]+1]['start'] - $array[$i][$number[$i]]['end'];
						}else{
							$gap1_[$i] = $array[$i][$number[$i]]['start'] - $array[$i][$number[$i]+1]['end'];
						}
							
						$flag5_[$i] = 0;
						if($chr1_[$i] == $chr2_[$i] && $strand1_[$i] == $strand2_[$i] && $gap1_[$i] < $gap && $gap1_[$i] >= 0) {
							$flag5_[$i] = 1;
						}
						$sumFlag5 += $flag5_[$i];
					}

					// if they can merge next data
					if($sumFlag5 == $num_spc){
						$flag1 = 1;
						for($i = 1; $i <= $num_spc; $i++){
							$name1_[$i] = $array[$i][++$number[$i]]['name'];
						}
					// else they can't merge next, so save this region
					}else{
						for($i = 1; $i <= $num_spc; $i++){
				//			echo "***".$array[$i][$number[$i]]['chr']." ".$startRegion[$i]." ".$endRegion[$i]."\n";
							$flag1 = 0;
							$arr1_temp[$i] = array('chr' => $array[$i][$number[$i]]['chr'], 'start' => $startRegion[$i], 'end' => $endRegion[$i], 'strand' => $array[$i][$number[$i]]['strand'],'extendedstart' => $startRegion[$i]-2000, 'extendedend' => $endRegion[$i]+2000);
							$arr2_temp[$i] = array(0 => $arr1_temp[$i]);
							$arr3_temp[$array[$i][1]['species']] = $arr2_temp[$i];
							$name1_[$i] = $array[$i][++$number[$i]]['name'];
						}
						$arrayResult['Region'.$Number]=$arr3_temp;
						$Number++;
						unset($arr3_temp);
						$arr3_temp = array();
					}
				}
			}

			$sumFlag1 = 0;
			$flag3 = 0;
			for($i = 1; $i <= $num_spc; $i++){
				$flag1_[$i] = 0;
				if($number[$i] < $sum[$i]){
					$flag1_[$i] = 1;
				}else{
					$flag3 = 1;
				}
				$sumFlag1 += $flag1_[$i];
			}

			//output the last region
			if($flag3 == 1){
				//echo "the last region\n";
				for($i = 1; $i <= $num_spc; $i++){
					$arr1_temp[$i] = array('chr' => $array[$i][$number[$i]]['chr'], 'start' => $startRegion[$i], 'end' => $endRegion[$i], 'strand' => $array[$i][$number[$i]]['strand'],'extendedstart' => $startRegion[$i]-2000, 'extendedend' => $endRegion[$i]+2000);
					$arr2_temp[$i] = array(0 => $arr1_temp[$i]);
					$arr3_temp[$array[$i][1]['species']] = $arr2_temp[$i];
				}
				$arrayResult['Region'.$Number]=$arr3_temp;
				//print_r($arrayResult['Region'.$Number]); echo "\n";
			}
		}
		//echo "the number of result is ".$Number."\n";
		/*
		foreach($arrayResult as $key => $value1){
			foreach($value1 as $species => $value2){
				echo $key." ".$species." ".$value2[0]['chr']." ".$value2[0]['start']." ".$value2[0]['end']." ".$value2[0]['strand']." ".$value2[0]['extendedstart']." ".$value2[0]['extendedend']."\n";
			}
			echo "\n";
		}*/
		
		//merge regions again
		for($i=1; $i< $Number-1;$i++){
			$key1='Region'.$i;
			for($j=$i+1; $j < $Number;){
				$key2='Region'.$j;
				//echo $key1." ".$key2."<br/>";
				$flag6 = 0;
				$sumFlag6 = 0;
				for($n = 1; $n <= $num_spc; $n++){
					$flag6_[$n] = 0;
					$gap2_[$n] = 0;
					if($arrayResult[$key1][$array[$n][1]['species']]['0']['chr'] == $arrayResult[$key2][$array[$n][1]['species']]['0']['chr'] && $arrayResult[$key1][$array[$n][1]['species']]['0']['strand'] == $arrayResult[$key2][$array[$n][1]['species']]['0']['strand']){
						if($arrayResult[$key1][$array[$n][1]['species']]['0']['strand'] == '+'){
							$gap2_[$n] = $arrayResult[$key2][$array[$n][1]['species']]['0']['start'] - $arrayResult[$key1][$array[$n][1]['species']]['0']['end'];
						}else{
							$gap2_[$n] = $arrayResult[$key1][$array[$n][1]['species']]['0']['start'] - $arrayResult[$key2][$array[$n][1]['species']]['0']['end'];
						}
						
						$flag6_[$n] = 0;
						if($gap2_[$n] < 0 || $gap2_[$n] > $gap){
							$j++;
							$flag6 = 1;
							break;
						}elseif($gap2_[$n] <= $gap){
							$flag6_[$n] = 1;
							$sumFlag6 += $flag6_[$n];
						}
					}else{
						break;
					}
				}
				
				if($flag6 == 1){
					break;
				}
				
				if($sumFlag6 == $num_spc){
					for($n = 1; $n <= $num_spc; $n++){
						if($arrayResult[$key1][$array[$n][1]['species']]['0']['strand'] == '+'){
							$arrayResult[$key1][$array[$n][1]['species']]['0']['end'] = $arrayResult[$key2][$array[$n][1]['species']]['0']['end'];
							$arrayResult[$key1][$array[$n][1]['species']]['0']['extendedend'] = $arrayResult[$key2][$array[$n][1]['species']]['0']['extendedend'];
						}else{
							$arrayResult[$key1][$array[$n][1]['species']]['0']['start'] = $arrayResult[$key2][$array[$n][1]['species']]['0']['start'];
							$arrayResult[$key1][$array[$n][1]['species']]['0']['extendedstart'] = $arrayResult[$key2][$array[$n][1]['species']]['0']['extendedstart'];
						}
					}
					for($k=$j; $k < $Number; $k++){
						$key3='Region'.$k;
						$l=$k+1;
						$key4='Region'.$l;
						for($n = 1; $n <= $num_spc; $n++){
							$arrayResult[$key3][$array[$n][1]['species']]['0']['chr'] = $arrayResult[$key4][$array[$n][1]['species']]['0']['chr'];
							$arrayResult[$key3][$array[$n][1]['species']]['0']['start'] = $arrayResult[$key4][$array[$n][1]['species']]['0']['start'];
							$arrayResult[$key3][$array[$n][1]['species']]['0']['end'] = $arrayResult[$key4][$array[$n][1]['species']]['0']['end'];
							$arrayResult[$key3][$array[$n][1]['species']]['0']['strand'] = $arrayResult[$key4][$array[$n][1]['species']]['0']['strand'];
							$arrayResult[$key3][$array[$n][1]['species']]['0']['extendedstart'] = $arrayResult[$key4][$array[$n][1]['species']]['0']['extendedstart'];
							$arrayResult[$key3][$array[$n][1]['species']]['0']['extendedend'] = $arrayResult[$key4][$array[$n][1]['species']]['0']['extendedend'];
						}
					}
					array_pop($arrayResult);
					$Number--;
					$j++;
				}else{
					$j++;
				}
			}
		}  //end merge region again
		/*
		foreach($arrayResult as $key => $value1){
			foreach($value1 as $species => $value2){
				echo $key." ".$species." ".$value2[0]['chr']." ".$value2[0]['start']." ".$value2[0]['end']." ".$value2[0]['strand']." ".$value2[0]['extendedstart']." ".$value2[0]['extendedend']."\n";
			}
			echo "\n";
		}*/
				
		//delete the regions that have the max length less than the value of gap
		$gap2 = ($geneEnd-$geneStart)/50;
		$Result = array();
		$nn = 1;
		foreach($arrayResult as $key => $value1){
			$sumFlag7 = 0;
			for($n = 1; $n <= $num_spc; $n++){
				$flag7_[$n] = 0;
				$length[$n] = $arrayResult[$key][$array[$n][1]['species']]['0']['end'] - $arrayResult[$key][$array[$n][1]['species']]['0']['start'];
				if($length[$n] >= $gap2){
					$flag7_[$n] = 1;
					$sumFlag7 += $flag7_[$n];
				}
				if($length[$n] != 0 && $length[$n] < $gap2){
					unset($arrayResult[$key][$array[$n][1]['species']]);
				}
			}
			
			if($sumFlag7 == $num_spc){
				$Result['Region'.$nn++] = $arrayResult[$key];
			}
		}
		/*
		foreach($Result as $key => $value1){
			foreach($value1 as $species => $value2){
				echo $key." ".$species." ".$value2[0]['chr']." ".$value2[0]['start']." ".$value2[0]['end']." ".$value2[0]['strand']." ".$value2[0]['extendedstart']." ".$value2[0]['extendedend']."\n";
			}
			echo "\n";
		}*/
		mysqli_close($mysqlcon);
		return $Result;
	}
?>