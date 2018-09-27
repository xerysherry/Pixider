Pixider
=======

pixiv spider

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
> showi[userid][page?]: Show current downloaded user's illusts'
> allfav: Download All Favourite
> start: Check Bookmark new Illustions & new Favourite
> loop: Loop
> zip[user|fav][outfile file.zip][nodown|nodownload?][desc?]: Wrap a zip file
