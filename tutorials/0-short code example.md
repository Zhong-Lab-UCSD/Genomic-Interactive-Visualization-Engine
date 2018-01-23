# GIVE Tutorial 0: Building a Customized Genome Browser within 2 minutes

Just copy paste the two following lines to jsfiddle (https://jsfiddle.net), an online HTML testing website for testing of your own HTML codes. 
1) Go to  jsfiddle;
2) Copy paste the following lines to the HTML panel (top left);
```
<script src="https://www.givengine.org/libWC/webcomponents-lite.min.js"></script> 
<link rel="import" href="https://www.givengine.org/lib/chart-controller/chart-controller.html">
<!-- Embed the browser in your web page -->
<chart-controller title-text="long-range promoter contacts with capture Hi-C" ref="hg19" num-of-subs="2" coordinates='["chr18:19140000-19450000", "chr18:19140000-19450000"]' group-id-list='["genes", "CHi-C_promoter", "customTracks"]'>
</chart-controller>
```
3) Hit "run" button.
4) Congratulations! You will see your first genome browser HTML page. You can modify it at your wish.


