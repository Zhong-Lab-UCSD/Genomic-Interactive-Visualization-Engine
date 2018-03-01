# GIVE Tutorial
We provide a series of tutorials to teach you how to build your own genome browser using GIVE. Please learn it step by step.

"Tutorial 0" and "Tutorial 1" show you the easiest way to build a genome browser using [GIVE Data Hub](https://www.givengine.org/data-hub.html) and tweak it in HTML code. GIVE Data Hub links to a public GIVE data source, which hosts hundreds of public/custom data sets, such as ENCODE data. You can easily select data from GIVE Data Hub and it will automatically generate your own genome browser in HTML code. You can edit the HTML code later to tweak your genome browser.

If you want to host GIVE service with your own data source, you need to learn from "Tutorial 2" and "Tutorial 3". In "Tutorial 2", you will learn how to deploy GIVE on a local machine. We recommend to use the first approach, which is GIVE-Docker, if you don't have much Linux system administration experience. In "Tutorial 3", you will learn how to use GIVE-Toolbox to easily manage data tracks without MySQL knowledge.

"Tutorial 4" is a gallery showing you several nicely customized genome browsers as demos.

## [GIVE Tutorial 0: Start from a 2 minutes example](0-shortexample.md)

This tutorial will show you a simple example of building a genome browser using data source from GIVE Data Hub.

## GIVE Tutorial 1: Build and tweak a genome browser
This tutorial includes two sub-tutorials. GIVE Tutorial 1.1 will teach you how to build a customized genome browser using GIVE Data Hub. GIVE Tutorial 1.2 will illustrate the HTML code details of tweaking a GIVE genome browser.

### [GIVE Tutorial 1.1: Build a genome browser with GIVE Data Hub](1.1-GIVE-Hub.md)

### [GIVE Tutorial 1.2: HTML code detail of tweaking a genome browser](1.2-html-tweak.md)

## GIVE Tutorial 2: Deploy GIVE to your local machine
Using GIVE Data Hub is the easiest way to build a customized genome browser. For users who want to host their own data source, local deployment of GIVE is a good and easy way.

We provide two approaches for deploying GIVE to local machines or cloud services, which are GIVE-Docker and custom installation. The traditional way is custom installation. However, it's always annoying to configure the dependencies and environments, especially for users lack of Linux administration experience. So we recommend a modern way, GIVE-Docker based on Docker container virtualization technology. You can use GIVE-Docker to deploy GIVE in minutes without affecting the host system. Furthermore, GIVE deployed with GIVE-Docker has the same performance as a system-level installation, and it can be used as a standalone application.

We documented both approaches of deployment in GIVE Tutorial 2.1 and 2.2. The following links will lead you to them.

### [GIVE Tutorial 2.1: Easy local deployment of GIVE with GIVE-Docker](2.1-GIVE-Docker.md)

This tutorial will show you how to deploy GIVE to your local machines with GIVE-Docker. It's easy to set up a complete GIVE in minutes without affecting your host system.

### [GIVE Tutorial 2.2: Custom installation of GIVE](2.2-custom-installation.md)

This tutorial will teach you how to install GIVE into your Linux system on the local machine. You need to install and configure Apache2, PHP5, MySQL and other softwares and packages. You will need some experience of Linux administration to follow this tutorial.

## [GIVE Tutorial 3: Use GIVE-Toolbox to manage data tracks](3-GIVE-Toolbox.md)

After deploying GIVE service to your local machine, you can use GIVE-Toolbox to build data tracks from your own data. GIVE-Toolbox provides you with several useful scripts for managing the data in the back end MySQL. With GIVE-Toolbox, you won't need any MySQL code.

## GIVE Tutorial 4: Gallery of demo genome browsers

### [GIVE Tutorial 4.1: Building a Genome Browser of Long-range promoter contacts with capture Hi-C](../gallery/Demo1-captureHiC_promoter_contacts)

This tutorial will show you how to prepare capture Hi-C data for building a Genome Browser with GIVE.

### [GIVE Tutorial 4.2: Building a Genome Browser of ChIA-PET long-range chromatin interactions](../gallery/Demo2-ENCODE2_ChIA-PET)

This tutorial will show you how to prepare ChIA-PET data for building a Genome Browser with GIVE.

### [GIVE Tutorial 4.3: An example genome browser with superimposed wiggle and genomic interaction tracks](https://mcf7.givengine.org/)

This example website shows a GIVE genome browser that superimposes epigenomic wiggle tracks and HiC genomic interaction track.
