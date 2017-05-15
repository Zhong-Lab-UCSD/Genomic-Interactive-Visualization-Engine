||||
| --- | --- | --- |
| [← 1. Installation](1-installation.md) | [↑ Index](index.md) | [3. Adding Data in GIVE Data Sources →](3-dataSource.md) |

# Using GIVE Web Components

GIVE Web Components can be used the same way you use other HTML tags, like `<div>` or `<video>`.

## Table of Contents

*   [Preparation](#preparation)
*   [Embedding a GIVE Web Component](#embedding-a-give-web-component)
*   [Use Attributes for GIVE Web Components](#use-attributes-for-give-web-components)
    *   [Change the title of the embedded browser](#change-the-title-of-the-embedded-browser)
    *   [Change your reference genome](#change-your-reference-genome)
    *   [Change the number of sub-views for interactions](#change-the-number-of-sub-views-for-interactions)
    *   [Change the coordinates showing in the browser](#change-the-coordinates-showing-in-the-browser)
    *   [Change the data shown in the browser](#change-the-data-shown-in-the-browser)
*   [API documentation](#api-documentation)

## Preparation

Before using any GIVE Web Components, you need to put the Polyfill code for Web Components:

<pre>
&lt;script src="<em><strong>&lt;web_components_path&gt;</strong></em>components/bower_components/webcomponentsjs/webcomponents-lite.min.js"&gt;&lt;/script&gt;
</pre>

When you want to embed a GIVE Web Component in your HTML page (for example, `chart-controller` or `chart-area`), import the element you would like to use first if it's not already imported in the HTML file:

<pre>
&lt;link rel="import" href="<em><strong>&lt;web_components_path&gt;</strong></em>components/bower_components/genemo-visual-components/<em><strong>&lt;component_name&gt;</strong></em>/<em><strong>&lt;component_name&gt;</strong></em>.html"&gt;
</pre>

## Embedding a GIVE Web Component

Embedding a GIVE Web Component is quite straightforward in HTML pages. Just insert the tag anywhere you want. If you would like a full full-fledged browser with track controls and input fields for coordinates, use `<chart-controller>`:

```
<chart-controller></chart-controller>
```

If you only need a browser with dragging and zooming functions but no extra stuff, use `<chart-area>`:

```
<chart-area></chart-area>
```

***
*__NOTE:__ The container (for example, a `<div>`) of the element should have its CSS `position` property set as non-`static` (such as `absolute`, `relative`, or `fixed`) and its dimension well-defined (either by explicitly setting the values, or use `flex-box` model). This applies to all embedding elements in GIVE, including `<chart-controller>` and `<chart-area>`. If you don't have any container available, wrap the element with a `<div>` container with `position: relative` and define its sizes.*
***

## Use Attributes for GIVE Web Components

GIVE provides several ways to tweak the embedded browser by specifying the corresponding HTML attributes. Most of the attributes will be applicable to both `<chart-controller>` and `<chart-area>` elements unless otherwise specified.

***
*__NOTE:__ that the attribute names in the API document is for JavaScript codes and are in camelCase format. To use those attributes, please convert the camelCase names into name with dashes. For example, to use `numOfSubs` mentioned in API as an HTML attribute, use `num-of-subs` instead. Please see [Polymer property name to attribute name mapping](https://www.polymer-project.org/2.0/docs/devguide/properties#property-name-mapping) for details.*
***

### Change the title of the embedded browser

<chart-controller> element will show a title on the embedded browser and this title can be changed by specifying the `title-text` attribute:

<pre>
&lt;chart-controller title-text="<em><strong>&lt;your_title_text&gt;</strong></em>"&gt;&lt;/chart-controller&gt;
</pre>

### Change your reference genome

By specifying the `ref` attribute, you may change the reference genome used in the browser.

<pre>
&lt;chart-controller ref="<em><strong>&lt;your_reference_database&gt;</strong></em>"&gt;&lt;/chart-controller&gt;
</pre>

__`your_reference_database`__ is the name of reference database. Currently the following reference databases are supported on GIVE server data source at demo.give.genemo.org: (also see [1. Installation - Installing GIVE Data Sources](1-installation.md#installing-give-data-sources))
*   Human: `hg19` and `hg38`
*   Mouse: `mm9` and `mm10`

### Change the number of sub-views for interactions

GIVE supports multiple sub-views to better visualize interactions among different regions across the genome. by specifying the `num-of-subs` attribute, you may show multiple views in your embedded browser.

<pre>
&lt;chart-controller ref="<em><strong>&lt;your_reference_database&gt;</strong></em>" num-of-subs="<em><strong>&lt;number_of_sub-views&gt;</strong></em>"&gt;&lt;/chart-controller&gt;
</pre>

### Change the coordinates showing in the browser

To change the coordinates that are showed in the browser, use `coordinates` attribute. `coordinates` should be specified in JSON array format (notice that double quotes `""` should be used to quote the string in JSON so the attribute should be quoted by single quotes`''`).

### Change the data shown in the browser

GIVE server provides several known data groups. By specifying `group-id-list` attribute, you can choose what data you would like to show in your browser. `group-id-list` should also be specified in JSON array format.

The data source on GIVE server data source currently provides these track groups:
*   `"genes"`: gene annotation tracks, for all available references
*   `"encode"`: ENCODE data sets for human and mouse, for `mm9` and `hg19` only
*   `"interaction"`: genomic interaction data sets, including those generated from Hi-C (chromatin-chromatin) and MARGI (RNA-chromatin) data, for `mm10`, `hg38` (MARGI) and `hg19` (Hi-C)
*   `"singleCell"`: mouse embryo single-cell RNA-seq data set from [Biase *et al.*, *Genome Research*, __24__:1787-1796](http://genome.cshlp.org/content/24/11/1787.full), for `mm10` only

> For example, the following code defines a pair of genomic regions in the embedded interaction browser for `hg19`, displaying `genes` and `interaction` groups:
> ```
> <chart-controller ref="hg38" num-of-subs="2"
>   coordinates='["chrX:73800000-73870000", "chrX:40000000-90000000"]'
>   group-id-list='["genes", "interaction"]'>
> </chart-controller>
> ```

## API documentation
The detailed attributes available for `<chart-controller>` and `<chart-area>` elements can be seen on the API documentation pages here:

*   [`GIVe.ChartArea`](https://beta.give.genemo.org/components/bower_components/genemo-visual-components/chart-area/index.html) for `<chart-area>`
*   [`GIVe.ChartController`](https://beta.give.genemo.org/components/bower_components/genemo-visual-components/chart-controller/index.html) for `<chart-controller>`

||||
| --- | --- | --- |
| [← 1. Installation](1-installation.md) | [↑ Index](index.md) | [3. Adding Data in GIVE Data Sources →](3-dataSource.md) |
