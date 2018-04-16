#!/bin/bash
set -e
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
        \?) usage && exit;;
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


#[ ! -e "$file" ] && echo "Error: $file doesn't exist" && exit 1

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

read -r -d '' mysql_query <<EOF
CREATE TABLE \`$ref\`.\`$track_name\` (
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

echo $mysql_query |  mysql --local-infile -u$mysqlu -p$mysqlp 

echo "Finished. $track_name has been added."
