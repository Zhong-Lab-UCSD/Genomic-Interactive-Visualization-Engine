#!/bin/bash
PROGNAME=$0
set -e
usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-r <give_root>] [-u <mysqlu>] [-p <mysqlp>] [-d <host_url>]
    
    This script tool will configure the "<give_root>/includes/constants.php" and "<give_root>/html/components/basic-func/constants.js" with user supplied arguments. Please make sure that you have the authority to write these files.
    
    -r <give_root>: (Required) The root directory of GIVE. The default dir in our tutorial is "/var/www/give".
    -u <mysqlu>: (Optional) MySQL account name. It must be correctly set or you will not get any track data. If supplied, it will change the file "<give_root>/includes/constants.php"
    -p <mysqlp>: (Optional) MySQL account passwd. It must be correctly set or you will not get any track data. If supplied, it will change the file "<give_root>/includes/constants.php"
    -d <host_url>: (Optional) If the local machine has a web service and you want to access GIVE through said web service, you need to set <host_url> in the file "<give_root>/html/components/basic-func/constants.js" to the URL pointing to your GIVE server. The value for <host_url> in the GIVE Data Hub is "https://www.givengine.org".
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


while getopts r:u:p:d:h opt; do
    case $opt in
        r) give_root=$OPTARG;;
        u) mysqlu=$OPTARG;;
        p) mysqlp=$OPTARG;;
        d) host_domain=$OPTARG;;
        h) usage;;
        \?) usage && exit 1;;
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
