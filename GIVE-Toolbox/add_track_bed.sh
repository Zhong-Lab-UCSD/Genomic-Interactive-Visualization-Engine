#!/bin/bash
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-t <track_name>] [-g <group_name>] [-l <long_label>] [-s <short_label>] [-o <priority>] [-v <visibility>] [-f <file>]
    -u <mysqlu>: (required) MySQL account name
    -p <mysqlp>: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
    -r <ref>: (Required) ref genome database name. The ref genome database must has been initialized. If not, please use initial_ref.sh to do it. 
    -t <track_name>: (Required) track name you want to build from your data. 
    -g <group_name>: (Required) user defined track group name. Multiple tracks can be grouped based on experimental design or techniques, such as group "HiC"and "RNAseq".
    -l <long_label>: (Required) The long label of track. 
    -s <short_label>: (Required) The short label of track. 
    -o <priority>: (Required) The order of the track in the browser. Smaller value means the the track will be shown in a higher location.
    -v <visibility>: (Required) "full", "pack", "collapsed", "notext", "dense", "none". Usually use "pack". Please read GIVE-Toolbox docs for more information.
    -f <file>: (Required) bed format file. It must be a system absolute path.
    -h : show usage help
EOF
    exit 1
}

while getopts u:p:r:t:g:l:s:o:v:f:h: opt; do
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
[  -z "$file" ] && echo "Error: -f <file> is empty" && usage && exit 1 

read -r -d '' mysql_query <<EOF
CREATE TABLE IF NOT EXISTS \`$ref\`.\`$track_name\` ( 
        \`name\` varchar(255) NOT NULL DEFAULT '',
        \`chrom\` varchar(255) NOT NULL DEFAULT '',
        \`strand\` char(1) NOT NULL DEFAULT '',
        \`txStart\` int(10) unsigned NOT NULL DEFAULT '0',
        \`txEnd\` int(10) unsigned NOT NULL DEFAULT '0',
        \`cdsStart\` int(10) unsigned NOT NULL DEFAULT '0',
        \`cdsEnd\` int(10) unsigned NOT NULL DEFAULT '0',
        \`exonCount\` int(10) unsigned NOT NULL DEFAULT '0',
        \`exonStarts\` longblob NOT NULL,
        \`exonEnds\` longblob NOT NULL,
        \`proteinID\` varchar(40) NOT NULL DEFAULT '',
        \`alignID\` varchar(255) NOT NULL DEFAULT '',
        KEY \`name\` (\`name\`),
        KEY \`chrom\` (\`chrom\`(16),\`txStart\`),
        KEY \`chrom_2\` (\`chrom\`(16),\`txEnd\`),
        KEY \`protein\` (\`proteinID\`(16)),
        KEY \`align\` (\`alignID\`)
    );

INSERT IGNORE INTO \`$ref\`.\`trackDb\` VALUES (
        '$track_name',
        'bed',
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
            "type":"bed",
            "visibility":"$visibility",
            "adaptive":true
        }'
    );
EOF


awk 'BEGIN{OFS="\t"}{split($12, starts,"," ); split($11, sizes, ","); exonStarts=""; exonEnds=""; for(i=1;i<=$10;i++){starts[i]+=$2; ends[i]=starts[i]+sizes[i]; exonStarts=exonStarts""starts[i]","; exonEnds=exonEnds""ends[i]",";};exonStarts=substr(exonStarts, 1, length(exonStarts)-1); exonEnds=substr(exonEnds, 1, length(exonEnds)-1); print $4,$1,$6,$2,$3,$7,$8,$10,exonStarts,exonEnds,$5,$9; }' $file| mysql --local-infile=1 -u$mysqlu -p$mysqlp -e "LOAD DATA LOCAL INFILE '/dev/stdin' INTO TABLE \`$ref\`.\`$track_name\`;" 




