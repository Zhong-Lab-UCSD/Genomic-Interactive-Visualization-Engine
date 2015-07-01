<?php
	require_once (realpath(dirname(__FILE__) . '/../../includes/common_func.php'));	
	require_once (realpath(dirname(__FILE__) . "/../../includes/session.php"));
	
	$res = initialize_session();
	$encodeOn = $res['encodeOn'];
	$in_debug = $res['in_debug'];
	$genemoOn = $res['genemoOn'];
	unset($res);
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="keywords" content="CepBrowser Manual,Genome Browser,Visualization" />
<meta name="description" content="This is the manual for CEpBrowser (Comparative Epigenome Browser). In CEpBrowser, genomes from multiple species are be shown side by side to enhance the comparison of various features, such as transcript information, epigenomic modifications, SNP's, transcription factor binding sites and so on, aiding users in comparative genomic research." />
<title>GENEMO Manual</title>
<link href='http://fonts.googleapis.com/css?family=Roboto:500,400italic,700italic,700,400' rel='stylesheet' type='text/css'>
<link href="mainstyles.css" rel="stylesheet" type="text/css" />
<style type="text/css">
<!--
#GeneLookUp {
	width: 270px;
}
#geneInformation {
	width: 270px;
}
#colorPalette {
	width: 200px;
}
#Navigation {
	width: 270px;
}
#SampleSelection {
	width: 300px;
}
#TrackSetting {
	width: 366px;
}
#encodeLogo {
	border: none;
}
body {
	background-color: #FFFFFF;
	margin-right: 15px;
	margin-top: 5px;
	margin-bottom: 5px;
	margin-left: 5px;
	overflow: auto;
}
.style1 {
	color: #FFFFFF
}
.style2 {
	font-family: Arial, Helvetica, sans-serif;
	font-size: 14px;
	line-height: 21px;
	margin-left: 10px;
	padding-left: 5px;
}
.style2 li {
	margin-left: -20px;
}
-->
</style>
</head>

<body>
<?php include_once(realpath(dirname(__FILE__) . '/../../includes/analyticstracking.php')); ?>
<a name="top" id="top"></a>
<p class="Title">GENEMO Search Manual </p>
<p class="Header1"><a href="#top"></a>Index</p>
<ul>
  <li class="style2"><a href="#intro">Introduction</a></li>
  <li class="style2"><a href="#datasets">Available Datasets</a>
  </li>
  <li class="style2"><a href="#usage">Using GENEMO Search </a>
    <ul>
      <li><a href="#input">Select Input Data</a></li>
      <li><a href="#output">Visualizing Output</a></li>
    </ul>
  </li>
  <li class="style2"><a href="#contact">Contact Us</a></li>
  <li class="style2"><a href="#reference">References</a></li>
</ul>
<p class="Header1"><a href="#top"><img src="images/index.png" alt="to index" width="61" height="15" /></a><a name="intro" id="intro"></a>Introduction</p>
<p class="normaltext">GENEMO Search is a genome-wide search engine developed to search local maximum similar regions between epigenetics study by Zhong Lab in University of California, San Diego.</p>
<p class="normaltext">In GENEMO Search, you can easily search local maximum similar regions among <a href="http://www.genome.gov/10005107" target="_blank">Encyclopedia of DNA Elements</a> (ENCODE) and mouseENCODE database entries in human or mouse, including chromatin accessibility, histone modification, transcription factor binding sites and DNase-seq peaks. Figure 1 below shows the goal of GENEMO Search.
<p class="inlineImage"><img src="images/Figure_1_Mechanism.png" alt="GENEMO Search Goals" width="550" height="172" /><br />
<span class="panel">Figure 1</span>. The goal of GENEMO Search. GENEMO Search can be used to find the local maximum similar regions between user input and all selected tracks. In this example, <em>M</em> tracks that may contain DNase-Seq, TFBS or histone modifications data are chosen, and <em>K</em> local similar regions are found in the result.</p>
<div style="clear: both;"></div>
<p class="normaltext">You can submit a peak file from your experiment to search ENCODE database for similar regions across the genome.</p>
<p class="normaltext">The gene track displaying mechanism in GENEMO Search is powered by UCSC Genome Browser (<a href="http://genome.ucsc.edu/">http://genome.ucsc.edu/</a>)<sup><a name="cite1_ref" id="cite1_ref"></a><a href="#cite1">[1]</a></sup> with some source modification.</p>
<p class="Header1"><a href="#top"><img src="images/index.png" alt="to index" width="61" height="15" /></a> <a name="datasets" id="datasets"></a>Available Datasets</p>
<p class="normaltext">So far there are three species supported in GENEMO Search:</p>
<ul class="normalnotes">
  <li>Homo sapiens (human), reference sequence <a href="/cgi-bin/hgGateway?clade=mammal&amp;org=Mouse" target="_blank">GRCh37/hg19</a>.<sup><a name="cite4_ref" id="cite4_ref"></a><a href="#cite4">[2]</a></sup></li>
  <li>Mus musculus (mouse), reference sequence <a href="/cgi-bin/hgGateway?clade=mammal&amp;org=Mouse&amp;db=mm9" target="_blank">NCBI37/mm9</a>.<sup><a name="cite5_ref" id="cite5_ref"></a><a href="#cite5">[3]</a></sup></li>
</ul>
<div style="clear: both;"></div>
<div class="embededImage" id="encodeLogo"><img src="images/ENCODE_scaleup_logo.png" width="170" height="102" alt="ENCODE Logo" /></div>
<p class="normaltext">ENCODE and mouseENCODE data are incorporated in GENEMO for search, visualization and providing better insights from the vast amount data within the project.</p>
<p class="normaltext">To learn more about ENCODE and mouseENCODE, please check the following websites:</p>
<ul class="normalnotes">
  <li><a href="http://genome.ucsc.edu/encode/">ENCODE Project</a> and <a href="http://chromosome.sdsc.edu/mouse/download.html">mouseENCODE Project</a></li>
  <li>ENCODE Data Matrix (<a href="http://genome.ucsc.edu/encode/dataMatrix/encodeDataMatrixHuman.html">human</a> and <a href="http://genome.ucsc.edu/encode/dataMatrix/encodeDataMatrixMouse.html">mouse</a>)</li>
</ul>
<p class="Header1"><a href="#top"><img src="images/index.png" alt="to index" width="61" height="15" /></a><a name="usage" id="intro3"></a>Using GENOMO Search</p>
<p class="normaltext">The user interface contains four panels: <span class="panel">Search ENCODE Data</span> panel, <span class="panel">gene / region selection</span> panel, <span class="panel">navigation</span> panel and <span class="panel">visualization</span> panel. The left panels can be folded so that all the panels can be accessible under smaller screen resolution. The entire left panel group can also be hidden to further provide space for the <span class="panel">visualization</span> panel.</p>
<p class="Header2"><a href="#top"><img src="images/index_sub.png" alt="to index" width="47" height="10" /></a><a name="input" id="intro4"></a>Select Input Data</p>
<div class="embededImage" id="GeneLookUp"> <img src="images/Figure_2_SearchPanel.png" alt="Gene Lookup Panel" width="260" height="399" /><br />
<span class="panel"><strong>Figure 2.</strong></span> <span class="panel">Search ENCODE data</span> panel in GENEMO Search.</div>
<p class="normaltext">User can use <span class="panel">Search ENCODE Data</span> panel to provide input data in GENEMO Search (see Figure 2 to the right). Please initiate search by specifying the following: </p>
<ul class="normalnotes">
  <li>Choose a reference genome you would like to search against. </li>
  <li>Specify your custom peak file. Either put your file on a public server and provide the URL in <strong>URL for data file</strong> field, or directly upload the file with <strong>UPLOAD LOCAL FILE</strong> button. The input peak file should be in BED or peaks format. It must have three columns: chromosome name, start position and end position. </li>
  <li>(Optional) Choose tracks/data you want to compare by clicking <strong>DATA SELECTION</strong> button. There are three ways to choose comparison track files from dataset: use all ENCODE data, choose by sample type, or directly choose some tracks that you want to compare with. Some tracks from embryonic stem cells are chosen by default.</li>
  <li>(Optional) Provide your email address. If you choose too many tracks, GENEMO Search may take dozens of minutes or more than one hour to finish the computation. If an email address has been provided, after the calculation, you will receive an email with a URL, with which the results can be visualized.</li>
  <li>(Optional) If your peak file comes from some analog data (wig or bigWig format), you may provide a URL of the original file for display purposes in <strong>Display file URL</strong> field. This file will not be used in computation.</li>
</ul>
<p class="normaltext">After provided your input, please click <strong>SEARCH</strong> button to begin.</p>
<div style="clear: both;"></div>
<p class="Header2"><a href="#top"><img src="images/index_sub.png" alt="to index" width="47" height="10" /></a><a name="output" id="output"></a>Visualizing Output</p>
<p class="normaltext">The output include  <span class="panel">Gene / Region Selection</span> panel, <span class="panel">Navigation</span> panel and <span class="panel">Visualization</span> panel, which is  the most important (see Figure 3 below). After the calculation is complete, the resulting gene regions will be shown in <span class="panel">Gene / Region Selection</span> panel. The results will be ordered according to  scores from the algorithm. Select the Visualize button for any one result to visualize it in the <span class="panel">Visualization</span> panel.</p>
<p class="normaltext">The&nbsp;<span class="panel">Navigation</span>&nbsp;panel  is provided to navigate through the selected gene region. There are  two types of controls in the navigation panel: sliding controls enable user to  slide to the upstream / downstream region of the current view; zooming controls  allow user to zoom in / out a certain part of the genome.</p>
<p class="inlineImage"><img src="images/Figure_3_UI.png" alt="GENEMO Search Goals" width="600" height="293" /><br />
<span class="panel">Figure 3</span>. This example of the output  shows the result from the input file. The <span class="panel">Search ENCODE Data </span>Panel (collapsed), <span class="panel">Gene / Region Selection</span> Panel, <span class="panel">Navigation</span> Panel and <span class="panel">Visualization</span> Panel are shown.</p>
<div style="clear: both;"></div><p class="Header1"><a href="#top"><img src="images/index.png" alt="to index" width="61" height="15" /></a><a name="contact" id="intro9"></a>Contact Us</p>
<p class="normaltext">If you have any questions or comments regarding to Comparative Epigenome Browser, you may contact us by sending an email to Xiaoyi Cao (<a href='mailt&#111;&#58;x9%&#54;3%61o&#37;&#52;0%&#55;5&#99;s&#100;&#46;ed&#117;'>x9cao <strong>at</strong> ucsd <strong>dot</strong> edu</a>). </p>
<p class="Header1"><a href="#top"><img src="images/index.png" alt="to index" width="61" height="15" /></a><a name="reference" id="intro7"></a>References</p>
<ol class="normaltext">
  <li><a name="cite1" id="cite1"></a> <a href="#cite1_ref">↑</a>Kent WJ, <em>et al.</em> (2002) <a href="http://www.genome.org/cgi/content/abstract/12/6/996" target="_blank">The human genome browser at UCSC</a>. <em>Genome Research </em>12(6): 996-1006.</li>
  <li><a name="cite4" id="cite4"></a> <a href="#cite4_ref">↑</a>International Human Genome Sequencing Consortium (2001). <a href="http://www.nature.com/nature/journal/v409/n6822/abs/409860a0.html" target="_blank">Initial sequencing and analysis of the human genome</a>. <em>Nature,</em> 409: 860-921.</li>
  <li> <a name="cite5" id="cite5"></a> <a href="#cite5_ref">↑</a>Mouse Genome Sequencing Consortium (2002). <a href="http://www.nature.com/nature/mousegenome/" target="_blank">Initial sequencing and comparative analysis of the mouse genome</a>. <em>Nature</em>, 420, 520-562. <br />
  </li>
</ol>
</body>
</html>
