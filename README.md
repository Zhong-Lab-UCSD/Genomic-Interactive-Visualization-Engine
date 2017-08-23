# GIVE (Genomic Interactive Visualization Engine)

GIVE (Genomic Interactive Visualization Engine) is a HTML5 library that lets you embed genomic visualization panels like you work with standard HTML elements, to build a customized genome browser to visualize data from public deposits (such as ENCODE) and/or in-house data.

GIVE uses [Web Components](https://www.webcomponents.org/), specifically [Polymer Library](https://www.polymer-project.org/) for user interface and [Scaled Vector Graphics (SVG) 1.1](https://www.w3.org/TR/SVG/) for graphics. These components are supported by all major browsers.

```html
<!-- Polyfill Web Components for browsers without native support -->
<script src="https://www.givengine.org/libWC/webcomponents-lite.js"></script>

<!-- Import GIVE component -->
<link rel="import" href="https://www.givengine.org/lib/chart-controller/chart-controller.html">

<!-- Embed the browser in your web page -->
<chart-controller ref="mm10" title-text="My GIVE Browser"
  coordinates='["chr17:35504032-35512777"]'
  group-id-list='["genes", "singleCell", "customTracks"]'></chart-controller>
```

## Table of Contents
*   [Installation](#installation)
    *   [Installing GIVE Web Components](#installing-give-web-components)
    *   [Installing GIVE Server](#installing-give-server)
        *   [Installing GIVE Bare-bone Server](#installing-give-bare-bone-server)
        *   [Installing GIVE Data Sources](#installing-give-data-sources)
*   [Usage](#usage)
    *   [Importing GIVE Components](#importing-give-components)
        *   [Without Installation](#without-installation)
        *   [With Installation](#with-installation)
    *   [Implementing A Customized Genome Browser by Embedding GIVE Components](#implementing-a-customized-genome-browser-by-embedding-give-components)
*   [Tutorial](#tutorial)
*   [Credits](#credits)
*   [License](#license)

## Installation

*Installation of GIVE is optional and not required to use any of the Web Components of GIVE. By installing GIVE components, you can serve codes and/or data sources directly from your own server.*

GIVE consists of two major parts: GIVE Web Components, the client-side codes running in browsers, implemented by HTML5; and GIVE server, including bare server codes, implemented by PHP, and data sources.

To install any part of GIVE, a web-hosting environment is needed on your server.

### Installing GIVE Web Components

Just put the whole `/give/html` folder to your web server and you are good to go. Use the path on your hosting environment for the HTML `import`s to import the components in your page.

### Installing GIVE Server

GIVE server consists of bare-bone server code, which serves as interfaces between GIVE Web Components and the data sources.

#### Installing GIVE Bare-bone Server

To install GIVE server, put `/give/html/givdata` and `/includes` under your hosting environment. PHP 7.0 or higher is required.

After installation, please edit `/give/html/components/bower_components/genemo-data-components/basic-func/constants.js` to indicate the new bare-bone server location:
```JavaScript
give.host = '<bare-bone server path>'
```
Note that `bare-bone server path` is the path relative to the root path of your hosting environment. For example, if you host your web site at `/var/www/`, and bare-bone server is installed at `/var/www/give-server/`, then you'll need to edit `constants.js` as following:
```JavaScript
give.host = '/give-server'
```

#### Installing GIVE Data Sources

*Scripts to install GIVE databases are under development and this part will be updated whenever they are ready.*

## Usage

### Importing GIVE Components

To use GIVE components, just use HTML `import` to import Web Components polyfill and the required Web Components.

#### Without Installation

All components, including Web Component polyfill, is available on our web site for direct HTML import.
```html
<script src="https://www.givengine.org/libWC/webcomponents-lite.js"></script>
<link rel="import" href="https://www.givengine.org/lib/chart-controller/chart-controller.html">
```

#### With Installation

Please use your own path if you already installed GIVE Web Components on your server.
```html
<script src="/give/html/components/bower_components/webcomponentsjs/webcomponents-lite.js"></script>
<link rel="import" href="/give/html/components/bower_components/genemo-visual-components/chart-controller/chart-controller.html">
```

### Implementing A Customized Genome Browser by Embedding GIVE Components

After you have imported the components in your HTML page, you can use them in several ways. The most straightforward way is to use them as if you are using common HTML tags (like `<div>` or `<video>`):
```html
<chart-controller ref="mm10" title-text="My First GIVE Browser"
  group-id-list='["genes", "singleCell", "customTracks"]'></chart-controller>
```
Or to use `Document.createElement()` to create the element in your JavaScript code:
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

## Tutorial

Please visit the following tutorial pages to see how to use the engine:
*   [Use GIVE to build a customized genome browser with existing code and data source](tutorials/1-knownCodeDataSource.md)
*   [Populating a reference genome with a few data tracks on a MySQL compatible data source](tutorials/2-dataSource.md)

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
