## `<gene-coor-input>`

An embedded browser element for genomic coordinates and/or gene name search.

### Overview

`<gene-coor-input>` provides a material design input field implemented by
Polymer for gene names / aliases / genomic coordinates. This component contains a paper-input component and will do the following:

#### Case fixing
`<gene-coor-input>` can fix cases (`chrX`, `chrY`, *etc.*) and truncate ranges
for genomic region coordinates.

#### Partial gene name search
When partial names are given `<gene-coor-input>` can search the back-end
database to look for gene names / aliases.
`<gene-coor-input>` can also find coordinates and substitute the value
correspondingly.

### Reference support in data sources

__Case fixing__ is supported as long as the reference is supported in the data
source. Please refer to GIVE Manual
[3.1 GIVE-Toolbox Usage](../../../manuals/3.1-GIVE-Toolbox-usages.md)
for details.

__Partial gene name search__ requires a table / tables converting gene
names / aliases to coordinates. Such table(s) can be provided by either of the
following (text in pointy brackets "`<>`" can be substituted by any
alphanumeric string):

1.  __A gene coordinate table__ (referred below as `<gene-coordinate-table>`)
    with at least the following columns (`chromStart` and `chromEnd` can be
    replaced by `txStart` and `txEnd`.):

    | Column name | Type | Description |
    | --- | --- | --- |
    | `<gene-symbol-column>` | `VARCHAR` | Gene names/symbols (this can be a column of the table itself, or a column in the linked     table(s)) |
    | `chrom` | `VARCHAR` | The name of the chromosome the gene is on |
    | `chromStart` | `INT` | Chromosomal start coordinates |
    | `chromEnd` | `INT` | Chromosomal end coordinates |

2.  (Optional) __A gene description table__ (referred below as
    `<gene-desc-table>`) with at least the following columns:

    | Column name | type | Description |
    | --- | --- | --- |
    | `<desc-symbol-column>` | `VARCHAR` | Gene symbols (corresponding to `<gene-symbol-column>` in `<gene-coordinate-table>`) |
    | `description` | `VARCHAR` | Gene description |

3.  (Optional) __An alias table__ (referred below as `<alias-table>`) with at
    least the following columns:

    | Column name | type | Description |
    | --- | --- | --- |
    | `<alias-symbol-column>` | `VARCHAR` | Gene symbols (corresponding to `<gene-symbol-column>` in `<gene-coordinate-table>`) |
    | `alias` | `VARCHAR` | Gene aliases, each alias shall occupy one row |
    | `isSymbol` | `BIT` | Indicating whether this alias is the same as `<gene-symbol-column>`, 1 if the alias is the same, 0 if not |

In `ref` table of `compbrowser` database, the entry for the reference needs to
have the following properties in its `settings` column:

*   `geneCoorTable`: `<gene-coordinate-table>`
*   `geneSymbolColumn`: `<gene-symbol-column>` (default column name: `'name'`)
*   (Optional) `geneDescTable`: `<gene-desc-table>`
*   (Optional) `descSymbolColumn`: `<desc-symbol-column>` (default column name: `'Symbol'`)
*   (Optional) `aliasTable`: `<alias-table>`
*   (Optional) `aliasSymbolColumn`: `<alias-symbol-column>` (default column name: `'Symbol'`)

Please see [3.1 MySQL commands for managing data in GIVE data source](../../../manuals/3.2-dataSource.md)
for more details on available properties of references.

#### Implementation for the public GIVE instance

In the public GIVE instance at <https://www.givengine.org/>, the __gene
coordinate table__ is generated from UCSC Known Genes on the fly (from
`knownGenes` and `kgXref`).

The __gene description table__ (named `_NcbiGeneInfo`) and the __alias table__
(named `_AliasTable`) are generated from the NCBI database at
<https://ftp.ncbi.nih.gov/gene/DATA/GENE_INFO/Mammalia/>. A python script to
generate these tables are provided at
[scripts/geneNamesUpdate.py](https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/blob/master/scripts/geneNamesUpdate.py).
