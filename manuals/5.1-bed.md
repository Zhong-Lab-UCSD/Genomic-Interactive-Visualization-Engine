# BED Tracks

BED Tracks are tracks for discrete signals across the entire genome. The signals
are grouped by units. All units can have directions (relative to the genome),
overlap with one another, have multiple segments, and/or have additional values
associated with them.

BED Tracks are suitable for displaying elements such as genes, variations,
regulatory elements, repeats, *etc*.

## Data Format

Currently GIVE supports importing BED files with scripts into its data source.

The description of BED file can be seen from [the UCSC Genome Browser site](https://genome.ucsc.edu/FAQ/FAQformat.html#format1).
A brief explanation of all fields is provided here.

BED files are text files with 3-12 fields separated by spaces or tabs
(consecutive whitespaces are treated as one and empty fields must be filled with
a `"."`). Field orders are important.

The following 3 fields are required for a BED entry:

> __chrom__ - The name of the chromosome.  
> __chromStart__ - The starting position (0-based) of the entry in the
> chromosome.  
> __chromEnd__ - The ending position of the entry in the chromosome. This
> base should __not__ be included in the entry.

The 9 additional optional BED fields are:

> __name__ - Defines the name of the BED entry. This label is displayed to the
> left of the BED entry if there is enough space, otherwise it will be shown at
> the left end of the graph. See __[Display Modes](#display-modes)__ for
> details about whether and where this will be shown in different modes.  
> __score__ - A score between 0 and 1000. This is used for compatibility
> purposes and is currently not used in GIVE.  
> __strand__ - Defines the strand of the entry. Use `"+"` for positive strand,
> `"-"` for negative strand and `"."` for strand-less entries.
> *(__GIVE extension__: `1` or `0` can also be used to indicate positive or
> negative strands, respectively.)*  
> __thickStart__ - If this entry has a thick region (for example, exons for
> genes), this can be used to define the starting position of such a thick
> region. If omitted, `thickStart` will be set to the same value as
> `chromStart`.  
> __thickEnd__ - The ending position of the thick region.  
> __itemRgb__ - An RGB value of the form R,G,B (e.g. 255,0,0). This field
> is currently for compatibility purposes only and will be used to indicate the
> color for the entry in a future update.  
> __blockCount__ - The number of blocks (exons) in this entry.  
> __blockSizes__ - A list of block sizes separated by comma. The number of
> items in this list should equal to `blockCount`.  
> __blockStarts__ - A list of block starts separated by comma. The positions
> should be relative to `chromStart` (therefore, the first item is typically
> `0`). The number of items in this list should equal to `blockCount`.

## Display Modes

BED tracks can be displayed in the following modes by setting the `visibility`
property of the track. Available settings are listed below, from the most
detailed to the least:

*   `Full` - Every entry occupy one single line. The name of entry will be
    shown immediately to the left of the entry if there is enough space in the
    graph, otherwise it will be shown in the label region to the left of the
    main graph area.
*   `Pack` - All entries and names will be shown as in `Full`. However, if
    there is space to fit multiple entries without overlapping with each other,
    those entries will be put in the same line.
*   `Collapsed` - If multiple overlapping entries have the same name, they
    will be merged into one single "large entry" with the number of entries
    being merged shown in brackets after the name. This is used mainly in gene
    annotation tracks, where multiple transcripts of the same gene can be shown
    as one entity.
*   `Notext` - Same as `collapsed`, except that the label is no longer shown.
*   `Dense` - All entries are drawn in the same line no matter they overlap
    or not.
*   `None` - This track is not shown at all.

The display modes of tracks can be changed adaptively by setting the `adaptive`
property of the track. If `adaptive` is set to `true`, GIVE will attempt to use
the display mode that can show the most detail while keeps the total number of
lines not exceeding a given value (currently at `12`, will be customizable in a
future update).

## Supported Settings

The following settings of tracks are available for BED track:

*   `track` - The ID of the track. This value can be used in the
    `default-track-id-list` attribute in `<chart-area>` tags or
    `<chart-controller>` tags.
*   `type` - The type of the track. For BED tracks this should be `bed`.
*   `shortLabel` - The label that will be shown in the label region.
*   `longLabel` - More detailed description of the track. Will be shown in a
    future update.
*   `priority` - The order of the track in the browser. Smaller value means the
    the track will be shown in a higher location.
*   `visibility` - The display mode of the track. See
    [Display Modes](#display-modes) for details.
*   `adaptive` - Whether to change the display mode of this track adaptively.
    See [Display Modes](#display-modes) for details.

## Supported Metadata

Currently the tracks in GIVE can have properties used to store meta data of the
track. The following meta data entries are used in filtering ENCODE tracks and
will be expanded to support all tracks in a future update:

*   `cellType` - The name of the cell type. For ENCODE cell type names please
    refer to <http://genome.ucsc.edu/ENCODE/cellTypes.html>
*   `labName` - The name of the lab who contributed this data.
*   `dataType` - The type of the data, for example, 'ChIP-Seq peaks'.
*   `trackFeature` - Some data types require specification of additional
    features, for example, the antigen for the antibody in ChIP-Seq experiments
    needs to be provided.
