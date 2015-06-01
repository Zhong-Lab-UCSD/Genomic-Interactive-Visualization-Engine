<?php
	require_once (realpath(dirname(__FILE__) . '/../../includes/common_func.php'));
	set_time_limit(0);
	ini_set("memory_limit", "40960M");
	$bwfile = new BigWigFile('http://hgdownload.cse.ucsc.edu/goldenPath/mm9/encodeDCC/wgEncodeUwDgf/wgEncodeUwDgfZhbtc4129olaME0Diffb24hRawRep1.bigWig', true);
	//var_dump($bwfile->getSummaryStatsSingleRegion($region, 100));
	$hist = new HistElement();
//	$region = new ChromRegion('chr1', 9000000, 9100000);
//	var_dump($bwfile->getHistSingleRegion($region, $hist));
?>
