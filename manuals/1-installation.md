||||
| --- | --- | --- |
| [← 0. Annotations in the manual](0-annotation.md) | [↑ Index](index.md) | [2. Using GIVE Web Components →](2-webComponents.md) |

# Installation

## Table of Contents
*   [Introduction](#introduction)
*   [Prerequisites](#prerequisites)
    *   [Installing a Web Server](#installing-a-web-server)
    *   [Installing PHP](#installing-php)
    *   [Installing a MySQL-compatible Instance](#installing-a-mysql-compatible-instance)
*   [Overview of Paths](#overview-of-paths)
*   [Installing GIVE Server](#installing-give-server)
    *   [Installing GIVE Server-side Components](#installing-give-server-side-components)
    *   [Installing GIVE Data Sources](#installing-give-data-sources)
*   [Installing GIVE Web Components](#installing-give-web-components)

## Introduction

***
*__NOTE:__ Installation of GIVE is optional and not required to use any of the Web Components of GIVE. By installing GIVE components, you can serve codes and/or data sources directly from your own server.*
***

GIVE consists of two major parts:
*   __GIVE Web Components__, the client-side codes running in browsers, implemented by HTML5;
*   __GIVE server__, this can be any server that is compatible with GIVE Web Components. The source code on GIVE repository, and the implementation on `give.genemo.org`, include two parts:
    *   __GIVE server-side component__, implemented by PHP
    *   __GIVE data sources__

## Prerequisites

### Installing a Web Server

To install any part of GIVE, a web-hosting environment is needed on your server. Please refer to the following information for how to install a web server on your OS:
*   [Apache Server](https://httpd.apache.org/docs/2.4/getting-started.html) (Windows and Linux supported, also [included in Mac OS](https://www.lifewire.com/use-your-mac-to-share-web-site-2260400))
*   [NGINX](https://www.nginx.com/resources/wiki/start/topics/tutorials/install/) (Windows and Linux supported, Mac OS support needs additional work)
*   [Internet Information Services (IIS)](https://www.iis.net/learn/get-started/getting-started-with-iis) (Included in Windows)
*   [Python `SimpleHTTPServer` module](https://docs.python.org/2/library/simplehttpserver.html) (Windows, Mac OS, Linux supported)

***

*__NOTE:__ After installation, the URL to access your web server will be referred to as __`give_host`__ later in the manual.*

***

### Installing PHP

***

*__NOTE:__ This part is only required if you would like to install your own GIVE Server.

***

The server-side component of GIVE requires a functional PHP (7.0 or higher) web server with cURL support to work. Please refer to the following instructions to install PHP and cURL module to your web server:
*   [PHP installation and configuration](http://php.net/manual/en/install.php)
*   [cURL library](http://php.net/manual/en/book.curl.php)

### Installing a MySQL-compatible Instance

***

*__NOTE:__ This part is only required if you would like to install your own GIVE Server.

***

GIVE also needs a MySQL-compatible instance as a data source. Please refer to the following resources for installing your own MySQL instance:
*   [MySQL community server](https://dev.mysql.com/downloads/mysql/)
*   [MariaDB](https://downloads.mariadb.org/)

Due to security concerns, we would recommend you create a dedicated user (instead of `root`) on the instance for GIVE Server.

***

*__NOTE:__ The user will be referred to as __GIVE Database User__, its user name as __`give_data_user`__, and its password as __`give_data_pass`__.*

***

__GIVE Database User__ needs to have the following privileges to function properly:

| Privilege(s) | Database.Table |
| --- | --- |
| `SELECT`, `CREATE TEMPORARY TABLES` | `` `compbrowser`.*`` |
| `SELECT`, `CREATE TEMPORARY TABLES` | `` `<your_reference_databases>`.*`` (See [3. Adding Data in GIVE Data Sources](3-dataSource.md) for a detailed description of reference databases.) |

The SQL code to grant the privileges is shown below:

<pre>
GRANT SELECT, CREATE TEMPORARY TABLES ON `compbrowser`.* TO `<em><strong>&lt;give_data_user&gt;</strong></em>`@'%';
GRANT SELECT, CREATE TEMPORARY TABLES ON `<em><strong>&lt;your_reference_database&gt;</strong></em>`.* TO `<em><strong>&lt;give_data_user&gt;</strong></em>`@'%'; -- please do this for each of your reference database
</pre>

***

*__NOTE:__ You can simply grant those privilages on `*.*`, although this may increase the damage if your __GIVE Database User__ gets compromised. If you determine to do this (please take necessary measures), you can use the following SQL code at the MySQL console:*

<pre>
GRANT SELECT, CREATE TEMPORARY TABLES ON *.* TO `<em><strong>&lt;give_data_user&gt;</strong></em>`@'%';
</pre>

***

## Installing GIVE Server

***

*__NOTE:__ This is completely optional if you don't want to link GIVE to your own data sources. If you wish to use the public GIVE Server hosted at `www.givengine.org`, please use `https://www.givengine.org/` as your __`web_components_path`__ when installing your GIVE Web Components.*

***

GIVE server consists of two parts: GIVE server-side component, which serves as interfaces between GIVE Web Components and the data sources, and the data sources themselves.

### Installing GIVE Server-side Components

Copy everything under `/give/html/givdata/` and `/give/includes/` somewhere on your server. The files under `/give/includes/` does not need to be directly accessed from the web server (and it will be preferable to __keep it inaccessible__ for security reason), however, __it will be easier if the relative path from `/give/html/givdata` to `/give/include` was kept the same.__

***

*__NOTE:__ The file system path where you put `/give/includes/` on your server (including the leading and trailing `/`'s or `\`'s, same below for all paths, for example, `/var/www/give/includes/`) will be referred to as __`include_path`__, and the URL path where you can access `/give/html/givdata/` online (for example, `/givdata/`) from a browser will be referred to as __`give_server_path`__.*

***

You will then need to configure the PHP component and link GIVE Server to the MySQL-compatible instance, by editing the configuration file in GIVE Server. Please make a copy of `constants_template.php` under your __`include_path`__ and edit the following lines to provide the necessary information:

<pre>
  define('CPB_HOST', '<em><strong>&lt;your_mysql_host&gt;</strong></em>');
  define('CPB_USER', '<em><strong>&lt;give_data_user&gt;</strong></em>');
  define('CPB_PASS', '<em><strong>&lt;give_data_pass&gt;</strong></em>');

  define('CLASS_DIR', '<em><strong>&lt;include_path&gt;</strong></em>/classes');
  define('GOOGLE_ANALYTICS_ACCOUNT', '<em><strong>&lt;your_google_analytics_id&gt;</strong></em>');
</pre>

When you are done, __rename it to `constants.php`__ so GIVE Server can access your data source.

### Installing GIVE Data Sources

A database named `compbrowser` with a table named `ref` need to be created on the instance. The `ref` table is used to tell engine what references are available to be displayed and it needs at least the following columns:

| Column name | Type | Description |
| --- | --- | --- |
| `dbname` | `varchar` | The reference database name, only alphanumerics (`[0-9A-Za-z]`) and underscores (`_`) are allowed, *e.g.* `hg38`. <br> *__Note:__ this value will be used in the other tables/databases and be referred to as* __the reference database name__ *or* __`your_reference_database`__ *in the future.* |
| `name` | `varchar` | The formal name of the species, can be the Latin name, *e.g.* `Homo sapiens`. |
| `commonname` | `varchar` | The common name of the species, *e.g.* `human`. |
| `browserActive` | `tinyint` | Whether this reference is active for GIVE, use `1` to indicate it's active. |
| `settings` | `longtext` | Additional settings and tags related to the reference, this should be a string in JSON format. |

The following SQL code can be used to create a `ref` table in
a new `compbrowser` database.
```
CREATE TABLE `compbrowser`.`ref` (
  `dbname` varchar(30) NOT NULL DEFAULT '',
  `name` varchar(100) DEFAULT NULL,
  `commonname` varchar(50) DEFAULT NULL,
  `browserActive` tinyint(1) NOT NULL DEFAULT '0',
  `settings` longtext NOT NULL,
  PRIMARY KEY (`dbname`)
)
```

The data structure is illustrated as below:  
![UML Diagram for the database](images/1-GIVE_DB_comp.png)

## Installing GIVE Web Components

Copy the contents of `/give/html/components` folder to a designated folder on your web server.

***

*__NOTE:__ The URL path where your designated folder can be accessed online on your hosting environment will be referred to as __`web_components_path`__ throughout the manual.*

***

The __`web_components_path`__ will be needed when importing GIVE Web Components in your HTML pages.

After installation, please edit __`<web_components_path>`__`bower_components/genemo-data-components/basic-func/constants.js` to indicate the server-side components' location:

<pre>
give.Host = '<em><strong>&lt;give_host&gt;</strong></em>'
give.ServerPath = '<em><strong>&lt;give_server_path&gt;</strong></em>'
</pre>

||||
| --- | --- | --- |
| [← 0. Annotations in the manual](0-annotation.md) | [↑ Index](index.md) | [2. Using GIVE Web Components →](2-webComponents.md) |
