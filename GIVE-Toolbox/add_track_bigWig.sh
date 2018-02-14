#!/bin/bash
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-t <track_name>] [-g <group_name>] [-l <long_label>] [-s <short_label>] [-o <priority>] [-v <visibility>] [-a <autoscale>] [-W <windowMax>] [-w <windowMin>] [-f <file>]
    -u <mysqlu>: (Required) MySQL account name
    -p <mysqlp>: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
    -r <ref>: (Required) ref genome database name. The ref genome database must has been initialized. If not, please use initial_ref.sh to do it. 
    -t <track_name>: (Required) track name you want to build from your data. 
    -g <group_name>: (Required) user defined track group name. Multiple tracks can be grouped based on experimental design or techniques, such as group "HiC"and "RNAseq".
    -l <long_label>: (Required) More detailed description of the track. Will be shown in a future update.  
    -s <short_label>: (Required) The label that will be shown in the label region.
    -o <priority>: (Required) The order of the track in the browser. Smaller value means the the track will be shown in a higher location.
    -v <visibility>: (Required) "full" or "none". The display mode of the track. If "full", signals will be plotted against the genome in a line graph. If "none", this track is not shown at all.
    -a <autoscale>: (Required) "true" or "false". Whether the display window is scaled automatically. When this is set to true, the maximum and minimum value will be calculated to be the 95th percentile and 5th percentile of all visible data. If zero is not included in the range, the range will automatically be expanded to include zero.
    -W <windowMax>: (Optional) The maximum value of data shown in the window, only effective when autoScale is set to false.
    -w <windowMin>: (Optional) The minimum value of data shown in the window, only effective when autoScale is set to false.
    -f <file>: (Required) bigWig file path. It must be a system absolute path. Make sure MySQL can access this file.
    -h : show usage help
EOF
    exit 1
}

while getopts u:p:r:t:g:l:s:o:v:a:W:w:f:h: opt; do
    case $opt in
        u) mysqlu=$OPTARG;;
        p) mysqlp=$OPTARG;;
        r) ref=$OPTARG;;
        t) track_name=$OPTARG;;
        g) group_name=$OPTARG;;
        l) long_label=$OPTARG;;
        s) short_label=$OPTARG;;
        o) priority=$OPTARG;;
        v) visibility=$OPTARG;;
        a) autoscale=$OPTARG;;
        W) windowMax=$OPTARG;;
        w) windowMin=$OPTARG;;
        f) file=$OPTARG;;
        h) usage;;
        *) usage;;
    esac
done

[  -z "$mysqlu" ] && echo "Error: -u <mysqlu> is empty" && usage && exit 1 
#[  -z "$mysqlp" ] && echo "Error: -p <mysqlp> is empty" && usage && exit 1 
[  -z "$ref" ] && echo "Error: -r <ref> is empty" && usage && exit 1 
[  -z "$track_name" ] && echo "Error: -t <track_name> is empty" && usage && exit 1 
[  -z "$group_name" ] && echo "Error: -g <group_name> is empty" && usage && exit 1 
[  -z "$long_label" ] && echo "Error: -l <long_label> is empty" && usage && exit 1 
[  -z "$short_label" ] && echo "Error: -s <short_label> is empty" && usage && exit 1 
[  -z "$priority" ] && echo "Error: -o <priority> is empty" && usage && exit 1 
[  -z "$visibility" ] && echo "Error: -v <visibility> is empty" && usage && exit 1 
[  -z "$autoscale" ] && echo "Error: -a <autoscale> is empty" && usage && exit 1 
[  -z "$file" ] && echo "Error: -f <file> is empty" && usage && exit 1 

read -r -d '' mysql_query <<EOF
CREATE TABLE IF NOT EXISTS \`$ref\`.\`$track_name\` (
        \`fileName\` varchar(255) NOT NULL
    );

INSERT IGNORE INTO \`$ref\`.\`$track_name\` VALUES (
        '$file'
    );

INSERT IGNORE INTO \`$ref\`.\`trackDb\` VALUES (
        '$track_name',
        'bigwig',
        1,
        NULL,
        NULL,
        '$group_name',
        '{
            "group":"$group_name",
            "longLabel":"$long_label",
            "priority":$priority,
            "shortLabel":"$short_label",
            "track":"$track_name",
            "type":"bigwig",
            "visibility":"$visibility",
            "autoScale":$autoscale
        }'
    );

EOF

echo $mysql_query |  mysql -u$mysqlu -p$mysqlp 

