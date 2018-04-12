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

[ ! -e "$file" ] && echo "Error: $file doesn't exist" && exit 1

[ -z "$mysqlp" ] &&  echo "Please input the password of GIVE MySQL database" && read -s -p "Password:" mysqlp
echo
while [ -z "$mysqlp" ]; do
    echo "Password format error! The input password is blank. Please input again:" && read -s -p "Password:" mysqlp
    echo    
done

if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
    "select count(*) from \`$ref\`.\`grp\` where name='$group_name';") -eq 0 ]; then
    echo "Warning! There is NOT '$group_name' record in 'grp' in ref genome database '$ref'. If you continue to add the '$track_name' track, you can fix the missing group using add_trackGroup.sh later. Or you can exit now. Do you want to continue?"

    read -p "Input y or Y to continue. Press other key to exit.   " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Continue to add the $track_name track ignoring the missing group record ..."
    else
        echo "Exit with nothing changed."
        exit 1
    fi
fi

if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
    "select count(*) from \`$ref\`.\`trackDb\` where tableName = '$track_name';") -eq 1 ]; then
    echo "Error! There is already a '$track_name' track record in the ref genome database '$ref'."
    echo "Please use remove_data.sh tool to remove it first."
    echo "Exit with nothing changed."
    exit 1
fi

if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
    "select count(*) from information_schema.tables where \
    table_schema='$ref' and table_name='$track_name';") -eq 1 ]; then
    echo "Error! There is already a '$track_name' data table (but without track record in trackDb) in the ref genome database '$ref'."
    echo "Please use remove_data.sh tool to remove it first."
    echo "Exit with nothing changed."
    exit 1
fi

read -r -d '' mysql_query <<EOF
INSERT INTO \`$ref\`.\`trackDb\` VALUES (
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

CREATE TABLE \`$ref\`.\`$track_name\` ( 
        \`chrom\` varchar(255) NOT NULL DEFAULT '',
        \`chromStart\` int(10) unsigned NOT NULL DEFAULT '0',
        \`chromEnd\` int(10) unsigned NOT NULL DEFAULT '0',
        \`name\` varchar(255) NOT NULL DEFAULT '',
        \`score\` int(10) unsigned DEFAULT NULL,
        \`strand\` char(1) NOT NULL DEFAULT '',
        \`thickStart\` int(10) unsigned DEFAULT NULL,
        \`thickEnd\` int(10) unsigned DEFAULT NULL,
        \`itemRGB\` longblob DEFAULT NULL,
        \`blockCount\` int(10) unsigned DEFAULT NULL,
        \`blockSizes\` longblob DEFAULT NULL,
        \`blockStarts\` longblob DEFAULT NULL
    );

LOAD DATA LOCAL INFILE "$file" INTO TABLE \`$ref\`.\`$track_name\`; 
EOF

echo $mysql_query |  mysql --local-infile  -u$mysqlu -p$mysqlp

echo "Finished. $track_name has been added."

