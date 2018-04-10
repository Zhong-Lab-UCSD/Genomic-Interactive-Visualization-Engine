#!/bin/bash
set -e
PROGNAME=$0

usage() {
    cat << EOF >&2
    Usage: $PROGNAME [-r <give_root>] [-b <toolbox_dir>] [-e <example_dir>] [-t <tmp_dir>] [-g <git_branch>]
    
    This script tool will update the GIVE components according to the master branch of GIVE GitHub repo. 
    It will replace the files in directories `<give_root>/includes`,  `<give_root>/html`, and `<toolbox_dir>`. 
    Please make sure that you have the authority to write those files. 

    -r <give_root>: (required) The root directory of GIVE. The default value is `/var/www/give`, the same as the settings in GIVE-Docker.
    -b <toolbox_dir>: (required) The directory of the bash scripts of GIVE-Toolbox. The default value is `/usr/local/bin`, the same as the settings in GIVE-Docker.
    -t <tmp_dir>: (required) A directory for storing temporary files during update. The default value is `/tmp`, the same as the settings in GIVE-Docker.
    -g <git_branch>: (required) The branch of GIVE GitHub repo. The default value is "master".
    -h : show usage help
EOF
    exit 1
}
while getopts r:b:e:t:g:h: opt; do
    case $opt in
        r) give_root=$OPTARG;;
        b) toolbox_dir=$OPTARG;;
        t) tmp_dir=$OPTARG;;
        g) git_branch=$OPTARG;; 
        h) usage;;
        *) usage;;
    esac
done

echo "Updating GIVE components:------------------"
echo "Check directories of installed GIVE, GIVE-Toolbox, and tmp."
if [ -z "$give_root" ]; then
    echo "GIVE root directory is not set! Use default value '/var/www/give'."
    give_root="/var/www/give"
else
    echo "GIVE root directory is set as $give_root."
fi 
if [ ! -w "$give_root" ]; then
    echo "Write permission denied to the $give_root directory. Exit!"
    exit 1
fi

if [ -z "$toolbox_dir" ]; then
    echo "GIVE-Toolbox directory is not set! Use default value '/usr/local/bin'."
    toolbox_dir="/usr/local/bin"
else
    echo "GIVE-Toolbox directory is set as $toolbox_dir."
fi 
if [ ! -w "$toolbox_dir" ]; then
    echo "Write permission denied to the $toolbox_dir directory. Exit!"
    exit 1
fi

if [ -z "$tmp_dir" ]; then
    echo "Tmp directory is not set! Use default value '/tmp'."
    tmp_dir="/tmp"
else
    echo "Tmp directory is set as $tmp_dir."
fi 
if [ ! -w "$tmp_dir" ]; then
    echo "Write permission denied to the $tmp_dir directory. Exit!"
    exit 1
fi

echo "------------------ Check git for cloning the GIVE GitHub repo."

if ! [ -x "$(command -v git)" ]; then
    echo "git is not installed. Try to install it: apt-get install git"
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

if [ -z "$git_branch" ]; then
    echo "Git branch is not set! Use default value 'master'."
    git_branch="master"
else
    echo "Clone the $git_branch branch of GIVE."
fi 

echo "Clone GIVE GitHub repo (master branch) ... "
git clone -b $git_branch https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine.git $tmp_dir/GIVE_update_clone

echo "------------------ Update 'html' and 'includes'."
cp $give_root/includes/constants.php $tmp_dir
cp $give_root/html/components/basic-func/constants.js $tmp_dir
cp -r $tmp_dir/GIVE_update_clone/includes $give_root/
cp -r $tmp_dir/GIVE_update_clone/html $give_root/
cp $tmp_dir/constants.php $give_root/includes/
cp $tmp_dir/constants.js $give_root/html/components/basic-func/

echo "------------------ Update GIVE-Toolbox."
chmod +x $tmp_dir/GIVE_update_clone/GIVE-Toolbox/*.sh
mv $tmp_dir/GIVE_update_clone/GIVE-Toolbox/*.sh $toolbox_dir

echo "------------------ Clean the tmp dir."
rm -rf $tmp_dir/GIVE_update_clone 
rm $tmp_dir/constants.php
rm $tmp_dir/constants.js

echo "================== Update finished."