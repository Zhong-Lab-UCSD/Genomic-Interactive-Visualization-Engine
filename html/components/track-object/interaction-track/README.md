# Interaction Tracks

Interaction Tracks are tracks to display interacting genomic region pairs
between different genomic windows. They are suitable for displaying paired
interacting regions from experiments such as Hi-C and ChIA-PET.

## Data Format

Currently GIVE supports importing interaction files with scripts into its data
source.

Interaction data files are similar to BED files. They should be tab- or
space-delimited text files. It should be noted that each row represents
__one part__ of interaction. Therefore, for binary interactions (as shown in
Hi-C), every interaction will have two rows.

There are 6 fields for an interaction part:

> __chrom__ - The name of the chromosome.  
> __chromStart__ - The starting position (0-based) of the entry in the
> chromosome.  
> __chromEnd__ - The ending position of the entry in the chromosome. This
> base should __not__ be included in the entry.  
> __linkID__ - The unique ID for the interaction. All parts of the same
> interaction should have the same `linkID`. Because of this, the rows of the
> same interaction do not have to be adjacent to one another.  
> __value__ - This value can be used to represent the strength of the
> interaction. Values will be shown in different colors. If no value is
> associated with any of the regions, use `1` for all of them.
> __dirFlag__ - If the interaction is directional, this value can be used to
> indicate the directionality of this part. It should take a value of `0` or
> `1`. __NOTE__: If the interaction is non-directional, this field should be
> omitted (use `NULL`) or filled by `-1`.

## Display Modes

Currently interaction tracks can be displayed in one mode by setting the
`visibility` property of the track:

*   `Full` - Interacting regions will be plotted between the view windows.
*   `None` - This track is not shown at all.

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
*   `quantiles` - The quantile values used for scaling. If color gradient based
    on quantile instead of absolute values is desired, an array of quantile
    values should be provided here. `value` will be scaled by quantiles before
    being mapped onto the color gradient.

## Supported Metadata

Currently the tracks in GIVE can have properties used to store meta data of the
track. The following meta data entries are used in filtering ENCODE tracks and
will be expanded to support all tracks in a future update:

*   `cellType` - The name of the cell type. For ENCODE cell type names please
    refer to <http://genome.ucsc.edu/ENCODE/cellTypes.html>
*   `labName` - The name of the lab who contributed this data.
*   `dataType` - The type of the data, for example, 'Hi-C'.
*   `trackFeature` - Some data types require specification of additional
    features, for example, the antigen for the antibody in ChIA-PET experiments
    may need to be provided.
