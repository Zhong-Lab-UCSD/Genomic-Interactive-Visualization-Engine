#!/bin/bash
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-r <give_root>] [-u <mysqlu>] [-p <mysqlp>] [-d <host_domain>]
    
    This script tool will configure the "<give_root>/includes/constants.php" and "<give_root>/html/components/basic-func/constants.js" with user supplied arguments. Please make sure that you have the authority to write these files.
    
    -r <give_root>: (Required) The root directory of GIVE. The default dir in our tutorial is "/var/www/give".
    -u <mysqlu>: (Optional) MySQL account name. It must be correctly set or you will not get any track data. If supplied, it will change the file "<give_root>/includes/constants.php"
    -p <mysqlp>: (Optional) MySQL account passwd. It must be correctly set or you will not get any track data. If supplied, it will change the file "<give_root>/html/components/basic-func/constants.js"
    -d <host_domain>: (Optional) If the local machine has web service and you want to access GIVE through web service, you need to set <host_domain> in the file "<give_root>/html/components/basic-func/constants.js". <host_domain> such as "https://www.givengine.org" we set in the GIVE-Hub.
    -h : show usage help
EOF
    exit 1
}

while getopts r:u:p:d:h opt; do
    case $opt in
        r) give_root=$OPTARG;;
        u) mysqlu=$OPTARG;;
        p) mysqlp=$OPTARG;;
        d) host_domain=$OPTARG;;
        h) usage;;
        *) usage;;
    esac
done

if [ -z "$give_root" ]; then
    echo "GIVE root directory is not set! -r argument is REQUIRED!"
    exit 1
fi 

js_file="$give_root/html/components/basic-func/constants.js"
php_file="$give_root/includes/constants.php"

echo "Checking the GIVE root directory"
if [ -e "$js_file" ]; then
    if [ ! -e "$php_file" ]; then
        echo "GIVE 'html' and 'includes' folders were not set correctly. The \"$give_root/html/components/basic-finc/constants.js\" can be found, but \"$give_root/includes/constants.php\" can NOT be found."
        exit 1
    fi
else
    if [ -e "$php_file" ]; then
        echo "GIVE 'html' and 'includes' folders were not set correctly. The \"$give_root/includes/constants.php\" can be found, but \"$give_root/html/components/basic-finc/constants.js\" can NOT be found."
        exit 1
    else
        echo "\"$give_root\" is NOT the correct GIVE root directory. The \"$give_root/includes/constants.php\" and \"$give_root/html/components/basic-finc/constants.js\" files can NOT be found."
        exit 1
    fi
fi
echo "OK! GIVE root directory \"$give_root\" is correct!"

tmp_dir="$give_root/includes/classes/"
tmp_dir=${tmp_dir//\//\\\/}
host_domain=${host_domain//\//\\\/}
sed -i "s/'CLASS_DIR', '.\+');/'CLASS_DIR', '$tmp_dir');/g" $php_file

if [ ! -z "$mysqlu" ]; then
    sed -i "s/'CPB_USER', '.\+');/'CPB_USER', '$mysqlu');/g" $php_file
fi

if [ ! -z "$mysqlp" ]; then
    sed -i "s/'CPB_PASS', '.\+');/'CPB_PASS', '$mysqlp');/g" $php_file
fi

if [ ! -z "$host_domain" ]; then
    sed -i "s/give.Host = '.\+$/give.Host = '$host_domain'/g" $js_file
fi
