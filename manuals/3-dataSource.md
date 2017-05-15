||||
| --- | --- | --- |
| [← 2. Using GIVE Web Components](2-webComponents.md) | [↑ Index](index.md) | → *None* |

# Adding Data in GIVE Data Sources

To use GIVE to visualize new data, they can be added to the MySQL-compatible data source

## Table of Contents

*   [Creating a new reference genome for GIVE](#creating-a-new-reference-genome-for-give)
    *   [Creating a new reference genome database](#creating-a-new-reference-genome-database)
    *   [Creating a `cytoBandIdeo` table and populate it with data](#creating-a-cytobandideo-table-and-populate-it-with-data)
    *   [Adding an entry in `ref` table of `compbrowser`](#adding-an-entry-in-ref-table-of-compbrowser)
    *   [Creating track groups](#creating-track-groups)
    *   [Creating the track definition table](#creating-the-track-definition-table)
*   [Adding data](#adding-data)
    *   [Adding genomic span data (BED)](#adding-genomic-span-data-bed)
    *   [Adding linear tracks (bigWig)](#adding-linear-tracks-bigwig)
    *   [Adding interaction tracks](#adding-interaction-tracks)
*   [Database table properties documentation](#database-table-properties-documentation)

## Creating a new reference genome for GIVE
### Creating a new reference genome database

To visualize a new reference genome, GIVE only needs to know:
1.  The names of the species for this reference (Latin and common names are recommended but any name should work);
2.  Its chromosomal information, including names, sizes and the location of centromeres.

These are stored in two locations within the data source. First you need to create a database with __`your_reference_database`__:

<pre>
CREATE DATABASE `<em><strong>&lt;your_reference_database&gt;</strong></em>`;
</pre>

### Creating a `cytoBandIdeo` table and populate it with data

Then you need to create a `cytoBandIdeo` table with chromosomal information in your reference database with the following columns:

| Column name | Type | Description |
| --- | --- | --- |
| `chrom` | `varchar` | Chromosome name |
| `chromStart` | `unsigned int` | The start coordinate of the band |
| `chromEnd` | `unsigned int` | The end coordinate of the band |
| `name` | `varchar` | Name of the band |
| `gieStain` | `varchar` | Giemsa Stain info, to identify bands, centromeres, etc. |

The SQL code to create this table is shown below:

<pre>
CREATE TABLE `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`cytoBandIdeo` (
  `chrom` varchar(255) NOT NULL,
  `chromStart` int(10) unsigned NOT NULL,
  `chromEnd` int(10) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `gieStain` varchar(255) NOT NULL,
  KEY `chrom` (`chrom`(23),`chromStart`)
);
</pre>

The `cytoBandIdeo` table also needs to be populated by actual data. The following SQL command can be used if the file cytoBandIdeo is already on the server:

<pre>
LOAD DATA LOCAL INFILE "<em><strong>&lt;cytoBandIdeo_file_path&gt;</strong></em>" INTO TABLE `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`cytoBandIdeo`;
</pre>

***
*__NOTE:__ The annotation files, including the `cytoBandIdeo` file for all references available on GIVE can be downloaded from UCSC or the following URL: <https://demo.give.genemo.org/annotations/>. Currently `hg19`, `hg38`, `mm9` and `mm10` are available.*
***

### Adding an entry in `ref` table of `compbrowser`

After created the table, you also need to add one entry in table `ref` of database `compbrowser`, notice that the `browserActive` field needs to be set to `1` and in the `settings` field, the JSON string also has its `browserActive` attribute set as `true`. (You may want to try <http://www.objgen.com/json> to get a JSON string with ease.)

The SQL code is shown below:

<pre>
INSERT INTO `compbrowser`.`ref` (
  `dbname`,
  `name`,
  `commonname`,
  `browserActive`,
  `settings`
) VALUES (
  '<em><strong>&lt;your_reference_database&gt;</strong></em>',
  '<em><strong>&lt;species_name&gt;</strong></em>',
  '<em><strong>&lt;species_common_name&gt;</strong></em>',
  1,
  '{
    "browserActive": true
  }'
);
</pre>

### Creating track groups

Tracks in GIVE belongs to track groups for better management and these groups need their place in the database. A `grp` table is required in the reference database to manage track groups with the following columns:

| Column name | Type | Description |
| --- | --- | --- |
| `name` | `varchar` | Group name |
| `label` | `varchar` | Description of the group |
| `priority` | `float` | Order for this group in the browser, less is upper |
| `defaultIsClosed` | `tinyint` | Whether the group will be closed by default, reserved |
| `singleChoice` | `tinyint` | Whether the group will only allow one track to be active at any time |

The SQL code to create this table is shown below:

<pre>
CREATE TABLE `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`grp` (
  `name` char(255) NOT NULL DEFAULT '',
  `label` char(255) NOT NULL DEFAULT '',
  `priority` float NOT NULL DEFAULT '0',
  `defaultIsClosed` tinyint(2) DEFAULT NULL,
  `singleChoice` tinyint(1) NOT NULL DEFAULT '0'
);
</pre>

Individual track groups can be created by adding entries in the `grp` table, using the following SQL command:

<pre>
INSERT INTO `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`grp` VALUES (
  '<em><strong>&lt;group_name&gt;</strong></em>',
  '<em><strong>&lt;group_description&gt;</strong></em>',
  <em><strong>&lt;the_priority_of_the_group&gt;</strong></em>,
  <em><strong>&lt;default_is_closed_value&gt;</strong></em>,
  <em><strong>&lt;whether_the_group_only_allows_one_choice&gt;</strong></em>
);
</pre>

### Creating the track definition table

Tracks themselves also need a place to store their annotation and data. This is achieved by creating a table named `trackDb` in the reference database with the following columns:

| Column name | Type | Description |
| --- | --- | --- |
| `tableName` | `varchar` | Name of the track table |
| `type` | `varchar` | Type of the track (__Important__) |
| `priority` | `float` | Order for the track (within group) |
| `url` | `longblob` | URL for the track, reserved |
| `html` | `longtext` | HTML description for the track, reserved |
| `grp` | `varchar` | Group of the track, should be the same as __*<group_name>*__ |
| `settings` | `longtext` | Detailed track settings, JSON format. See [Database table properties documentation](#database-table-properties-documentation) for details. |

The SQL code to create this table is shown below:

<pre>
CREATE TABLE `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`trackDb` (
  `tableName` varchar(150) NOT NULL,
  `type` varchar(255) NOT NULL,
  `priority` float NOT NULL,
  `url` longblob,
  `html` longtext,
  `grp` varchar(255) NOT NULL,
  `settings` longtext NOT NULL,
  PRIMARY KEY (`tableName`)
);
</pre>

After this step, GIVE will be able to display the new reference genome and also data tracks within it.

## Adding data

Adding tracks to GIVE database typically involves two steps:
1.  Create a table corresponding to the data type and populate it;
2.  Add an entry in the `trackDb` table with the metadata of the track.

### Adding genomic span data (BED)

The table for BED tracks needs to contain the following columns:

| Column name | Type | Description |
| --- | --- | --- |
| `name` | `varchar` | Name of the span (gene, transcript, etc.) |
| `chrom` | `varchar` | Chromosome name |
| `strand` | `char` | Strand of the span |
| `txStart` | `int` | Start coordinate of the span |
| `txEnd` | `int` | End coordinate of the span |
| `cdsStart` | `int` | Start coordinate of the 'thick' portion of the span |
| `cdsEnd` | `int` | End coordinate of the 'thick' portion of the span |
| `exonCount` | `int` | Number of exons in the span |
| `exonStarts` | `longblob` | The start coordinates of all exons, separated by comma |
| `exonEnds` | `longblob` | The end coordinates of all exons, separated by comma |
| `proteinID` | `varchar` | The ID of corresponding protein, only applies to gene tracks |
| `alignID` | `varchar` | The ID of alignment segments, only applies to gene tracks |

***
*__Note:__ This is different than BED12 format: 1) field order is slightly different; 2) the 9th and 10th column represents the start and end coordinate of all the exons, instead of the start within the gene and length of the exon in BED12.*
***

The SQL command to create such a table is shown below:

<pre>
CREATE TABLE `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`<em><strong>&lt;track_table_name&gt;</strong></em>` (
  `name` varchar(<em>255</em>) NOT NULL DEFAULT '',
  `chrom` varchar(<em>255</em>) NOT NULL DEFAULT '',
  `strand` char(<em>2</em>) NOT NULL DEFAULT '',
  `txStart` int(<em>10</em>) unsigned NOT NULL DEFAULT '0',
  `txEnd` int(<em>10</em>) unsigned NOT NULL DEFAULT '0',
  `cdsStart` int(<em>10</em>) unsigned NOT NULL DEFAULT '0',
  `cdsEnd` int(<em>10</em>) unsigned NOT NULL DEFAULT '0',
  `exonCount` int(<em>10</em>) unsigned NOT NULL DEFAULT '0',
  `exonStarts` longblob NOT NULL,
  `exonEnds` longblob NOT NULL,
  `proteinID` varchar(<em>40</em>) NOT NULL DEFAULT '',
  `alignID` varchar(<em>255</em>) NOT NULL DEFAULT '',
  KEY `name` (`name`),
  KEY `chrom` (`chrom`(16),`txStart`),
  KEY `chrom_2` (`chrom`(16),`txEnd`),
  KEY `protein` (`proteinID`(16)),
  KEY `align` (`alignID`)
);
</pre>

After the table is created, you can populate it with the actual data:
<pre>
LOAD DATA LOCAL INFILE "<em><strong>&lt;bed_data_file_path&gt;</strong></em>" INTO TABLE `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`<em><strong>&lt;track_table_name&gt;</strong></em>`;
</pre>

The entry in the `trackDb` table can be added via the following SQL command:

<pre>
INSERT INTO `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`trackDb` VALUES (
  '<em><strong>&lt;track_table_name&gt;</strong></em>',
  '<em>bed</em>',
  <em>1</em>,
  NULL,
  NULL,
  'genes',                      -- Group name, should be the same as grp.name
  '{
    "group":"<em><strong>&lt;group_name&gt;</strong></em>",
    "longLabel":"<em><strong>&lt;long_label&gt;</strong></em>",
    "priority":<em>1</em>,
    "shortLabel":"<em><strong>&lt;short_label&gt;</strong></em>",
    "track":"<em><strong>&lt;track_table_name&gt;</strong></em>",
    "type":"<em>bed</em>",
    "visibility":"pack",
    "adaptive":true
  }'
);
</pre>

### Adding linear tracks (bigWig)

The table for bigWig tracks only needs to contain the following column:

| Column name | Type | Description |
| --- | --- | --- |
| `fileName` | `varchar` | The path or URL of the bigWig file |

The SQL command to create such a table is shown below:

<pre>
CREATE TABLE `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`<em><strong>&lt;track_table_name&gt;</strong></em>` (
  `fileName` varchar(<em>255</em>) NOT NULL
);
</pre>

After the table is created, you can populate it with the actual data:
<pre>
INSERT INTO `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`<em><strong>&lt;track_table_name&gt;</strong></em>` VALUES (
  '<em><strong>&lt;bigWig_file_path&gt;</strong></em>'
);
</pre>

The entry in the `trackDb` table can be added via the following SQL command:

<pre>
INSERT INTO `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`trackDb` VALUES (
  '<em><strong>&lt;track_table_name&gt;</strong></em>',
  '<em>bigWig</em>',
  <em>1</em>,
  NULL,
  NULL,
  'genes',                      -- Group name, should be the same as grp.name
  '{
    "group":"<em><strong>&lt;group_name&gt;</strong></em>",
    "longLabel":"<em><strong>&lt;long_label&gt;</strong></em>",
    "priority":<em>1</em>,
    "shortLabel":"<em><strong>&lt;short_label&gt;</strong></em>",
    "track":"<em><strong>&lt;track_table_name&gt;</strong></em>",
    "type":"<em>bigWig</em>",
    "visibility":"full",
    "autoScale":false,
  }'
);
</pre>

### Adding interaction tracks

Adding interaction tracks (in `interaction` format) is similar to adding `BED` or `GenePred` tracks. The table for interaction tracks needs to contain the following columns:

| Column name | Type | Description |
| --- | --- | --- |
| `ID` | `int` | ID of the interaction segment (can be generated by auto-increment) |
| `chrom` | `varchar` | Chromosome name |
| `Start` | `int` | Start coordinate of the span |
| `End` | `int` | End coordinate of the span |
| `linkID` | `int` | ID of the link (segments with the same linkID are linked together) |
| `value` | `float` | The value of the link |
| `dirFlag` | `tinyint` | The direction of the link (the link should go from the segment with `dirFlag` = 0 to the one with `dirFlag` = 1) if the link has direction, '-1' if the link does not have direction |

The SQL command to create such a table is shown below:

<pre>
CREATE TABLE `<your_reference_database>`.`<em><strong>&lt;track_table_name&gt;</strong></em>` (
  `ID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `chrom` varchar(255) NOT NULL DEFAULT '',
  `start` int(10) unsigned NOT NULL DEFAULT '0',
  `end` int(10) unsigned NOT NULL DEFAULT '0',
  `linkID` int(10) unsigned NOT NULL DEFAULT '0',
  `value` float NOT NULL DEFAULT '0',
  `dirFlag` tinyint(4) NOT NULL DEFAULT '-1',
  PRIMARY KEY (`ID`),
  KEY `chrom` (`chrom`(16),`start`),
  KEY `chrom_2` (`chrom`(16),`end`),
  KEY `linkID` (`linkID`)
);
</pre>

After the table is created, you can populate it with the actual data:
<pre>
LOAD DATA LOCAL INFILE "<em><strong>&lt;interaction_data_file_path&gt;</strong></em>" INTO TABLE `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`<em><strong>&lt;track_table_name&gt;</strong></em>`;
</pre>

The entry in the `trackDb` table can be added via the following SQL command:

<pre>
INSERT INTO `<em><strong>&lt;your_reference_database&gt;</strong></em>`.`trackDb` VALUES (
  '<em><strong>&lt;track_table_name&gt;</strong></em>',
  '<em>interaction</em>',
  <em>1</em>,
  NULL,
  NULL,
  'genes',                      -- Group name, should be the same as grp.name
  '{
    "group":"<em><strong>&lt;group_name&gt;</strong></em>",
    "longLabel":"<em><strong>&lt;long_label&gt;</strong></em>",
    "priority":<em>1</em>,
    "shortLabel":"<em><strong>&lt;short_label&gt;</strong></em>",
    "track":"<em><strong>&lt;track_table_name&gt;</strong></em>",
    "type":"<em>interation</em>",
    "visibility":"full",
    "thresholdPercentile": [
      <em><strong>&lt;percentile_values_for_interaction_thresholds&gt;</strong></em>
    ],
  }'
);
</pre>

## Database table properties documentation

Here are a brief description of the properties you may use in the `settings` column of `trackDb`:

__shortLabel__  
> Type: `String`  
> Default: `''`  
> The short label shown by the track.

__longLabel__  
> Type: `String`  
> Default: `''`  
> The long label providing more information. Reserved.

__visibility__  
> Type: `enum` (`'full'`, `'pack'`, `'collapsed'`, `'dense'`, and `'hide'`)  
> Default: `'hide'`  
> The visibility of the track, left is more visible/prominent.

__adaptive__  
> Type: `Boolean`  
> Default: `false`  
> Whether the visibility will adapt to the height of the ending result. If the height exceeds certain threshold, the visibility will be degraded by one.

__dataType__, __cellType__, __trackFeature__, __labName__,  
__groupDataType__, __groupFeature__, __groupSampleType__  
> Type: `String`  
> Default: `null`  
> These are metadata of the tracks. Reserved for future features.

__thresholdPercentile__  
> Type: `Array<Number>`  
> Default: `null`  
> A series of numbers defining the percentile of the data points in the track. This is used to color interaction graphs by their corresponding signal level. May be applied to other types of tracks in a future release.

||||
| --- | --- | --- |
| [← 2. Using GIVE Web Components](2-webComponents.md) | [↑ Index](index.md) | → *None* |
