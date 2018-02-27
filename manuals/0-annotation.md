||||
| --- | --- | --- |
| -- | [↑ Index](Readme.md) | [1. Local deployment of GIVE →](1-Local_deployment_of_GIVE.md) |

# Annotations in the Manual

There will be many examples in the manual to demonstrate the functionalities of GIVE. These examples will be shown in quotes, like below:
> This will be an example with its code:
> ```
> example.code = true
> ```

Code will be written in a monospace font. It is intended to be called from the console (such as bash or MySQL), included in actual files (like JavaScript or HTML), or used to indicate names of variables or types. __Please replace code that is written in bold and italics, and enclosed in angle brackets (`<>`)__, with its corresponding value(s) according to the situation. __Code in italics only__ corresponds to default values and can be replaced by proper values if needed. __All other code is not supposed to be changed__ unless you know exactly what you are doing.

> For example, the following code is supposed to be used in a MySQL-compatible console.
>
> <code>
> CREATE TABLE `<em><strong>&lt;dbname&gt;</strong></em>`.`<em><strong>&lt;linear_track_table_name&gt;</strong></em>` (
>   `fileName` varchar(<em>255</em>) NOT NULL
> );
> </code>
>
>  While __*`<dbname>`*__ and __*`<linear_track_table_name>`*__ need to be replaced with their corresponding values, and *255* can be changed, everything else, including `fileName` and `varchar`, is not supposed to change.

Special notes will be shown in blocks separated by horizontal lines and written in italics and will typically appear with __*NOTE:*__:

***
*__NOTE:__ This is a note.*
***

||||
| --- | --- | --- |
| -- | [↑ Index](Readme.md) | [1. Local deployment of GIVE →](1-Local_deployment_of_GIVE.md) |
