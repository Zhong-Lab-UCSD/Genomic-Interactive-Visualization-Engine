# Manual of script tools in GIVE-Toolbox

    * [1. initial_ref.sh](#1-initial_refsh)
    * [2. add_trackGroup.sh](#2-add_trackgroupsh)
    * [3. Build Gene Annotaion Track](#3-build-gene-annotaion-track)
    * [4. Build Track from bed File](#4-build-track-from-bed-file)
    * [5. Build Track from bigWig File](#5-build-track-from-bigwig-file)
    * [6. Build Track from interaction File](#6-build-track-from-interaction-file)
    
    


## Usages and arguments of script tools
### 1. `initial_ref.sh`
Use script `initial_ref.sh` to initialize GIVE database structure with a new reference genome.
```
bash initial_ref.sh [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-s <species_name>] [-c <species_cname>] [-f <file>]
```
The arguments of `initial_ref.sh` are:
- `-u <mysqlu>`：(Required) MySQL account name. All the databases will be created under this account, such as `root` in GIVE-Docker. Make sure you have access to this account. 
- `-p <mysqlp>`: (Optional) MySQL account password. Without '-p', the promot will ask you to input password
- `-r <ref>`: (Required) ref genome database name. The database name of reference genome. It must be a valid name less than 10 characters in MySQL, i.e., it cannot contain space, `/`, `\`, `.`, and characters that are not allowed in file name. Example: `hg19`, `hg38`, `b37_decoy`.
- `-s <species_name>`: (Required) species name of the ref genome. The name of the species, such as scientific name, `Homo sapiens`. If it contains space or other special character, please quote it, such as "Homo sapiens".
- `-c <species_cname>`: (Required) common name of the species. Such as `human`. If it contains space or other special character, please quote it.
- `-f <file>`: (Required) cytoBandIdeo file path. It must be a system absolute path. The cytoBandIdeo file defines the genome coordinates. You can download it from UCSC Genome Browser. We also supply some cytoBandIdeo of common human/mouse genomes [here](https://demo.give.genemo.org/annotations/).

### 2. `add_trackGroup.sh`

```
bash add_trackGroup.sh [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-g <group_name>] [-l <long_label>] [-o <priority>] [-s <single_choice>]
```
- `-u <mysqlu>`: (Required) MySQL account name
- `-p <mysqlp>`: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
- `-r <ref>`: (Required) ref genome database name. The ref genome database must has been initialized. If not, please use initial_ref.sh to do it. 
- `-g <group_name>`: (Required) user defined track group name.
- `-l <long_label>`: (Required) The long label of group, which will be shown on the front end of GIVE. 
- `-o <priority>`: (Required) Integer start from 0. It will determine the order of groups, 0 is the top.
- `-s <single_choice>`: (Required) 0 or 1. Whether the group will only allow one track to be active at any time. 0 is FALSE, 1 is TRUE.

### 3. Build Gene Annotaion Track


### 4. Build Track from `bed` File
Using script `addtrack_bed.sh` to add a track into 


### 5. Build Track from `bigWig` File
Use script `add_track_bigwig.sh` to build track from bigWig data file.
```
bash add_track_bigwig.sh [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-t <track_name>] [-g <group_name>] [-l <long_label>] [-s <short_label>] [-o <priority>] [-v <visibility>] [-a <autoscale>] [-W <windowMax>] [-w <windowMin>] [-f <file>]
```

- `-u <mysqlu>`: (Required) MySQL account name
- `-p <mysqlp>`: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
- `-r <ref>`: (Required) ref genome database name. The ref genome database must has been initialized. If not, please use initial_ref.sh to do it. 
- `-t <track_name>`: (Required) track name you want to build from your data. 
- `-g <group_name>`: (Required) user defined track group name. Multiple tracks can be grouped based on experimental design or techniques, such as group "HiC"and "RNAseq".
- `-l <long_label>`: (Required) More detailed description of the track. Will be shown in a future update.  
- `-s <short_label>`: (Required) The label that will be shown in the label region.
- `-o <priority>`: (Required) The order of the track in the browser. Smaller value means the the track will be shown in a higher location.
- `-v <visibility>`: (Required) "full" or "none". The display mode of the track. If "full", signals will be plotted against the genome in a line graph. If "none", this track is not shown at all.
- `-a <autoscale>`: (Required) "true" or "false". Whether the display window is scaled automatically. When this is set to true, the maximum and minimum value will be calculated to be the 95th percentile and 5th percentile of all visible data. If zero is not included in the range, the range will automatically be expanded to include zero.
- `-W <windowMax>`: (Optional) The maximum value of data shown in the window, only effective when autoScale is set to false.
- `-w <windowMin>`: (Optional) The minimum value of data shown in the window, only effective when autoScale is set to false.
- `-f <file>`: (Required) bigWig file path. It must be a system absolute path. Make sure MySQL can access this file.


### 6. Build Track from `interaction` File

```
bash add_track_interaction.sh [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-t <track_name>] [-g <group_name>] [-l <long_label>] [-s <short_label>] [-o <priority>] [-v <visibility>] [-q <quantile>] [-f <file>]
```
- `-u <mysqlu>`: (Required) MySQL account name
- `-p <mysqlp>`: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
- `-r <ref>`: (Required) ref genome database name. The ref genome database must has been initialized. If not, please use initial_ref.sh to do it. 
- `-t <track_name>`: (Required) track name you want to build from your data. 
- `-g <group_name>`: (Required) user defined track group name. Multiple tracks can be grouped based on experimental design or techniques, such as group "HiC"and "RNAseq".
- `-l <long_label>`: (Required) More detailed description of the track. Will be shown in a future update.  
- `-s <short_label>`: (Required) The label that will be shown in the label region.
- `-o <priority>`: (Required) The order of the track in the browser. Smaller value means the the track will be shown in a higher location.
- `-v <visibility>`: (Required) "full" or "none". The display mode of the track. If "full", signals will be plotted against the genome in a line graph. If "none", this track is not shown at all.
- `-q <quantiles>`: (Optional) The quantile values used for scaling. If color gradient based on quantile instead of absolute values is desired, an array of quantile values should be provided here. value will be scaled by quantiles before being mapped onto the color gradient. An example: "0.37,1.32,1.78,2.19,2.60,2.97,3.43,3.85,4.34,4.90,5.48,6.16,6.94,8.01,9.05,10.41,12.37,14.88,19.84,31.77,290.17" 
- `-f <file>`: (Required) interaction file path. It must be a system absolute path. Make sure MySQL can access this file.
