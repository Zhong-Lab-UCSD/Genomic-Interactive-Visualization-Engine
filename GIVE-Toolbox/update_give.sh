#!/bin/bash
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-u <mysqlu>] [-p <mysqlp>] [-a <CONFIRM>] [-r <ref>] [-s <species_name>] [-c <species_cname>] [-f <file>]
    -u <mysqlu>: (required) MySQL account name
    -p <mysqlp>: (Optional) MySQL account passwd. Without '-p', the promot will ask you to input password.
    -r <ref>: (Required) ref genome database name
    -s <species_name>: (Required) species name of the ref genome. If it contains space or other special character, please quote it, such as "Homo sapiens". 
    -c <species_cname>: (Required) common name of the species. If it contains space or other special character, please quote it.
    -f <file>: (Required) cytoBandIdeo file path. It must be a system absolute path.
    -w <default_window>: (Optional) Set the default view window of this ref genome. The value must be quoted as '["chrX:100000-200000"]' or '["chr1:100000-200000", "chrX:10000-20000"]' for dual chromosome view window.  
    -h : show usage help
EOF
    exit 1
}
while getopts u:p:r:s:c:f:w:h: opt; do
    case $opt in
        u) mysqlu=$OPTARG;;
        p) mysqlp=$OPTARG;;
        r) ref=$OPTARG;;
        s) species_name=$OPTARG;;
        c) species_cname=$OPTARG;;
        f) file=$OPTARG;;
        w) default_window=$OPTARG;;
        h) usage;;
        *) usage;;
    esac
done
