# Easy local deployment of GIVE using GIVE-Docker
The traditional way to deploy web service needs to install dependencies and configure environment at the operating system level. Although we already supplied a comprehensive manual for system-level [installation of GIVE](https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/blob/master/manuals/1-installation.md), it's hard for users who lack experience in Linux administration to follow. Even for expert users, it's always annoying to do it. 
Here, we provide a modern approach to deploy GIVE, **GIVE-Docker**. We build GIVE-Docker based on [Docker container technology](https://www.docker.com/what-container). It's an operating-system-level virtualization technology, and it makes build, ship and deploy standardized software and web service much easier and more elegant without performance drop. Fowllowing this tutorial, you can set a completed genome browser on your computer in minutes. We recommend all users to use GIVE-Docker for deployment. 

## Description of GIVE-Docker image
The GIVE-Docker image is published on [DockerHub](https://hub.docker.com/r/zhonglab/give/). It's built on a [LAMP on Ubuntu container](https://hub.docker.com/r/linode/lamp/). Scripts for building GIVE-Docker can be found in our [GIVE-Docker GitHub Repo](https://github.com/Zhong-Lab-UCSD/GIVE-Docker). 
The GIVE-Docker image delivers an already configured GIVE with LAMP environment (Apache2, MySQL and PHP on Linux), and the data of [Demo2-ENCODE2_ChIA-PET](https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/tree/master/gallery/Demo2-ENCODE2_ChIA-PET) in MySQL database. The configurations of GIVE-Docker are following the [installation manual of GIVE](https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/blob/master/manuals/1-installation.md).

The `root` account passwd of MySQL is `Admin2015`.

## How to use GIVE-Docker?
### 4-steps to deploy GIVE
- **Install Docker CE**
  
  If Docker was not installed on your computer, please download and install [Docker CE]( https://www.docker.com/community-edition ). It's very easy to install and supports all the mainstream operating systems and cloud computing services, such as Mac OS, Windows 10, Ubuntu, AWS and AZURE. 
  
- **Pull GIVE-Docker from [Docker Hub](https://hub.docker.com/r/zhonglab/give/)**

As we published GIVE-Docker on [Docker Hub](https://hub.docker.com/r/zhonglab/give/), so it's easy to pull GIVE-Docker with a command.
```
docker pull zhonglab/give
```

- **Run GIVE-Docker container**

- **Test the built-in [Demo2-ENCODE2_ChIA-PET](https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/tree/master/gallery/Demo2-ENCODE2_ChIA-PET) genome browser**

### Build custom tracks

