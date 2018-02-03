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
> __thickStart__ - The starting position at which the feature is drawn thickly (for example, the start codon in gene displays). When there is no thick part, thickStart and thickEnd are usually set to the chromStart position.  
> __thickEnd__ - The ending position at which the feature is drawn thickly (for example the stop codon in gene displays).  
> __itemRgb__ - An RGB value of the form R,G,B (e.g. 255,0,0). If the track line itemRgb attribute is set to "On", this RBG value will determine the display color of the data contained in this BED line. NOTE: It is recommended that a simple color scheme (eight colors or less) be used with this attribute to avoid overwhelming the color resources of the Genome Browser and your Internet browser.  
> __blockCount__ - The number of blocks (exons) in the BED line.  
> __blockSizes__ - A comma-separated list of the block sizes. The number of items in this list should correspond to blockCount.  
> __blockStarts__ - A comma-separated list of block starts. All of the blockStart positions should be calculated relative to chromStart. The number of items in this list should correspond to blockCount.

## Supported Metadata

## Display Modes

## Supported Settings
