#!/bin/bash
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-g <group_name>] [-l <long_label>] [-o <priority>] [-s <single_choice>] 
    -u <mysqlu>: (Required) MySQL account name
    -p <mysqlp>: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
    -r <ref>: (Required) ref genome database name. The ref genome database must has been initialized. If not, please use initial_ref.sh to do it. 
    -g <group_name>: (Required) user defined track group name.
    -l <long_label>: (Required) The long label of group, which will be shown on the front end of GIVE. 
    -o <priority>: (Required) Integer start from 0. It will determine the order of groups, 0 is the top.
    -s <single_choice>: (Required) 0 or 1. Whether the group will only allow one track to be active at any time. 0 is FALSE, 1 is TRUE.
    -h : show usage help
EOF
    exit 1
}


while getopts u:p:r:g:l:o:s:h: opt; do
    case $opt in
        u) mysqlu=$OPTARG;;
        p) mysqlp=$OPTARG;;
        r) ref=$OPTARG;;
        g) group_name=$OPTARG;;
        l) long_label=$OPTARG;;
        o) priority=$OPTARG;;
        s) single_choice=$OPTARG;;
        h) usage;;
        *) usage;;
    esac
done

[  -z "$mysqlu" ] && echo "Error: -u <mysqlu> is empty" && usage && exit 1 
#[  -z "$mysqlp" ] && echo "Error: -p <mysqlp> is empty" && usage && exit 1 
[  -z "$ref" ] && echo "Error: -r <ref> is empty" && usage && exit 1 
[  -z "$group_name" ] && echo "Error: -g <group_name> is empty" && usage && exit 1 
[  -z "$long_label" ] && echo "Error: -l <long_label> is empty" && usage && exit 1 
[  -z "$priority" ] && echo "Error: -p <priority> is empty" && usage && exit 1 
[  -z "$single_choice" ] && echo "Error: -s <single_choice> is empty" && usage && exit 1 

read -r -d '' mysql_query <<EOF
INSERT INTO \`$ref\`.\`grp\` VALUES ( 
        '$group_name',
        '$long_label',
        $priority,
        0,
        $single_choice
    );
EOF

echo $mysql_query |  mysql -u$mysqlu -p$mysqlp 

