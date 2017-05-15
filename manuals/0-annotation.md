||||
| --- | --- | --- |
| ← *None* | [↑ Index](index.md) | [→ 1. Installation](1-installation.md) |

# Annotations in the Manual

There will be many examples in the manual to demonstrate the functionalities of GIVE. These examples will be shown in quotes, like below:
> This will be an example with its code:
> ```
> example.code = true
> ```

Codes will be written in a monospace font. They are intended to be called from the console (such as bash or MySQL), or be included in actual files (like JavaScript or HTML), or be used to indicate names of variables or types. __Please replace codes that are written in bold and italics, and enclosed in angle brackets (`<>`)__, with their corresponding values according to the situation. __Codes in italics only__ are default values and can be replaced by proper values if needed. __All other code are not supposed to be changed__ unless you know exactly what you are doing.

> For example, the following codes are supposed to be used in a MySQL console.
>
> <code>
> CREATE TABLE `<em><strong>&lt;dbname&gt;</strong></em>`.`<em><strong>&lt;linear_track_table_name&gt;</strong></em>` (
>   `fileName` varchar(<em>255</em>) NOT NULL
> );
> </code>
>
>  While __*`<dbname>`*__ and __*`<linear_track_table_name>`*__ needs to be replaced with their corresponding values, and *255* can be changed, everything else, including `fileName` and `varchar`, are not supposed to change.

Special notes will be shown in blocks separated by horizontal lines and written in italics and they'll typically appear with __*NOTE:*__:

***
*__NOTE:__ This is a note.*
***

||||
| --- | --- | --- |
| ← *None* | [↑ Index](index.md) | [→ 1. Installation](1-installation.md) |
