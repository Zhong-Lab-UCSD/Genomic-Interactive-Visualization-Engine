# GIVE Tutorial
We provide a series of tutorial to teach you how to build your own genome browser using GIVE. Please learn it step by step.

"Tutorial 0" and "Tutorial 1" show you the simplist way to build genome browser using GIVE-Hub, which is a public GIVE data source. GIVE-Hub hosts hundreds of public data sets, such as ENCODE data. You can easily select data from GIVE-Hub data portal and it will automatically generate your own genome browser. In future, we will also allow users to upload their own data to GIVE-Hub.

If you want to host GIVE service with your own data source, you need to learn from "Tutorial 2" and "Tutorial 3". In "Tutorial 2", you will learn how to deploy GIVE on local machine. We recommend to use the first approach, GIVE-Docker, if you don't have much more linux system administration experience. In "Tutorial 3", you will learn how to use GIVE-ToolBox to easily managing data tracks without MySQL knowledge.
"Tutorial 4" is a gallery showing you several beautifully customized demo genome browsers.

### [GIVE Tutorial 0: Start from a 2 minutes example](0-shortexample.md)
This tutorial will show you the easist way to build a genome growser using GIVE-Hub data source.

### [GIVE Tutorial 1: Building and tweaking a genome browser with GIVE-Hub data source](1-GIVE-Hub.md)
This tutorial is an enhanced version of "Tutorial 0". It will show you more detail of using GIVE-Hub data source to build and tweak a customized genome browser.

### [GIVE Tutorial 2: Deploy GIVE to you local machine](2-deploy.md)
This tutorial will introduce you the two approaches of deploying GIVE service on your local machine. Then you can learn each approach in "Tutorial 2.1" and "Tutorial 2.2".

#### [GIVE Tutorial 2.1: Easy local deployment of GIVE with GIVE-Docker](2.1-GIVE-Docker.md)
This tutorial will show you how to deploy GIVE to your local machines with GIVE-Docker. It's so easy to set up a complete GIVE in minutes without any affects to you host system.

#### [GIVE Tutorial 2.2: Custom installation of GIVE](2.2-custom-installation.md)
This tutorial will teach you how to install GIVE into your Linux system on the local machine. You need to install and configure Apache2, PHP5, MySQL and other softwares and packages. It means that you must have some experiece of Linux administration.

### [GIVE Tutorial 3: Use GIVE-Toolbox to manage data tracks](3-GIVE-Toolbox.md)
After deloying GIVE service to your local machine, you can use GIVE-Toolbox to build data tracks from your own data. GIVE-Toolbox provide you several useful script tools for managing the data in the backend MySQL. With GIVE-Toolbox, you don't need any MySQL code.

### GIVE Tutorial 4: Gallery of demo genome browsers

#### [GIVE Tutorial 4.1: Building a Genome Browser of Long-range promoter contacts with capture Hi-C](../gallery/Demo1-captureHiC_promoter_contacts)
This tutorial will show you how to prepare capture Hi-C data for building a Genome Browser with GIVE.

#### [GIVE Tutorial 4.2: Building a Genome Browser of ChIA-PET long-range chromatin interactions](../gallery/Demo2-ENCODE2_ChIA-PET)
This tutorial will show you how to prepare ChIA-PET data for building a Genome Browser with GIVE.

#### [GIVE Tutorial 4.3: An example genome browser with superimposed wiggle and genomic interaction tracks](https://mcf7.givengine.org/)
This example website shows a GIVE genome browser superimposes epigenomic wiggle tracks and HiC genomic interaction track.

