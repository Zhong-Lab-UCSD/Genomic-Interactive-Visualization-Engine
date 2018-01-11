# Easy local deployment of GIVE using GIVE-Docker
The traditional way to deploy web service needs to install dependencies and configure environment at the operating system level. Although we already supplied a comprehensive manual for system-level [installation of GIVE](https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/blob/master/manuals/1-installation.md), it's hard for users who lack experience in Linux administration to follow. Even for expert users, it's always annoying to do it. 
Here, we provide a modern approach to deploy GIVE, **GIVE-Docker**. We build GIVE-Docker based on [Docker container technology](https://www.docker.com/what-container). It's an operating-system-level virtualization technology, and it makes build, ship and deploy standardized software and web service much easier and more elegant without performance drop. Following this tutorial, you can set a completed genome browser on your computer in minutes. We recommend all users to use GIVE-Docker for deployment. 

## Description of GIVE-Docker image
The GIVE-Docker image is published on [DockerHub](https://hub.docker.com/r/zhonglab/give/). It's built on a [LAMP on Ubuntu container](https://hub.docker.com/r/linode/lamp/). Scripts for building GIVE-Docker can be found in our [GIVE-Docker GitHub Repo](https://github.com/Zhong-Lab-UCSD/GIVE-Docker). 
The GIVE-Docker image delivers an already configured GIVE with LAMP environment (Apache2, MySQL and PHP on Linux), and the data of [Demo2-ENCODE2_ChIA-PET](https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/tree/master/gallery/Demo2-ENCODE2_ChIA-PET) in MySQL database. The configurations of GIVE-Docker are following the [installation manual of GIVE](https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/blob/master/manuals/1-installation.md).

The `root` account passwd of MySQL is `Admin2015`.

## How to use GIVE-Docker?
### 4-steps to deploy GIVE
- **Install Docker CE**
  
  If Docker was not installed on your computer, please download and install [Docker CE]( https://www.docker.com/community-edition ). It's very easy to install and supports all the mainstream operating systems and cloud computing services, such as Mac OS, Windows 10, Ubuntu, AWS and AZURE. 
  After installation, you need to start the Docker service. For Windows and Mac OS users, just start the installed Docker software. For Linux users, you need to run the following command with root privileges. 
  ```
  service docker start
  ```
   
- **Pull GIVE-Docker from [Docker Hub](https://hub.docker.com/r/zhonglab/give/)**

  As we published GIVE-Docker on [Docker Hub](https://hub.docker.com/r/zhonglab/give/), so it's easy to pull GIVE-Docker with a command.
  ```
  docker pull zhonglab/give
  ```

- **Run GIVE-Docker container**

  Excute the following command, then a GIVE container named as `give` will run in background. 
  ```
  docker run -d -it -p 40080:80 -p 40443:443 -p 43306:3306 --name give zhonglab/give
  ```

- **Test the built-in [Demo2-ENCODE2_ChIA-PET](https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/tree/master/gallery/Demo2-ENCODE2_ChIA-PET) genome browser**
  In the previous `docker run` command, `-p` options set three ports for communication between the operating system and GIVE container. With the communication ports `40080 -> 80`(for http) and `40443 -> 443`(for https), we can use web browser to open the built-in Demo2-ENCODE2_ChIA-PET genome browser with following URLs (the https URL may encounter SSL certificate problem).
  
  [http://localhost:40080](http://localhost:40080)
  
  [https://localhost:40443](https://localhost:40443)
  
  ![Demo2 screen](https://github.com/Zhong-Lab-UCSD/Genomic-Interactive-Visualization-Engine/blob/master/gallery/Demo2-ENCODE2_ChIA-PET/GIVE_demo2_chiapet.PNG)


### Essential tips for adding data to GIVE container
After successfully deploying GIVE, you can utilize the power of GIVE to build your portable genome browser. You can learn how to customize your own genome browser in [GIVE Tutorial 1](https://github.com/frankyan/Genomic-Interactive-Visualization-Engine-1/blob/master/tutorials/1-knownCodeDataSource.md), and learn how to add your own data to GIVE MySQL database in [GIVE Tutorial 2](https://github.com/frankyan/Genomic-Interactive-Visualization-Engine-1/blob/master/tutorials/2-dataSource.md). Here, we give you some essential tips for adding data to GIVE container, in case you haven't used Docker before.
- Login to GIVE container
  
  You can login to the running GIVE container `give` as root and then do anything that you want. 
  ```
  docker exec -t -i give /bin/bash
  ```
  Alternatively, you can also directly login to the MySQL database of the container `give`.
  ```
  docker exec -t -i give mysql -uroot -p
  ``` 
  The passwd of MySQL `root` account is `Admin2015`.

- Transfer files
  You can transfer files between GIVE container and your operating system using `docker cp` command. The following commands are examples.
  
  ```
  \# run GIVE-Docker container, named as give
  docker run -d -it -p 40080:80 -p 40443:443 -p 43306:3306 --name give zhonglab/give
  \# copy file test.sh from OS to the container give
  docker cp ~/test.sh give:/tmp/test.sh
  \# copy file from the container give to OS
  docker give:/tmp/test.sh ~/test.sh
  ```
- Data storage of MySQL

