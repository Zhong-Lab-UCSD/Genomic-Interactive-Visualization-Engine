## chart-controller

An embedded browser element including the view area, input for navigation and track controls.

### Overview

`<chart-controller>` provides a web element to embed a complete browser in any html pages. The embedded browser contains three major components: view area, input for navigation and track controls.

#### View area

View area is the main part of the browser where individual tracks are being shown.
It is implemented by using a `<chart-area>` element.
Multiple views of the same genomic reference are also supported.

Please refer to [`GIVe.ChartArea`](../chart-area/) for further details.

#### Input for navigation

`<chart-controller>` provides a input field for navigation purposes, genomic
coordinates in `chrX:XXXXXXX-XXXXXXX` or `chrX XXXXXXX XXXXXXX` formats are
accepted. Also gene names can be typed to search for a specific gene.

The input field is a `<gene-coor-input>` element. See
[`GIVe.GeneCoorInput`](../gene-coor-input/) for
details. Gene annotations are generated from NCBI `gene_info` file.

#### Track controls

Track controls are implemented via a `<chart-track-group-list>` element. See
[`GIVe.ChartTrackGroupList`](../chart-track-list/) for details.

### API Reference

#### Properties

Most properties in GIVE are JavaScript properties that can also be used in HTML tags as an attribute. **The camelCase names** are the ones to be used in JavaScript and if the property is available as an HTML tag attribute, a *name with dashes* will be included in brackets. (For example, the JavaScript code `myBrowser.groupIDList = ['genes']` and HTML code `<chart-controller group-id-list='["genes"]'></chart-controller>` are referring to the same property.) Please see [Polymer property name to attribute name mapping](https://www.polymer-project.org/2.0/docs/devguide/properties#property-name-mapping) for details.

**ref** (*ref*)  
> Type: `String`  
> Default: `null`  
> The reference used in the embedded browser. Reference needs to be in UCSC format and currently the following ones are supported:  
> *   Human: `'hg19'`, `'hg38'`
> *   Mouse: `'mm9'`, `'mm10'`

**groupIdList** (*group-id-list*)  
> Type: `Array` of `String`s  
> Default: *depend on reference*  
> The track groups included in the embedded browser. Group IDs are specified in the data source. The data source on our server currently provides these track groups:  
> `'genes'`: gene annotation tracks, for all available references  
> `'encode'`: ENCODE data sets for human and mouse, for `mm9` and `hg19` only  
> `'interaction'`: genomic interaction data sets, including those generated from Hi-C (chromatin-chromatin) and MARGI (RNA-chromatin) data, for `mm10`, `hg38` (MARGI) and `hg19` (Hi-C)  
> `'singleCell'`: mouse embryo single-cell RNA-seq data set from [Biase *et al.*, *Genome Research*, **24**:1787-1796](http://genome.cshlp.org/content/24/11/1787.full), for `mm10` only

**coordinates** (*coordinates*)  
> Type: `Array` of `String`s  
> Default: *depend on reference*  
>

**titleText** (*title-text*)  
> Type: `String`  
> Default: `'GIVE Browser'`  
> The title text that will appear in the embedded browser.

#### Methods

**getReference**() -> `GIVE.RefObject`  
> Get the current reference of the embedded browser

**setReference**(`ref`)  
> Set the reference of embedded browser to `ref`, all the views in the browser will be reverted to reference default values

**updateSvg**()  
> Although all chart-controller properties are observed via Polymer and will trigger updates in the views, imperative changes will not be observed. Use this method to update all the views in the browser for those changes manually.
