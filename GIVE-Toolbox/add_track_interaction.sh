#!/bin/bash
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-t <track_name>] [-g <group_name>] [-l <long_label>] [-s <short_label>] [-o <priority>] [-v <visibility>] [-q <quantile>] [-f <file>]
    -u <mysqlu>: (Required) MySQL account name
    -p <mysqlp>: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
    -r <ref>: (Required) ref genome database name. The ref genome database must has been initialized. If not, please use initial_ref.sh to do it. 
    -t <track_name>: (Required) track name you want to build from your data. 
    -g <group_name>: (Required) user defined track group name. Multiple tracks can be grouped based on experimental design or techniques, such as group "HiC"and "RNAseq".
    -l <long_label>: (Required) More detailed description of the track. Will be shown in a future update.  
    -s <short_label>: (Required) The label that will be shown in the label region.
    -o <priority>: (Required) The order of the track in the browser. Smaller value means the the track will be shown in a higher location.
    -v <visibility>: (Required) "full" or "none". The display mode of the track. If "full", signals will be plotted against the genome in a line graph. If "none", this track is not shown at all.
    -q <quantiles>: (Optional) The quantile values used for scaling. If not supplied, it will be in mono color mode. If color gradient based on quantile is desired, an array of quantile values should be provided here. value will be scaled by quantiles before being mapped onto the color gradient. An example: "0.37,1.32,1.78,2.19,2.60,2.97,3.43,3.85,4.34,4.90,5.48,6.16,6.94,8.01,9.05,10.41,12.37,14.88,19.84,31.77,290.17" 
    -f <file>: (Required) interaction file path. It must be a system absolute path. Make sure MySQL can access this file.
    -h : show usage help
EOF
    exit 1
}

while getopts u:p:r:t:g:l:s:o:v:q:f:h: opt; do
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
        q) quantiles=$OPTARG;;
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
[  -z "$quantiles" ] && echo "Error: -a <autoscale> is empty" && usage && exit 1 
[  -z "$file" ] && echo "Error: -f <file> is empty" && usage && exit 1 

read -r -d '' mysql_query <<EOF
CREATE TABLE IF NOT EXISTS \`$ref\`.\`$track_name\` (
        \`ID\` int(10) unsigned NOT NULL AUTO_INCREMENT,
        \`chrom\` varchar(255) NOT NULL DEFAULT '',
        \`start\` int(10) unsigned NOT NULL DEFAULT '0',
        \`end\` int(10) unsigned NOT NULL DEFAULT '0',
        \`linkID\` int(10) unsigned NOT NULL DEFAULT '0',
        \`value\` float NOT NULL DEFAULT '0',
        \`dirFlag\` tinyint(4) NOT NULL DEFAULT '-1',
        PRIMARY KEY (\`ID\`),
        KEY \`chrom\` (\`chrom\`(16),\`start\`),
        KEY \`chrom_2\` (\`chrom\`(16),\`end\`),
        KEY \`linkID\` (\`linkID\`)
    );

LOAD DATA LOCAL INFILE "$file" INTO TABLE \`$ref\`.\`$track_name\`;

INSERT IGNORE INTO \`$ref\`.\`trackDb\` VALUES (
        '$track_name',
        'interaction',
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
            "type":"interaction",
            "visibility":"$visibility",
            "quantiles": [
                $quantiles
            ]
        }'
    );

EOF

echo $mysql_query |  mysql --local-infile  -u$mysqlu -p$mysqlp 

