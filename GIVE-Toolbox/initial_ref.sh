#!/bin/bash
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

[  -z "$mysqlu" ] && echo "Error: -u <mysqlu> is empty" && usage && exit 1 
#[  -z "$mysqlp" ] && echo "Error: -p <mysqlp> is empty" && usage && exit 1 
[  -z "$ref" ] && echo "Error: -r <ref> is empty" && usage && exit 1 
[  -z "$species_name" ] && echo "Error: -s <species_name> is empty" && usage && exit 1 
[  -z "$species_cname" ] && echo "Error: -c <species_cname> is empty" && usage && exit 1 
[  -z "$file" ] && echo "Error: -f <file> is empty" && usage && exit 1 

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
    INSERT IGNORE INTO \`compbrowser\`.\`ref\` (
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
    CREATE DATABASE IF NOT EXISTS $ref;
    CREATE TABLE IF NOT EXISTS  \`$ref\`.\`cytoBandIdeo\` (
            \`chrom\` varchar(255) NOT NULL,
            \`chromStart\` int(10) unsigned NOT NULL,
            \`chromEnd\` int(10) unsigned NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`gieStain\` varchar(255) NOT NULL,
            KEY \`chrom\` (\`chrom\`(23),\`chromStart\`)
        );
    LOAD DATA LOCAL INFILE "$file" INTO TABLE \`$ref\`.\`cytoBandIdeo\`;

    CREATE TABLE IF NOT EXISTS \`$ref\`.\`grp\` (
            \`name\` char(150) NOT NULL,
            \`label\` char(255) NOT NULL DEFAULT '', 
            \`priority\` float NOT NULL DEFAULT '0',          
            \`defaultIsClosed\` tinyint(2) DEFAULT NULL, 
            \`singleChoice\` tinyint(1) NOT NULL DEFAULT '0',
            PRIMARY KEY (\`name\`) 
        ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS \`$ref\`.\`trackDb\` (
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

