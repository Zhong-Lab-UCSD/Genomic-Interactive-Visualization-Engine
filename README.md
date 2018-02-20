# GIVE (Genomic Interactive Visualization Engine)

[![DOI](https://zenodo.org/badge/14942891.svg)](https://zenodo.org/badge/latestdoi/14942891)

GIVE (Genomic Interactive Visualization Engine) is a HTML5 library that lets you embed genomic visualization panels like you work with standard HTML elements, to build a customized genome browser to visualize data from public deposits (such as ENCODE) and/or in-house data.

GIVE uses [Web Components](https://www.webcomponents.org/), specifically [Polymer Library](https://www.polymer-project.org/) for user interface and [Scaled Vector Graphics (SVG) 1.1](https://www.w3.org/TR/SVG/) for graphics. These components are supported by all major browsers.

```html
<!-- Polyfill Web Components for browsers without native support -->
<script src="https://www.givengine.org/bower_components/webcomponentsjs/webcomponents-lite.js"></script>

<!-- Import GIVE component -->
<link rel="import" href="https://www.givengine.org/components/chart-controller/chart-controller.html">

<!-- Embed the browser in your web page -->
<chart-controller ref="mm10" title-text="My GIVE Browser"
  coordinates='["chr17:35504032-35512777"]'
  group-id-list='["genes", "singleCell", "customTracks"]'></chart-controller>
```

## Table of Contents
*   [Installation](#installation)
*   [Usage](#usage)
    *   [Importing GIVE Components](#importing-give-components)
    *   [Implementing A Customized Genome Browser by Embedding GIVE Components](#implementing-a-customized-genome-browser-by-embedding-give-components)
*   [Supported Tracks](#supported-tracks)
*   [Tutorial](#tutorial)
*   [Manual](#manual)
*   [Credits](#credits)
*   [License](#license)

## Installation

*Installation of GIVE is optional and not required to use any of the Web Components of GIVE. By installing GIVE components, you can serve codes and/or data sources directly from your own server.*

GIVE consists of two major parts: GIVE Web Components, the client-side codes running in browsers, implemented by HTML5; and GIVE server, including bare server codes, implemented by PHP, and data sources.

To install any part of GIVE, a web-hosting environment is needed on your server. Please refer to [GIVE Manual - 1. Installation](manuals/1-installation.md) for detailed instructions.

## Usage

### Importing GIVE Components

To use GIVE components, just use HTML `import` to import Web Components polyfill and the required Web Components.

All components, including Web Component polyfill, is available on our web site, the public GIVE instance, for direct HTML import without any installation.
```html
<script src="https://www.givengine.org/bower_components/webcomponentsjs/webcomponents-lite.js"></script>
<link rel="import" href="https://www.givengine.org/components/chart-controller/chart-controller.html">
```

If you already installed GIVE Web Components on your server, please use your own path.
```html
<script src="/bower_components/webcomponentsjs/webcomponents-lite.js"></script>
<link rel="import" href="/components/chart-controller/chart-controller.html">
```

### Implementing A Customized Genome Browser by Embedding GIVE Components

After you have imported the components in your HTML page, you can use them in several ways. The most straightforward way is to use them as if you are using common HTML tags (like `<div>` or `<video>`):
```html
<chart-controller ref="mm10" title-text="My First GIVE Browser"
  group-id-list='["genes", "singleCell", "customTracks"]'></chart-controller>
```
Or to use GIVE-HUG (HTML Universal Generator) on GIVE Data Hub page to build the HTML code needed for embedding. GIVE Data Hub is accessible on the public GIVE instance at <https://www.givengine.org/data-hub.html> and will be at the same relative location after you install your own GIVE instance.

You can also use `Document.createElement()` to create the element in your JavaScript code:
```JavaScript
var myChart = document.createElement('chart-controller')
myChart.titleText = "My First GIVE Browser"
myChart.groupIdList = ["genes", "singleCell", "customTracks"]
```
Or to use the built-in JavaScript constructors:
```JavaScript
var myChart = new GIVE.ChartController({
  titleText: "My First GIVE Browser",
  groupIdList: ["genes", "singleCell", "customTracks"]
})
```

## Supported Tracks

Currently GIVE supports three types of tracks:
*   [BED Track](html/components/track-object/bed-track/)
*   [bigWig Track](html/components/track-object/bigwig-track/)
*   [Interaction Track](html/components/track-object/interaction-track/)

## Tutorial

We have compiled a series of tutorials for different GIVE functionalities and components. Please check out the [Tutorial Homepage](tutorials/Readme.md).

## Manual

GIVE Manual is available under the [Manual Homepage](manuals/Readme.md)

## Credits

GIVE is developed by Xiaoyi Cao, Zhangming Yan, Qiuyang Wu, Alvin Zheng from Dr. Sheng Zhong's lab at University of California, San Diego.

## License

Copyright 2017 GIVe Authors

This project is licensed under the Apache License, Version 2.0 (the "License");
you may not use this project except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
