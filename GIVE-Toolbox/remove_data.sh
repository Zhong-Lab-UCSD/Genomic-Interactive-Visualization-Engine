#!/bin/bash
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-g <group_name>] [-t <track_name>] [-a <CONFIRM>]
    -u <mysqlu>: (Required) MySQL account name
    -p <mysqlp>: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
    -r <ref>: (Required) ref genome database name. The ref genome database must has been initialized. If not, please use initial_ref.sh to do it. 
    -t <track_name>: (Required for removing a track) The first priority of removing data. If -t argument was supplied, only the track will be removed. -g and -a arguments will be ignored.
    -g <group_name>: (Required for removing a track group) The second priority of removing data. If -t was not used and -g was supplied, then the track group will be removed. -a arguments will be ignored.
    -a <CONFIRM>: (Required for removing the whole ref genome database) The third priority of removing data. If -t and -g were not used, and "-a CONFIRM" was set, then the whole ref genome database (the name is provided with -r argument) will be removed, including all the tracks belong to it. It's dangerous, be careful.
    -h : show usage help
EOF
    exit 1
}


while getopts u:p:r:t:g:a:h opt; do
    case $opt in
        u) mysqlu=$OPTARG;;
        p) mysqlp=$OPTARG;;
        r) ref=$OPTARG;;
        g) group_name=$OPTARG;;
        t) track_name=$OPTARG;;
        a) a=$OPTARG;;
        h) usage;;
        *) usage;;
    esac
done

[ -z "$mysqlu" ] && echo "Error: -u <mysqlu> is empty" && usage && exit 1 
##[  -z "$mysqlp" ] && echo "Error: -p <mysqlp> is empty" && usage && exit 1 
[ -z "$ref" ] && echo "Error: -r <ref> is empty" && usage && exit 1 
#[  -z "$group_name" ] && echo "Error: -g <group_name> is empty" && usage && exit 1 
#[  -z "$long_label" ] && echo "Error: -l <long_label> is empty" && usage && exit 1 

if [ -n "$track_name" ]; then
    echo "Try to remove track $track_name in ref genome database $ref"
    mysql -u$mysqlu -p$mysqlp -e "DROP TABLE IF EXISTS \`$ref\`.\`$track_name\`"
    mysql -u$mysqlu -p$mysqlp -e "DELETE FROM \`$ref\`.\`trackDb\` WHERE tableName = '$track_name'"
    exit 1
fi

if [ -n "$group_name" ]; then 
    echo "Try to remove track group $group_name in ref genome database $ref"
    mysql -u$mysqlu -p$mysqlp -e "DELETE FROM \`$ref\`.\`grp\` WHERE name = '$group_name'"
    while read line
    do 
        track_array+=("$line")
    done < <(mysql -u$mysqlu -p$mysqlp -Bs -e "select tableName from \`$ref\`.\`trackDb\` where grp=\"$j\"")
            
    for track_name in "${track_array[@]}"
    do
        mysql -u$mysqlu -p$mysqlp -e "DROP TABLE IF EXISTS \`$ref\`.\`$track_name\`"
    done

    mysql -u$mysqlu -p$mysqlp -e "DELETE FROM \`$ref\`.\`trackDb\` WHERE grp = '$group_name'"

    exit 1
fi

if [ "$a" = "CONFIRM" ]; then
    echo "Try to remove the whole ref genome database $ref"
    mysql -u$mysqlu -p$mysqlp -e "DROP DATABASE IF EXISTS $ref"
    mysql -u$mysqlu -p$mysqlp -e "DELETE FROM \`compbrowser\`.\`ref\` WHERE dbname = '$ref'"
    exit 1
fi
