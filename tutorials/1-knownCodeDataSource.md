# GIVE Tutorial 1: Building a Customized Genome Browser with Existing Code and Data Source

This tutorial will show you how to use existing code base and data source to implement a customized genome browser

## Table of Contents
*   [Prerequisites](#prerequisites)
    *   [Using the public folder of Zhong Lab Web Server](#using-the-public-folder-of-zhong-lab-web-server)
*   [Building a full-fledged genome browser](#building-a-full-fledged-genome-browser)
*   [Embedding a full-fledged genome browser in existing pages](#embedding-a-full-fledged-genome-browser-in-existing-pages)
*   [Embedding the browser panel only in existing pages](#embedding-the-browser-panel-only-in-existing-pages)
*   [Tweak elements in the embedded browser](#tweak-elements-in-the-embedded-browser)
    *   [Change your reference genome](#change-your-reference-genome)
    *   [Change the number of sub-views for interactions](#change-the-number-of-sub-views-for-interactions)
    *   [Change the coordinates showing in the browser](#change-the-coordinates-showing-in-the-browser)
    *   [Change the data shown in the browser](#change-the-data-shown-in-the-browser)
*   [API documentation](#api-documentation)

## Prerequisites

To follow the tutorial, a functional web server is required. There are several web server solutions that can be used for this purpose. You may choose one of the following to set up a permanent or temporary server on your computer, or use some online resources.

*   [Apache Server](https://httpd.apache.org/docs/2.4/getting-started.html) (Windows and Linux supported, also [included in Mac OS](https://www.lifewire.com/use-your-mac-to-share-web-site-2260400))
*   [NGINX](https://www.nginx.com/resources/wiki/start/topics/tutorials/install/) (Windows and Linux supported, Mac OS support needs additional work)
*   [Internet Information Services (IIS)](https://www.iis.net/learn/get-started/getting-started-with-iis) (Included in Windows)
*   [Python `SimpleHTTPServer` module](https://docs.python.org/2/library/simplehttpserver.html) (Windows, Mac OS, Linux supported)
*   [CodePen](https://codepen.io/pen/), a powerful real-time HTML/CSS/JS code simulator for testing purposes.
*   [JSFiddle](https://jsfiddle.net/), also a powerful real-time HTML/CSS/JS code simulator

### Using the public folder of Zhong Lab Web Server

Our lab server at `sysbio.ucsd.edu` also provides a public folder from which you may host web pages. If you have a user account at the server, you may request having a hosting folder (if you haven't got one already) by [sending email to Xiaoyi Cao](mailto:x9cao@eng.ucsd.edu).

The public folder is `/var/www/html/public/<your username>`, under which you may put your files to be hosted. The URL to access the hosted files follows this rule: anything under `/var/www/html/public/` is mapped to `http(s)://sysbio.ucsd.edu/public/`. Therefore, the following file:

```
/var/www/html/public/<your username>/testingSite/index.html
```

will be accessible via the following URLs:

```
http://sysbio.ucsd.edu/public/<your username>/testingSite/index.html
https://sysbio.ucsd.edu/public/<your username>/testingSite/index.html
```

Please note that file and directory names are case-sensitive so `index.html` and `Index.html` will refer to different files.

## Building a full-fledged genome browser

Here we start by using GIVE code base together with the data sources. With them it will be extremely easy to create a genome browser by generating an HTML file under your web hosting folder simply as following (key lines in the HTML file are preceded by comments in `<!-- -->` to show their functionality):

```html
<!doctype html>
<html>
  <head>
    <title>GIVe (Genomic Interaction Visualizer)</title>
    <!-- Polyfill Web Components for browsers without native support -->
    <script src="https://beta.give.genemo.org/components/bower_components/webcomponentsjs/webcomponents-lite.min.js"></script>
    <!-- Import GIVE component -->
    <link rel="import" href="https://beta.give.genemo.org/components/bower_components/genemo-visual-components/chart-controller/chart-controller.html">
  </head>
  <body>
    <!-- Embed the browser in your web page -->
    <chart-controller ref="mm10" coordinates='["chr17:35504032-35512777"]'
      group-id-list='["genes", "singleCell", "customTracks"]'>
    </chart-controller>
  </body>
</html>
```
When you visit the HTML page, you will get a full-fledged genome browser. [Click here to see a live demo of this file.](https://sysbio.ucsd.edu/public/xcao3/testBrowser/chart-controller-demo.html)

## Embedding a full-fledged genome browser in existing pages

If you are trying to embed a genome browser into an existing pages, you need to put the Polyfill code and the importing code *first but only once in the page*, then use the embedding code in a container you want to put the browser in.

> Note that the container (for example, a `<div>`) should have its CSS `position` property set as non-`static` (such as `absolute`, `relative`, or `fixed`) and its dimension well-defined (either by explicitly setting the values, or use `flex-box` model). This applies to all embedding elements in GIVE, including `<chart-controller>` and `<chart-area>`.

The following code is an example of embedding:

```html
<!-- Polyfill Web Components for browsers without native support -->
<script src="https://beta.give.genemo.org/components/bower_components/webcomponentsjs/webcomponents-lite.min.js"></script>
<!-- Import GIVE component -->
<link rel="import" href="https://beta.give.genemo.org/components/bower_components/genemo-visual-components/chart-controller/chart-controller.html">
<!-- Embed the browser in your web page -->
<chart-controller ref="mm10" coordinates='["chr17:35504032-35512777"]'
  group-id-list='["genes", "singleCell", "customTracks"]'>
</chart-controller>
```

Live embedding examples are available on [CodePen](https://codepen.io/anon/pen/PpggQG) or [JSFiddle](https://jsfiddle.net/xycao/8p3g15w6/)

## Embedding the browser panel only in existing pages

By using the `<chart-area>` element instead of `<chart-controller>` element, it is possible to embed the browser panel (the panel with all the visualized data) only, instead of the whole thing.

(Note that the both the importing part and embedding part has been changed.)

```html
<!-- Polyfill Web Components for browsers without native support -->
<script src="https://beta.give.genemo.org/components/bower_components/webcomponentsjs/webcomponents-lite.min.js"></script>
<!-- Import GIVE component -->
<link rel="import" href="https://beta.give.genemo.org/components/bower_components/genemo-visual-components/chart-area/chart-area.html">
<!-- Embed the browser in your web page -->
<chart-area ref="mm10" coordinates='["chr17:35504032-35512777"]'
  group-id-list='["genes", "singleCell", "customTracks"]'>
</chart-area>
```
Live embedding examples are available on [CodePen](https://codepen.io/anon/pen/OpGYXz) or [JSFiddle](https://jsfiddle.net/xycao/pzg3q336/)

## Tweak elements in the embedded browser

GIVE provides several ways to tweak the embedded browser by specifying the corresponding HTML attributes. Most of the attributes will be applicable to both `<chart-controller>` and `<chart-area>` elements unless otherwise specified.

### Change your reference genome

By specifying the `ref` attribute, you may change the reference genome used in the browser. Currently the following references are supported:
*   Human: `hg19` and `hg38`
*   Mouse: `mm9` and `mm10`

For example, the following embedding codes can be used to use `hg19` as the reference genome (Polyfill and importing codes are omitted here): ([CodePen demo](https://codepen.io/anon/pen/KWYjgp), [JSFiddle demo](https://jsfiddle.net/xycao/amqqfaa8/))

```html
<chart-controller ref="hg19" coordinates='["chr6:31130000-31137000"]'
  group-id-list='["genes", "encode", "customTracks"]'>
</chart-controller>
```

### Change the number of sub-views for interactions

GIVE supports multiple sub-views to better visualize interactions among different regions across the genome. by specifying the `num-of-subs` attribute, you may show multiple views in your embedded browser. ([CodePen demo](https://codepen.io/anon/pen/QpPXry), [JSFiddle demo](https://jsfiddle.net/xycao/fzjukneb/))

```html
<chart-controller ref="hg19" num-of-subs="2"
  group-id-list='["genes", "interaction", "customTracks"]'>
</chart-controller>
```

### Change the coordinates showing in the browser

To change the coordinates that are showed in the browser, use `coordinates` attribute. `coordinates` should be specified in JSON array format (notice that double quotes `""` should be used to quote the string).

```html
<chart-controller ref="hg38" num-of-subs="2"
  coordinates='["chrX:73800000-73870000", "chrX:40000000-90000000"]'
  group-id-list='["genes", "interaction", "customTracks"]'>
</chart-controller>
```
### Change the data shown in the browser

GIVE server provides several known data groups. By specifying `group-id-list` attribute, you can choose what data you would like to show in your browser. `group-id-list` should also be specified in JSON array format.

The data source on our server currently provides these track groups:
*   `'genes'`: gene annotation tracks, for all available references
*   `'encode'`: ENCODE data sets for human and mouse, for `mm9` and `hg19` only
*   `'interaction'`: genomic interaction data sets, including those generated from Hi-C (chromatin-chromatin) and MARGI (RNA-chromatin) data, for `mm10`, `hg38` (MARGI) and `hg19` (Hi-C)
*   `'singleCell'`: mouse embryo single-cell RNA-seq data set from [Biase *et al.*, *Genome Research*, **24**:1787-1796](http://genome.cshlp.org/content/24/11/1787.full), for `mm10` only



## API documentation
The detailed attributes available for `<chart-controller>` and `<chart-area>` elements can be seen on the API documentation pages here:

*   [`GIVe.ChartArea`](https://beta.give.genemo.org/components/bower_components/genemo-visual-components/chart-area/index.html) for `<chart-area>`
*   [`GIVe.ChartController`](https://beta.give.genemo.org/components/bower_components/genemo-visual-components/chart-controller/index.html) for `<chart-controller>`

> Note that the attribute names in the API document is for JavaScript codes and are in camelCase format. To use those attributes, please convert the camelCase names into name with dashes. For example, to use `numOfSubs` mentioned in API as an HTML attribute, use `num-of-subs` instead. Please see [Polymer property name to attribute name mapping](https://www.polymer-project.org/2.0/docs/devguide/properties#property-name-mapping) for details.
