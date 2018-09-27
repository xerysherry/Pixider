let path = require("path");
let util = require("util");
let utils = require("./utils");
let colors = require("colors.ts");
const timeout = util.promisify(setTimeout);

//let colors = require("colors.ts");
let logger = require("xulogger");

let conf = require("./conf");
let pixider = require("./pixider");

var need_enter_some_info = false
if(conf.PIXIVID == null)
{
    console.log("Please Enter Pixiv ID!");
    need_enter_some_info = true;
}
if(conf.PIXIVPW == null)
{
    console.log("Please Enter Pixiv Password!");
    need_enter_some_info = true;
}
if(conf.WORKPATH == null)
{
    console.log("Please Enter Work Path!");
    need_enter_some_info = true;
}
if(need_enter_some_info)
    return;

//创建Logger
var log = new logger.Logger();  
if(conf.USE_CONSOLE_LOG)
    log.AddLog(new logger.ConsoleLog(logger.Level.All));
if(conf.USE_FILE_LOG)
{
    var file = conf.WORKPATH + '/' + conf.FILE_LOG_FILE;
    if(file == null)
        file = "./log/pixider.log";
    file = path.resolve(file);
    p = path.parse(file);
    utils.TryCreatePath(p.dir);
    log.AddLog(new logger.FileLog(logger.Level.All, file, true));
}

var next_time = 0;
function GetNextTime(time)
{
    var next_time = Date.now();
    var now = new Date()
    now.setHours(time / 100);
    now.setMinutes(time % 100);
    now.setSeconds(0);
    now.setMilliseconds(0);
    var next = now.getTime();
    while(next < next_time)
    {
        next += 86400 * 1000;
    }
    return next;
}

async function Loop()
{
    while(true)
    {
        if(Date.now() > next_time)
        {
            next_time = GetNextTime(conf.START_TIME);
            //开始
            pixider.Start();
        }
        //等待1min
        await timeout(1000);
    }
}

var use_shell = false;
async function Shell()
{
    var args = process.argv.splice(2);
    for(var i=0; i<args.length; ++i)
    {
        var a = args[i];
        if(a == "login")
        {
            use_shell = true;
            pixider.Init(conf, log);
            await pixider.Prepare();
        }
        else if(a == "logout")
        {
            use_shell = true;
            pixider.Init(conf, log);
            pixider.Logout();
        }
        else if(a == "showusers" || a == "showu")
        {
            use_shell = true;
            pixider.Init(conf, log);
            var pagemode = false;
            for(++i; i<args.length; ++i)
            {
                var w = args[i];
                if(w == "page" || w == "pagemode")
                {
                    pagemode = true;
                    break;
                }
            }
            pixider.ShowUserList(pagemode);
        }
        else if(a == "showillusts" || a == "showi")
        {
            use_shell = true;
            pixider.Init(conf, log);
            var pagemode = false;
            var userid = undefined;
            for(++i; i<args.length; ++i)
            {
                var w = args[i];
                if(w == "page" || w == "pagemode")
                {
                    pagemode = true;
                }
                else
                    userid = w;
            }
            if(userid == null)
            {
                console.log("Please give me a userid!");
                return;
            }
            pixider.ShowIllusts(userid, pagemode)
        }
        else if(a == "illust")
        {
            use_shell = true;

            pixider.Init(conf, log);
            var success = await pixider.Prepare();
            if(!success)
                return;
            for(++i; i<args.length; ++i)
            {
                var w = args[i];
                await pixider.DownloadIllust(w, pixider.GetLinkDir());
            }
            return;
        }
        else if(a == "user")
        {
            use_shell = true;

            pixider.Init(conf, log);
            var success = await pixider.Prepare();
            if(!success)
                return;
            for(++i; i<args.length; ++i)
            {
                var w = args[i];
                await pixider.DownloadUserIllusts(w, pixider.GetLinkDir());
            }
            return;
        }
        else if(a == "allfav")
        {
            use_shell = true;

            pixider.Init(conf, log);
            var success = await pixider.Prepare();
            if(!success)
                return;
            await pixider.AcquireFavourite(true);
            return;
        }
        else if(a == "start")
        {
            use_shell = true;

            pixider.Init(conf, log);
            await pixider.Start();
            return;
        }
        else if(a == "loop")
        {
            use_shell = true;

            pixider.Init(conf, log);
            await Loop();    
        }
        else if(a == "zip")
        {
            use_shell = true;
            pixider.Init(conf, log);

            var mode = -1;
            var zipfile = undefined;
            var download = true;
            var userid = undefined;
            var desc = false;

            for(++i; i<args.length; ++i)
            {
                var w = args[i];
                if(w == "user")
                    mode = 0;
                else if(w == "fav")
                    mode = 1;
                else if(w == "nodownload" || w == "nodown")
                    download = false;
                else if(w == "desc")
                    desc = true;
                else if(w == "outfile")
                {
                    if(i+1 < args.length)
                        zipfile = args[++i];
                }
                else
                {
                    userid = w;
                }
            }

            if(mode < 0)
            {
                console.log("Please select mode user|fav")
                return;
            }
            else if(userid == undefined)
            {
                console.log("Please give me a userid!");
                return;
            }
            
            switch(mode)
            {
                // user
                case 0:
                    if(download)
                        await pixider.DownloadUserIllusts(userid, pixider.GetLinkDir());
                    if(zipfile == undefined)
                        zipfile = "user" + userid + ".zip";
                    pixider.ZipUser(zipfile, userid, desc);
                    return;
                // fav
                case 1:
                    if(download)
                        await pixider.AcquireFavourite(true);
                    if(zipfile == undefined)
                        zipfile = "favourite.zip";
                    pixider.ZipFav(zipfile, desc);
                    break;
                default:
                    console.log("Please select mode user|fav");
            }
        }
    }
    if(!use_shell)
    {
        console.log(`Pixider. Get All ${"Pixiv".blue.underline} Image!!`);
        console.log(`    illust[illustid0][illustid1]..: Download Illustion`);
        console.log(`    user[userid0][userid1]..: Download User's All Illustions`);
        console.log(`    showu[page?]: Show current downloaded userlist`);
        console.log(`    showi[userid][page?]: Show current downloaded user's illusts'`);
        console.log(`    allfav: Download All Favourite`);
        console.log(`    start: Check Bookmark new Illustions & new Favourite`);
        console.log(`    loop: Loop`);
        console.log(`    zip[user|fav][outfile file.zip][nodown|nodownload?][desc?]: `);
        console.log("    ex. pixider illust " + "40120582".green + " 41653575".green);
        console.log("    ex. pixider user " + "2103429".green);
        console.log("    ex. pixider showu " + "page".gray(5));
        console.log("    ex. pixider showi " + "2103429".green + " page".gray(5));
        console.log("    ex. pixider start"); 
        console.log("    ex. pixider loop");
        console.log("    ex. pixider zip user " + "2103429".green + " nodown".gray(5) + " desc".gray(5))
        console.log("    ex. pixider zip fav " + "nodown".gray(5) + " desc".gray(5))
    }
}
Shell();