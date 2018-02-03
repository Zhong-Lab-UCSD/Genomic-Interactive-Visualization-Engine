# bigWig Tracks

bigWig Tracks are tracks for continuous signals across the entire genome. They
are suitable for displaying various "raw" experiment results such as ChIP-Seq
signals, RNA-Seq signals, *etc*.

## Data Format

Currently GIVE supports showing local or remote bigWig files directly.

The description of BigWig file, and how to create a bigWig file from other file
types can be seen from
[the UCSC Genome Browser site - bigWig Track Format](https://genome.ucsc.edu/goldenpath/help/bigWig.html).

## Display Modes

Currently bigWig tracks can be displayed in one mode by setting the `visibility`
property of the track:

*   `Full` - Signals will be plotted against the genome in a line graph.
*   `None` - This track is not shown at all.

## Supported Settings

The following settings of tracks are available for BED track:

*   `track` - The ID of the track. This value can be used in the
    `default-track-id-list` attribute in `<chart-area>` tags or
    `<chart-controller>` tags.
*   `type` - The type of the track. For bigWig tracks this should be `bigwig`.
*   `shortLabel` - The label that will be shown in the label region.
*   `longLabel` - More detailed description of the track. Will be shown in a
    future update.
*   `priority` - The order of the track in the browser. Smaller value means the
    the track will be shown in a higher location.
*   `visibility` - The display mode of the track. See
    [Display Modes](#display-modes) for details.
*   `autoScale` - Whether the display window is scaled automatically. When this
    is set to `true`, the maximum and minimum value will be calculated to be
    the 95th percentile and 5th percentile of all visible data. If zero is not
    included in the range, the range will automatically be expanded to include
    zero.
*   `windowMax` - The maximum value of data shown in the window, only effective
    when `autoScale` is set to `false`.
*   `windowMin` - The minimum value of data shown in the window, only effective
    when `autoScale` is set to `false`.
*   `height` - The height of the track in pixels.

## Supported Metadata

Currently the tracks in GIVE can have properties used to store meta data of the
track. The following meta data entries are used in filtering ENCODE tracks and
will be expanded to support all tracks in a future update:

*   `cellType` - The name of the cell type. For ENCODE cell type names please
    refer to <http://genome.ucsc.edu/ENCODE/cellTypes.html>
*   `labName` - The name of the lab who contributed this data.
*   `dataType` - The type of the data, for example, 'ChIP-Seq signal'.
*   `trackFeature` - Some data types require specification of additional
    features, for example, the antigen for the antibody in ChIP-Seq experiments
    needs to be provided.
