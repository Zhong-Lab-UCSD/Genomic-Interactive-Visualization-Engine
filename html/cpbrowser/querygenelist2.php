<?php

	// acquire the form information
	require_once(realpath(dirname(__FILE__) . "/../../includes/common_func.php"));
	$mysqli = connectCPB();
	$species = $mysqli->real_escape_string($_REQUEST["species"]);
	$position = $mysqli->real_escape_string($_REQUEST["geneName"]);
 	$genePosition = preg_split("/[\s-:]+/",$position);
 	
 	$chromosome = strtolower($genePosition[0]);
 	$geneStart = $genePosition[1];
 	$geneEnd = $genePosition[2];

	//This use to the CEpBrowser php
	$arrSpeciesDbInit=array("hg19"=>"hg19","mm9"=>"mm9","susScr2"=>"susScr2");	
		
	// Other species need to query and it coressponding database name
	$arrSpeciesDb=array();
    if(array_key_exists($species,$arrSpeciesDbInit)){
        $arrSpeciesDb = array_diff($arrSpeciesDbInit,array($species => $arrSpeciesDbInit[$species]));
    }else{
        die("Error:$species<br/>");
    }
	
	//traverse three species to find gene name
	$sql1="select * from $arrSpeciesDbInit[$species].multishade where chrom='$chromosome' AND chromStart>='$geneStart' AND chromEnd<='$geneEnd'";
	$result = $mysqli->query($sql1);
	
	$region=array();
	
	$arr_1=array();// Keep the finish result, it also means the first dimension of the array
	if(mysql_num_rows($result)) {
		while($row1 = $result->fetch_assoc()) {
			$genename = $row1['name'];
			$str1 = "$arrSpeciesDbInit[$species] $row1[chrom]:$row1[chromStart]--$row1[chromEnd] $row1[strand] $row1[name]<br/>";
			echo $str1;
			// The fourth dimension of the array
			$arr_4=array("chr" => $row1['chrom'],
						"start" => $row1['chromStart'],
						"end" => $row1['chromEnd'],
						"strand" => $row1['strand']
			            );
			// The gene name exists, num++
			if(array_key_exists($genename,$arr_1)){
				$arr_3_key = array_keys($arr_1[$genename][$species]);// The array Key of the third dimension array, like NUM_xx
				$max_key = 0;
				foreach($arr_3_key as  $skey){// Search the max value in NUM_xx
					$akey = substr($skey,strpos($skey,'_')+1) + 0;
					if($max_key < $akey){
						$max_key = $akey;	
					}	
				}
				$max_key++;
				$arr_3=array("$max_key" => $arr_4);// General the result of the third array
				$arr_2=array($arrSpeciesDbInit[$species] => array_merge($arr_1[$genename][$species],$arr_3));// Merge the new array and get the result of the second array
				$arr_1[$genename]=$arr_2;// Point to the new array of the second dimension
				continue;// Have queried the gene name in other spicies, so don't need to query again
			}else{
				$arr_3=array("0" => $arr_4);// The first time to query the gene name
				$arr_2=array($arrSpeciesDbInit[$species] => $arr_3);
				$arr_1[$genename]=$arr_2;
			}

			foreach($arrSpeciesDb as $speci => $dbname){// Search the gene position by gene name in other species one by one
				$sql2 = "select * from $dbname.multishade where name='$genename'";
				$result_spe2 = $mysqli->query($sql2);
				if($result_spe2){
					while($row2 = $result_spe2->fetch_assoc()){
						$str2 = "$dbname $row2[chrom]:$row2[chromStart]--$row2[chromEnd] $row2[strand] $row2[name]<br/>";
						echo $str2;	
						$arr_4=array("chr"=> $row2['chrom'],
									"start" => $row2['chromStart'],
									"end" => $row2['chromEnd'],
									"strand" => $row2['strand']
									);
						if(array_key_exists($speci,$arr_1[$genename])){// The species information has existed, need to consider NUM++ in the third dimension array
							$arr_3_key = array_keys($arr_1[$genename][$speci]);
							$max_key = 0;
							foreach($arr_3_key as  $skey){
								$akey = substr($skey,strpos($skey,'_')+1) + 0;
								if($max_key < $akey){
									$max_key = $akey;	
								}	
							}
							$max_key++;
							$arr_3=array("$max_key" => $arr_4);
							$arr_2=array($arrSpeciesDbInit[$speci] => array_merge($arr_1[$genename][$speci],$arr_3));// Merge
						}else{
							$arr_3=array("0" => $arr_4);
							$arr_2=array($arrSpeciesDbInit[$speci] => $arr_3);
						}			
						$arr_1[$genename]=array_merge($arr_1[$genename],$arr_2);// Merge
					}
				}else{
					//echo "$dbname: Not found $genename <br/>";
				}
			}
		}
		
	}else{
		//echo "Not found any gene~";
	}
	
	//merge the gene region according to the same gene
	// Don't consider "strand" value, according to the end_arr of the first insert
	$result=array();		
	foreach($arr_1 as $gName => $arrTmp_2){
		$geneName = substr($gName,0,strpos($gName,'_'));
		if(array_key_exists($geneName,$result)){// The gene exist, such as "OR4F17"
			foreach($arrTmp_2 as $speName => $arrTmp_3){// Merge the result according to the each species
				if(array_key_exists($speName,$result[$geneName])){// The species exist, such as "human"
					foreach($arrTmp_3 as $num => $arrTmp_4){// Merge the result according to the "Num"
						if(array_key_exists($num,$result[$geneName][$speName])){//it's "num" exist, such as "num_1"
							if($result[$geneName][$speName][$num]["chr"] == $arrTmp_4["chr"]){// How to deal with the different "chr". The "chr" must equal so can merge
								$old_start = $result[$geneName][$speName][$num]["start"] + 0;
								$old_end  = $result[$geneName][$speName][$num]["end"] + 0;
								$now_start = $arrTmp_4["start"]+ 0;
								$now_end = $arrTmp_4["end"]+ 0;
								// Update the "start" and "end"
								if($now_start < $old_start){
									$result[$geneName][$speName][$num]["start"] = $now_start;
								}
								if($now_end > $old_end){
									$result[$geneName][$speName][$num]["end"] = $now_end;
								}
							}
						}else{
							$result[$geneName][$speName][$num] = $arrTmp_4;
						}
					}
				}else{
					$result[$geneName][$speName] = $arrTmp_3;
				}
			}
			
		}else{
			$result[$geneName] = $arrTmp_2;
		}
	}

	$mysqli->close();
?> 
