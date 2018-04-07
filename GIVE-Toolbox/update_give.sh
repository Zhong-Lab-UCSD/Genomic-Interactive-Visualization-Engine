#!/bin/bash
set -e
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-r <give_root>] [-t <toolbox_dir>] [-e <example_dir>]
    
    This script tool will update the GIVE components according to the master branch of GIVE GitHub repo. 
    It will replace the files in directories `<give_root>/includes`,  `<give_root>/html`, `<toolbox_dir>` and `<example_dir>`. 
    Please make sure that you have the authority to write those files. 

    -r <give_root>: (required) The root directory of GIVE. The default value is `/var/www/give`, the same as the settings in GIVE-Docker.
    -b <toolbox_dir>: (required) The directory of the bash scripts of GIVE-Toolbox. The default value is `/usr/local/bin`, the same as the settings in GIVE-Docker.
    -e <example_dir>: (required) The directory of the example data for GIVE-Toolbox. The default value is `/tmp/example_data`, the same as the settings in GIVE-Docker.
    -t <tmp_dir>: (required) A directory for storing temporary files during update. The default value is `/tmp`, the same as the settings in GIVE-Docker.
    -h : show usage help
EOF
    exit 1
}
while getopts r:t:e:h: opt; do
    case $opt in
        r) give_root=$OPTARG;;
        b) toolbox_dir=$OPTARG;;
        e) example_dir=$OPTARG;;
        t) tmp_dir=$OPTARG;;
        h) usage;;
        *) usage;;
    esac
done

echo "Updating GIVE components:\n------------------"
echo "Check directories of installed GIVE, GIVE-Toolbox, example data and tmp."
if [ -z "$give_root" ]; then
    echo "GIVE root directory is not set! Use default value '/var/www/give'."
    give_root="/var/www/give"
else
    echo "GIVE root directory is set as $give_root."
fi 
if [ ! -w "$give_root" ]; then
    echo "Write permission denied to the $give_root directory.\nExit!"
    exit 1
fi

if [ -z "$toolbox_dir" ]; then
    echo "GIVE-Toolbox directory is not set! Use default value '/usr/local/bin'."
    toolbox_dir="/usr/local/bin"
else
    echo "GIVE-Toolbox directory is set as $toolbox_dir."
fi 
if [ ! -w "$toolbox_dir" ]; then
    echo "Write permission denied to the $toolbox_dir directory.\nExit!"
    exit 1
fi

if [ -z "$example_dir" ]; then
    echo "Directory of GIVE-Toolbox example data is not set! Use default value '/tmp/example_data'."
    toolbox_dir="/tmp/example_data"
else
    echo "Example data directory is set as $example_dir."
fi 
if [ ! -w "$example_dir" ]; then
    echo "Write permission denied to the $example_dir directory.\nExit!"
    exit 1
fi

if [ -z "$tmp_dir" ]; then
    echo "Tmp directory is not set! Use default value '/tmp'."
    tmp_dir="/tmp"
else
    echo "mp directory is set as $tmp_dir."
fi 
if [ ! -w "$tmp_dir" ]; then
    echo "Write permission denied to the $tmp_dir directory.\nExit!"
    exit 1
fi

echo "------------------\nCheck git for cloning the GIVE GitHub repo."

if ! [ -x "$(command -v git)" ]; then
    echo "git is not installed. Try to install it:\napt-get install git"
    apt-get update
    apt-get install git

    if ! [ -x "$(command -v git)" ]; then
        echo "Failed to install git. Exit!"
        exit 1
    else
        echo "Successfully installed git."
    fi
else
    echo "git is OK."
fi
echo "Clone GIVE GitHub repo (master branch) ... "
git clone https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine.git $tmp_dir/GIVE_update_clone

echo "------------------\nUpdate 'html' and 'includes'."
mv $give_root/includes/constants.php $tmp_dir
mv $give_root/html/components/basic-func/constants.js $tmp_dir
mv -r $tmp_dir/GIVE_update_clone/includes $give_root/
mv -r $tmp_dir/GIVE_update_clone/html $give_root/
mv $tmp_dir/constants.php $give_root/includes
mv $tmp_dir/constants.js $give_root/html/components/basic-func/

echo "------------------\nUpdate GIVE-Toolbox."
chmod +x $tmp_dir/GIVE_update_clone/GIVE-Toolbox/*.sh
mv $tmp_dir/GIVE_update_clone/GIVE-Toolbox/*.sh $toolbox_dir

echo "------------------\nUpdate example data of GIVE-Toolbox."
mv $tmp_dir/GIVE_update_clone/GIVE-Toolbox/example_data/* $example_dir

echo "------------------\nClean the tmp dir."
rm -rf $tmp_dir/GIVE_update_clone 
rm $tmp_dir/constants.php
rm $tmp_dir/constants.js

echo "==================\nUpdate finished."