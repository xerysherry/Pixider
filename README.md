Pixider
=======

pixiv spider。如果希望看中文文档，请往下翻。

How to install
--------------

Clone it to your machine.

```sh
git clone https://github.com/xerysherry/Pixider
cd Pixider
npm install
npm link
```

How to use
----------

First, edit `src/conf.user.js`. Enter your pixiv id/password, and work path

```
conf = {
    //START TIME
    START_TIME: 0100,
    //PIXIV ID
    PIXIVID:"enter your pixiv id",
    //PIXIV PASSWORD
    PIXIVPW:"enter your pixiv password",
    //DOWNLOAD PATH
    WORKPATH: "enter download path"
}
module.exports = conf;
```

* Download Illusts
```
pixider illust 40120582 41653575
```

* Download Users
```
pixider user 2103429
```

* Download All Favourite
```
pixider allfav
```

* Download new bookmark/ new favourite
```
pixider start
```

* Loop
If you want to deploy a services, use it.
```
pixider loop
```

* Show Download User List
```
pixider showu
```
If User List is very big, you can use 'page'
```
pixider showu page
```

* Show Download Illusts
```
pixider showi userid
```
If User's illust list is very big, you can use 'page'.
```
pixider showi userid page
```

* Wrap a Zip file
```
pixider zip user userid outfile user.zip
pixider zip fav outfile fav.zip
```
optional:  
> nodown|nodownload: no dowload  
> desc: will package  
> outfile: output file  

* Help Desc
> illust[illustid0][illustid1]..: Download Illustion  
> user[userid0][userid1]..: Download User's All Illustions  
> showu[page?]: Show current downloaded userlist  
> showi[userid][page?]: Show current downloaded user's illusts  
> allfav: Download All Favourite  
> start: Check Bookmark new Illustions & new Favourite  
> loop: Loop  
> zip[user|fav][outfile file.zip][nodown|nodownload?][desc?]: Wrap a zip file  

Pixider
=======

pixiv爬虫器

如何安装
--------------

克隆到本地

```sh
git clone https://github.com/xerysherry/Pixider
cd Pixider
npm install
npm link
```

如何使用
----------

首先, 编辑配置文件`src/conf.user.js`。输入你的Pixiv ID与密码，输入爬虫工作路径。

```
conf = {
    //START TIME
    START_TIME: 0100,
    //PIXIV ID
    PIXIVID:"输入pixivID",
    //PIXIV PASSWORD
    PIXIVPW:"输入pixiv密码",
    //DOWNLOAD PATH
    WORKPATH: "输入爬虫工作路径"
}
module.exports = conf;
```

* 下载作品
```
pixider illust 40120582 41653575
```

* 下载某个或某些用户的所有作品
```
pixider user 2103429
```

* 下载你账号下所有收藏作品
```
pixider allfav
```

* 下载新更新的关注作者的作品和新添加的收藏
```
pixider start
```

* 循环模式
如有你希望部署未一个循环执行的服务。`src/conf.user.js`的START_TIME设置每天执行下载的时间
```
pixider loop
```

* 列出当前下载的用户列表
```
pixider showu
```
如果你的用户列表过大，可以使用`page`可选项
```
pixider showu page
```

* 列出某一个用户的当前下载的所有作品
```
pixider showi userid
```
如果该用的作品列表过大，可以使用`page`可选项
```
pixider showi userid page
```

* 打包为ZIP包
```
pixider zip user userid outfile user.zip
pixider zip fav outfile fav.zip
```
可选项:  
> nodown|nodownload: 不进行下载  
> desc: 包含描述文件  
> outfile: 输出文件路径  

* 所有指令描述
> illust[illustid0][illustid1]..: 下载作品  
> user[userid0][userid1]..: 下载用户所有作品  
> showu[page?]: 列出当前下载的所用用户列表  
> showi[userid][page?]: 列出某一个用户当前下载的所有作品  
> allfav: 下载所用收藏作品  
> start: 检查并下载关注用户的新作品和新的收藏  
> loop: 循环模式  
> zip[user|fav][outfile file.zip][nodown|nodownload?][desc?]: 打包zip文件  
