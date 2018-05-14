#!/bin/bash
#set -e
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-u <mysqlu>] [-p <mysqlp>] [-r <ref>] [-s <species_name>] [-c <species_cname>] [-f <file>]
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
        \?) usage && exit 1;;
        *) usage;;
    esac
done

[ -z "$mysqlu" ] && echo "Error: -u <mysqlu> is empty" && usage && exit 1 
#[ -z "$mysqlp" ] && echo "Error: -p <mysqlp> is empty" && usage && exit 1 
[ -z "$ref" ] && echo "Error: -r <ref> is empty" && usage && exit 1 
[ -z "$species_name" ] && echo "Error: -s <species_name> is empty" && usage && exit 1 
[ -z "$species_cname" ] && echo "Error: -c <species_cname> is empty" && usage && exit 1 
[ -z "$file" ] && echo "Error: -f <file> is empty" && usage && exit 1 

[ ! -e "$file" ] && echo "Error: $file doesn't exist" && exit 1

[ -z "$mysqlp" ] &&  echo "Please input the password of GIVE MySQL database" && read -s -p "Password:" mysqlp
echo
while [ -z "$mysqlp" ]; do
    echo "Password format error! The input password is blank. Please input again:" && read -s -p "Password:" mysqlp
    echo    
done



if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
    "select count(*) from \`compbrowser\`.\`ref\` where dbname='$ref';") -eq 1 ]; then
    echo "Error! There is already a '$ref' ref genome record in 'compbrowser'."
    echo "Please use remove_data.sh tool to remove it first."
    echo "Exit with nothing changed."
    exit 1
fi

if [ $(mysql -N -s -u$mysqlu -p$mysqlp -e \
    "select count(*) from INFORMATION_SCHEMA.SCHEMATA where SCHEMA_NAME ='$ref';") -eq 1 ]; then
    echo "Error! There is already a '$ref' ref genome database (but without ref genome record in 'compbrowser')."
    echo "Please use remove_data.sh tool to remove it first."
    echo "Exit with nothing changed."
    exit 1
fi 


if [ -z "$default_window" ];then
    settings='"browserActive": true'
else
    settings='"browserActive": true, "defaultViewWindows":'"$default_window"
fi

read -r -d '' mysql_query <<EOF
    CREATE DATABASE IF NOT EXISTS compbrowser; 
    CREATE TABLE IF NOT EXISTS \`compbrowser\`.\`ref\` (  
            \`dbname\` varchar(30) NOT NULL DEFAULT '', 
            \`name\` varchar(100) DEFAULT NULL, 
            \`commonname\` varchar(50) DEFAULT NULL,  
            \`browserActive\` tinyint(1) NOT NULL DEFAULT '0', 
            \`settings\` longtext NOT NULL, 
            PRIMARY KEY (\`dbname\`) 
        );
    INSERT INTO \`compbrowser\`.\`ref\` (
            \`dbname\`,
            \`name\`,
            \`commonname\`,
            \`browserActive\`,
            \`settings\`
        ) VALUES (
            '$ref',
            '$species_name',
            '$species_cname',
            1,
            '{
                $settings
            }'
        );
    CREATE DATABASE $ref;
    CREATE TABLE \`$ref\`.\`cytoBandIdeo\` (
            \`chrom\` varchar(255) NOT NULL,
            \`chromStart\` int(10) unsigned NOT NULL,
            \`chromEnd\` int(10) unsigned NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`gieStain\` varchar(255) NOT NULL,
            KEY \`chrom\` (\`chrom\`(23),\`chromStart\`)
        );
    LOAD DATA LOCAL INFILE "$file" INTO TABLE \`$ref\`.\`cytoBandIdeo\`;

    CREATE TABLE \`$ref\`.\`grp\` (
            \`name\` char(150) NOT NULL,
            \`label\` char(255) NOT NULL DEFAULT '', 
            \`priority\` float NOT NULL DEFAULT '0',          
            \`defaultIsClosed\` tinyint(2) DEFAULT NULL, 
            \`singleChoice\` tinyint(1) NOT NULL DEFAULT '0',
            PRIMARY KEY (\`name\`) 
        ) ENGINE=InnoDB;

    CREATE TABLE \`$ref\`.\`trackDb\` (
            \`tableName\` varchar(150) NOT NULL,
            \`type\` varchar(255) NOT NULL,
            \`priority\` float NOT NULL,
            \`url\` longblob,
            \`html\` longtext,
            \`grp\` varchar(255) NOT NULL,
            \`settings\` longtext NOT NULL,
            PRIMARY KEY (\`tableName\`)
        );
EOF

echo $mysql_query |  mysql --local-infile  -u$mysqlu -p$mysqlp 
echo "Finished. $ref ref genome has been initialized."
