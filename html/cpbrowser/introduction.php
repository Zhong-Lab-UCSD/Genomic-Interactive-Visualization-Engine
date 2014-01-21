<style type="text/css">
<!--
body {
	margin-right: 15px;
	margin-top: 0;
	margin-bottom: 0;
	margin-left: 5px;
	overflow: visible;
}
-->
</style>
<body>
<p class="normaltext"><strong>CEpBrowser</strong> (<strong>C</strong>omparative <strong>Ep</strong>igenome <strong>Browser</strong>) is a gene-centric genome browser that visualize the genomic features of multiple species with color-coded orthologous regions, aiding users in comparative genomic research. The genome browser is adapted from UCSC Genome Browser and the orthologous regions are generated from cross-species lift-over pairs.</p>
<p class="Header1">Quick Manual</p>
<p class="normaltext">To use Comparative EpiGenome Browser, just select the wanted species and look the gene in interest up in the <span class="panel">gene query</span> panel. CEpBrowser will try to automatically complete your entry if possible. If there are more than one genes that match the query, the location, gene name and all other genes in the ortholog group will be shown in <span class="panel">gene information</span> panel and can be visualized via the
  <input name="Visualize" type="button" id="Visualize" value="Visualize" />
  button.</p>
<p class="normaltext">In visualization of genes, a split vision of all the selected species is shown and regions that are orthologous within a gene contextual region will be shaded in color. A &quot;gene context&quot; is defined by a region including gene body and the flanking regions with a length of 10kbp or 100% of gene body (whichever is larger). There are a total of 16 colors in the shades and the regions with the same color (lighter and darker colors are different) are within the same orthologous group. The visualization can be  navigated in synchronization for all the species via the <span class="panel">navigation</span> panel.</p>
<p class="normaltext">In the cases when there are more than 16 distinct orthologous regions within one gene context, a track named &quot;Multi-species Alignment Track&quot; will display the name of every orthologous region group to identify the orthologs across species. The track will also show the direction of orthologous regions.</p>
<p class="normaltext"><a href="manual.html" target="_self">Click here to read a detailed manual.</a></p>
<p class="normaltext"><strong>CEpBrowser now has incorporated ENCODE data to help facilitate in-depth research</strong>. Please visit <a href="http://encode.cepbrowser.org/" target="_top">http://encode.cepbrowser.org/</a> to enable ENCODE data. <a href="Tutorial/index.html" target="_blank">Click here for a  demonstration of CEpBrowser with ENCODE data.</a></p>
<p class="normaltext">If you have any questions or comments regarding to Comparative Epigenome Browser, you may contact us by sending an email to Xiaoyi Cao (<a href='mailt&#111;&#58;x9%&#54;3%61o&#37;&#52;0%&#55;5&#99;s&#100;&#46;ed&#117;'>x9cao <strong>at</strong> ucsd <strong>dot</strong> edu</a>). </p>
<p class="Header1">Release Notes</p>
<p class="normaltext"><strong>1/20/2014</strong></p>
<ul class="normalnotes">
  <li>Minor UI update to improve UI consistency across different browsers and preparation for the next major update.  </li>
  <li>Fixed some error in links.</li>
</ul>
<p class="normaltext"><strong>12/16/2013</strong></p>
<ul class="normalnotes">
  <li>Minor UI update to increase the dense view color resolution and to enable track transparency for ENCODE tracks.  </li>
</ul>
<p class="normaltext"><strong>12/10/2013</strong></p>
<ul class="normalnotes">
  <li>Added ENCODE data support. ENCODE data now can be accessed via <a href="http://encode.cepbrowser.org/" target="_top">http://encode.cepbrowser.org/</a></li>
  <li>Major UI update.
    <ul>
      <li>The button to invoke <strong><span class="panel">Tracks &amp; Data</span> panel</strong> has been moved to top level (in <span class="panel"><strong>Gene Query</strong></span><strong> panel</strong>) so that it is accessble even without displaying any genes.</li>
      <li>Rearranged species selection region.</li>
    </ul>
  </li>
</ul>
<p class="normaltext"><a href="notes.txt" target="_blank">(Older release notes)</a></p>
