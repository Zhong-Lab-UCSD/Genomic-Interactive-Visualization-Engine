#!/bin/bash

set -e

PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-t <track_name>] [-g <group_name>] [-l <long_label>] [-s <short_label>] [-o <priority>] [-v <visibility>] [-q <quantiles>] [-f <file>]
    -u <mysqlu>: (Required) MySQL account name
    -p <mysqlp>: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
    -r <ref>: (Required) ref genome database name. The ref genome database must has been initialized. If not, please use initial_ref.sh to do it. 
    -t <track_name>: (Required) track name you want to build from your data. 
    -g <group_name>: (Required) user defined track group name. Multiple tracks can be grouped based on experimental design or techniques, such as group "HiC"and "RNAseq".
    -l <long_label>: (Required) More detailed description of the track. Will be shown in a future update.  
    -s <short_label>: (Required) The label that will be shown in the label region.
    -o <priority>: (Required) The order of the track in the browser. Smaller value means the the track will be shown in a higher location.
    -v <visibility>: (Required) "full" or "none". The display mode of the track. If "full", signals will be plotted against the genome in a line graph. If "none", this track is not shown at all.
    -q <quantiles>: (Optional) The quantile values used for scaling. If not supplied, it will be in mono color autoscale mode. If color gradient based on quantile is desired, an array of quantile values should be provided here. Value will be scaled by quantiles before being mapped onto the color gradient. The quantile value used in the GIVE-Toolbox example: -q "0.37,1.32,1.78,2.19,2.60,2.97,3.43,3.85,4.34,4.90,5.48,6.16,6.94,8.01,9.05,10.41,12.37,14.88,19.84,31.77,290.17" 
    -f <file>: (Required) interaction file path. It must be a system absolute path. Make sure MySQL can access this file.
    -m <meta_info>: (Optional) Check GIVE mannual of data format to know supported metainfo, such as cellType and labName. The value of '-m' paramter must be json name/value pair list quoted in single quotations, such as: -m '"cellType":"H1", "labName":"Zhong Lab"'
    -h : show usage help
EOF
    exit 1
}

arg_array=("$@")
for((i=0;i<$#;i++));
do
    if [ $((i%2)) -eq 0 ]; then
        if ! [[ ${arg_array[$i]} =~ ^- ]]; then
            echo "Option error! Invalid option '${arg_array[$i]}'. It doesn't start with '-'. Please check your commandline." && echo "Exit with nothing changed." && exit 1
        fi
    else
        if [[ ${arg_array[$i]} =~ ^- ]]; then
            echo "Option value warning! The value of option ${arg_array[$(($i-1))]}' was set as '${arg_array[$i]}'. Please check your command whether some option value was missed, which caused the incorrect parse."
            echo "If you are sure the value is correct and it's quoted by \"\" in your commandline, please press Y/y to continue. Any other key to exit."
            read -p "Continue with this option value? (y/N)   " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "Continue with option value '${arg_array[$(($i-1))]} ${arg_array[$i]}'..."
            else
                echo "Exit with nothing changed." && exit 1
            fi
        fi
    fi
done


while getopts u:p:r:t:g:l:s:o:v:q:f:m:h: opt; do
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
        m) meta_info=$OPTARG;;
        h) usage;;
        \?) usage && exit 1;;
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
[  -z "$quantiles" ] && quantiles="autoscale"
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
    echo "Error! There is already a '$track_name' track record or data table in the ref genome database '$ref'."
    echo "Please use remove_data.sh tool to remove it first."
    echo "Exit with nothing changed."
    exit 1
fi

if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
    "select count(*) from information_schema.tables where \
    table_schema='$ref' and table_name='$track_name';") -eq 1 ]; then
    echo "Error! There is already a '$track_name' track record or data table in the ref genome database '$ref'."
    echo "Please use remove_data.sh tool to remove it first."
    echo "Exit with nothing changed."
    exit 1
fi

settings='"group":"'$group_name'",
            "longLabel":"'$long_label'",
            "priority":'$priority',
            "shortLabel":"'$short_label'",
            "track":"'$track_name'",
            "type":"interaction",
            "visibility":"'$visibility'",
            "quantiles": [ '$quantiles' ]'

if [[ $meta_info != "" ]]; then
    settings+=', '$meta_info
fi

read -r -d '' mysql_query <<EOF
CREATE TABLE \`$ref\`.\`$track_name\` (
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
        '{ $settings }'
    );

EOF

echo $mysql_query |  mysql --local-infile  -u$mysqlu -p$mysqlp 

