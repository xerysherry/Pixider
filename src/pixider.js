let fs = require("fs");
let path = require("path");
let url = require("url");
let vm = require("vm");
let request = require("request");
let cheerio = require("cheerio");
let tough = require("tough-cookie");
let xlock = require("xlock");
let utils = require("./utils");

var conf = null;
var log = null;

var cookies_file = null;
var cookies_dict = {}
var cookies = request.jar();

var custom_header = {
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
    "Accept-Encoding": "gzip, deflate",
}

const STOP_COUNT_VALUE = 3;
const BOOKMARK_NEW_PAGECOUNT = 10;
const URI_HREF = "https://pixiv.net/";
const HOME_PAGE = "https://www.pixiv.net";
const LOGIN_PAGE = "https://accounts.pixiv.net/login?lang=zh";
const BOOKMARK_NEW_ILLUST = "https://www.pixiv.net/bookmark_new_illust.php";
const MEMBER_ILLUST = "https://www.pixiv.net/member_illust.php";
const FAVOURITE_PAGE = "https://www.pixiv.net/bookmark.php";

var postkey = null;
function GetLoginForm(id, pw)
{
    return {
        pixiv_id: id,
        password: pw,
        post_key: postkey,
        g_recaptcha_response: "",
        captcha: "",
        source: "pc",
        ref:"wwwtop_accounts_index",
        return_to:"https://www.pixiv.net/",
    }
}

function Init(c, l)
{
    conf = c;
    log = l;

    conf.COOKIES_PATH = path.resolve(conf.WORKPATH + '/' + conf.COOKIES_PATH);
    if(!fs.existsSync(conf.COOKIES_PATH))
        fs.mkdirSync(conf.COOKIES_PATH);

    conf.COOKIES_FILE = path.resolve(conf.COOKIES_PATH + "/" + conf.COOKIES_FILE);
    cookies_file = conf.COOKIES_FILE;
    request = request.defaults({jar:cookies, headers:custom_header});
    LoadCookies();

    conf.DESCPATH = path.resolve(conf.WORKPATH + '/' + conf.DESCPATH);
    conf.IMAGEPATH = path.resolve(conf.WORKPATH + '/' + conf.IMAGEPATH);
    conf.PAGEPATH = path.resolve(conf.WORKPATH + '/' + conf.PAGEPATH);
    conf.DAILYPATH = path.resolve(conf.WORKPATH + '/' + conf.DAILYPATH);
    conf.USERPATH = path.resolve(conf.WORKPATH + '/' + conf.USERPATH);
    conf.FAVOURITEPATH = path.resolve(conf.WORKPATH + '/' + conf.FAVOURITEPATH);

    utils.TryCreatePath(conf.DESCPATH);
    utils.TryCreatePath(conf.IMAGEPATH);
    utils.TryCreatePath(conf.PAGEPATH);
    utils.TryCreatePath(conf.USERPATH);
    utils.TryCreatePath(conf.DAILYPATH);
    utils.TryCreatePath(conf.FAVOURITEPATH);
}

function SetToughCookie(cookie, domain)
{
    if(!domain)
        domain = cookie.domain;
    else
        cookie.domain = domain;
    var path = cookie.path;
    
    var d = cookies_dict[domain];
    if(!d)
    {
        d = {};
        cookies_dict[domain] = d;
    }
    var k = d[path];
    if(!k)
    {
        k = {};
        d[path] = k;
    }
    k[cookie.key] = cookie.toString();
}

function UpdateJar(response)
{
    var set_cookies = response.headers["set-cookie"];
    var host = response.request.host;
    if(!set_cookies)
        return;
    for(var i=0; i<set_cookies.length; ++i)
    {
        var cookie = tough.parse(set_cookies[i]);
        var domain = host;
        if(cookie.domain != null)
        {
            domain = cookie.domain;
            cookie.domain = null;
        }
        //cookies.setCookie(cookie, domain);
        SetToughCookie(cookie, domain);
    }
    SaveCookies();
}

function LoadCookies()
{
    if(!fs.existsSync(cookies_file))
    {
        return;
    }
    var json = fs.readFileSync(cookies_file, "utf8");
    cookies_dict = JSON.parse(json);

    for(var k in cookies_dict)
    {
        var domain = k;
        var paths = cookies_dict[k];
        for(var p in paths)
        {
            var strings = paths[p];
            for(var n in strings)
            {
                var s = strings[n];
                var cookie = tough.parse(s);
                cookie.domain = null;
                cookies.setCookie(cookie, "http://" + domain);
            }
        }
    }
}
function SaveCookies()
{
    var json = JSON.stringify(cookies_dict);
    fs.writeFileSync(cookies_file, json, "utf8");
}

const lockname = "PIXIDER"
async function Lock()
{
    await xlock.lock(lockname);
}
function Unlock()
{
    xlock.unlock(lockname);
}
async function Wait()
{
    await xlock.until(() => !xlock.check(lockname));
}
function GetBookmarkNewIllust(page)
{
    if(page <= 1)
        return BOOKMARK_NEW_ILLUST;
    else
        return BOOKMARK_NEW_ILLUST + "?p=" + page;
}
function GetIllustInfo(illust_id)
{
    return MEMBER_ILLUST + "?mode=medium&illust_id=" + illust_id;
}
function GetUserIllustList(user_id)
{
    return MEMBER_ILLUST + "?id=" + user_id;
}
function GetIllustManga(illust_id, page)
{
    if(page == null)
        return MEMBER_ILLUST + "?mode=manga&illust_id=" + illust_id;
    else
        return MEMBER_ILLUST + `?mode=manga_big&&illust_id=${illust_id}&page=${page}`;
}
function GetFavourite(page)
{
    if(page == null || page == 0)
        return FAVOURITE_PAGE
    else
        return FAVOURITE_PAGE + `?rest=show&p=${page}`;
}
function GetRequestURI(u)
{
    var uri = url.parse(u);
    uri.href = URI_HREF;
    return uri;
}
function GetRequestURL(u)
{
    return {url:u, uri:GetRequestURI(u)};
}
function GetIllustDesc(id, title, desc, time, count, tags, user, files)
{
    return JSON.stringify({
        id: id,
        title: title,
        desc: desc,
        time: time,
        count: count,
        tags: tags,
        user: user,
        files: files,
    }, null, 2);
}
function NeedLogin(page)
{
    var $ = cheerio.load(page);
    //find div
    var form = $('div[class=signup-form]');
    if(form == null)
        return false;
    //find class
    var a = form.find(".signup-form__submit");
    if(a == null || a.length == 0)
        return false;
    a = a[0];
    a = a.children[0];
    if(a.data == "立即注册")
        return true
    return true;
}
async function Request(url, callback)
{
    var u = _PrepareURL(url);
    await _DoRequest(null, u, callback);
}
async function RequestPost(url, callback)
{
    var u = _PrepareURL(url);
    await _DoRequest("post", u, callback);
}
function _PrepareURL(url)
{
    if(typeof url == "string")
    {
        return GetRequestURL(url);
    }
    else
    {
        if(url.uri == null)
            url.uri = GetRequestURI(url.url);
        return url;
    }
}
async function _DoRequest(method, url, callback)
{
    var f = request;
    if(method)
    {
        if(method == "post" || method == "POST")
            f = request.post;
    }
    await Lock();
    log.Info("GET " + url.url);

    var e = null;
    var r = null;
    var b = null;
    
    url.gzip = true;
    f(url, (err, resp, body)=>{
        try
        {
            if(err)
                log.Debug(err.toString());
            else
                UpdateJar(resp);
            callback(err, resp, body);
        }
        finally
        {
            Unlock();
        }
    })
    await Wait();
}

async function CheckLogin()
{
    await Request(HOME_PAGE, (err, response, body)=>{
        if(err)
        {
            page = null;
            return 
        }
        page = body;
    });

    if(page == null)
    {
        log.Debug("Request Failure!");
        return false;
    }
    return !NeedLogin(page);
}

async function Login()
{
    postkey = null;

    //获取PostKey
    await Request(LOGIN_PAGE, async (error, response, body)=>{
        if(error)
            return;
        var rx = /"pixivAccount.postKey":"([a-zA-Z0-9]*)"/;
        var m = body.match(rx);
        if(m != null)
            postkey = m[1];
    });

    if(postkey == null)
    {
        log.Debug("pixivAccount.postKey failure")
        return false;
    }
    log.Info("postKey = " + postkey);
    
    var login_form = GetLoginForm(conf.PIXIVID, conf.PIXIVPW);
    var result = true;

    log.Info("Try Login: " + conf.PIXIVID);
    //尝试登陆
    await RequestPost({url:LOGIN_PAGE, form:login_form}, 
        (error, response, body)=>{
        try
        {
            if(error)
                result = false;
        }
        finally
        {
            Unlock();
        }
    });
    return result;
}

function GetTodayDir()
{
    var date = new Date();
    return `${date.getFullYear()}_${date.getMonth()+1}_${date.getDate()}`;
}
function GetLinkDir()
{
    var linkpath =`${conf.DAILYPATH}/${GetTodayDir()}`;
    utils.TryCreatePath(linkpath);
    return linkpath;
}

var first_run = true;
var last_bookmark_new_illustid = -1;
async function AcquireBookmarkNew()
{
    var count = 0;
    var pagecount = BOOKMARK_NEW_PAGECOUNT;
    if(first_run)
    {
        pagecount = 1;
        first_run = false;
    }

    var linkpath = GetLinkDir();
    var downloadlist = [];
    for(var i=1; i<=pagecount; ++i)
    {
        var result = await AcquireBookmarkNewPage(i, last_bookmark_new_illustid, downloadlist);
        if(!result)
            break;
    }
    log.Info("Bookmark New Item : " + downloadlist.length);
    for(var i=0; i<downloadlist.length; ++i)
    {
        var illustid = downloadlist[i];
        if(last_bookmark_new_illustid < illustid)
            last_bookmark_new_illustid = illustid;

        log.Info(`Bookmark New ${i+1}/${downloadlist.length}`);
        await DownloadIllust(illustid, linkpath);
    }
}
async function AcquireBookmarkNewPage(page, last_illust_id, downloadlist)
{
    var url = GetBookmarkNewIllust(page);
    var page = null;

    await Request(url, (err, resp, body)=>{
        if(err)
            return;
        page = body;
    });

    if(page == null)
        return false;
    
    var $ = cheerio.load(page);
    var div = $("div[id=js-mount-point-latest-following]");
    if(div == null || div.length == 0)
        return false;
    var str = div[0].attribs["data-items"];
    var json = JSON.parse(str);
    var skipcount = 0;
    for(var i=0; i<json.length; ++i)
    {
        var info = json[i];
        var illust_id = info.illustId;
        if(illust_id <= last_illust_id)
            return false;
        var destjson = `${conf.IMAGEPATH}/${info.userId}/${illust_id}.json`;
        if(fs.existsSync(destjson))
            ++skipcount;
        else
            downloadlist.push(info.illustId);
        if(skipcount >= STOP_COUNT_VALUE)
            return false;
    }
    return true;
}
var first_favourite_run = true;
async function AcquireFavourite(all)
{
    var first = first_favourite_run;
    if(first_favourite_run)
        first_favourite_run = false;
    if(!all)
        all = false;

    var skipcount = 0;
    var url = GetFavourite();
    var linkpath = conf.FAVOURITEPATH;
    var downloadlist = [];
    while(true)
    {
        var page = null;

        await Request(url, (err, resp, body)=>{
            if(err)
                return;
            page = body;
        });
        if(page == null)
            return;
        
        var $ = cheerio.load(page);
        var ul = $("ul[class='_image-items js-legacy-mark-unmark-list']");
        if(ul == null || ul.length == 0)
            return;
        var illust_list = ul.find("img[class='ui-scroll-view']");
        if(illust_list == null || illust_list.length == 0)
            return;
        
        //Download Illust
        for(var i=0; i<illust_list.length && (all || skipcount < STOP_COUNT_VALUE); ++i)
        {
            var item = illust_list[i];
            var illustid = item.attribs["data-id"];
            var userid = item.attribs["data-user-id"];
            var destjson = `${conf.FAVOURITEPATH}/${illustid}.json`;
            if(fs.existsSync(destjson))
                ++skipcount;
            else
                downloadlist.push([illustid, userid]);
        }

        if(!all)
        {
            if(first)
                break;
            else if(skipcount >= STOP_COUNT_VALUE)
                break;
        }

        var span = $("span[class=next]");
        if(span == null)
            break;
        var a = span.find("a");
        if(a == null || a.length == 0)
            break;

        var nexturi = a[0].attribs.href;
        url = FAVOURITE_PAGE + nexturi;
    }

    log.Info("Favourite New Item : " + downloadlist.length);
    for(var i=downloadlist.length-1; i>=0; --i)
    {
        log.Info(`Favourite ${downloadlist.length-i}/${downloadlist.length}`);

        var item = downloadlist[i];
        var illustid = item[0];
        var userid = item[1];
        var destjson = `${conf.FAVOURITEPATH}/${illustid}.json`;
        if(fs.existsSync(destjson))
            continue;

        await DownloadIllust(illustid, linkpath);
        var srcjson = `${conf.IMAGEPATH}/${userid}/${illustid}.json`;
        fs.symlink(srcjson, destjson, "file",
            err => {
                if (err)
                    log.Error(err.toString());
            });

    }
}
async function DownloadUserIllusts(userid, linkpath)
{
    var url = GetUserIllustList(userid);
    var page = null;

    while(true)
    {
        await Request(url, (err, resp, body)=>{
            if(!err)
                page = body;
        });
        if(page == null)
            return;
        
        var $ = cheerio.load(page);
        var ul = $("ul[class=_image-items]");
        if(ul == null || ul.length == 0)
            return;
        var illust_list = ul.find("li");
        if(illust_list == null || illust_list.length == 0)
            return;
        
        //Download Illust
        for(var i=0; i<illust_list.length; ++i)
        {
            var uri = illust_list[i].children[0].attribs.href;
            var sign = uri.lastIndexOf('=');
            if(sign < 0)
                continue;
            var illustid = uri.substr(sign+1);
            await DownloadIllust(illustid, linkpath);
        }

        var span = $("span[class=next]");
        if(span == null)
            return;
        var a = span.find("a");
        if(a == null || a.length == 0)
            return;

        var nexturi = a[0].attribs.href;
        url = MEMBER_ILLUST + nexturi;
    }
}
/**
 * 返回boolean，true表示完成下载，false表示没有下载或者失败
 * @param {作品ID} illust_id 
 */
async function DownloadIllust(illust_obj, linkpath)
{
    var illust_id = 0;
    if(typeof illust_obj == "string" || typeof illust_obj == "number")
        illust_id = illust_obj;
    else
        illust_id = illust_obj.illustId;

    var url = GetIllustInfo(illust_id);
    var page = null;
    
    await Request(url, (err, resp, body)=>{
        if(err)
            return;
        var rx = /\(({token:.*})\);/i
        var m = body.match(rx);
        if(m != null)
            page = m[1];
    });

    if(page == null)
        return false;

    var sandbox = {};
    vm.runInNewContext(`illustinfo = ${page};`, sandbox);
    
    var preload = sandbox.illustinfo["preload"];
    var illust = preload["illust"][illust_id.toString()];
    var savepath = conf.IMAGEPATH + "/" + illust.userId;
    var desc_path = `${savepath}/${illust_id}.json`;
    var illust_files = [];
    if(fs.existsSync(desc_path))
        return false;

    log.Info(`illust: ${illust_id}; pagecount: ${illust.pageCount}`);
    if(illust.pageCount == 1)
    {
        var image_url = illust.urls.original;
        savepath = await DownloadImage(image_url, url, savepath);
        if(savepath)
            illust_files.push(path.parse(savepath).base);
    }
    else
    {
        savepath = savepath + "/" + illust_id;
        for(var i=0; i<illust.pageCount; ++i)
        {
            log.Info(`page = ${i} / ${illust.pageCount}`);
            url = GetIllustManga(illust_id, i);
            await Request(url, (err, resp, body)=>{
                if(err)
                    page = null;
                else
                    page = body;
            });
            if(page == null)
            {
                log.Debug(`GET ${url} NULL`)
                continue;
            }
            var $ = cheerio.load(page);
            var img = $("img");
            if(img == null || img.length == 0)
                continue;
            var image_url = img[0].attribs.src;
            var n = await DownloadImage(image_url, url, savepath);
            if(n)
                illust_files.push(path.parse(n).base);
        }
    }
    var tags=[];
    var illust_tags = illust.tags.tags;
    for(var i=0; i<illust_tags.length; ++i)
    {
        tags.push(illust_tags[i].tag);
    }

    fs.writeFileSync(desc_path, 
        GetIllustDesc(illust.id,
                    illust.title,
                    illust.description,
                    illust.createDate,
                    illust.pageCount, 
                    tags, 
                    illust.userId, 
                    illust_files));
    
    //写入用户信息
    var userpath = conf.USERPATH + "/" + illust.userId;
    var userdesc = userpath + "/desc.json";
    utils.TryCreatePath(userpath);
    
    var userdescjson = preload.user[illust.userId];
    if(fs.existsSync(userdesc))
    {
        try
        {
            var descjson = JSON.parse(fs.readFileSync(userdesc));
            userdescjson.list = descjson.list;
        }
        catch(err)
        {}
    }
    if(userdescjson.list == null)
    {
        userdescjson.list = {};
    }
    userdescjson.list[illust_id.toString()] = illust.pageCount;
    fs.writeFileSync(userdesc, JSON.stringify(userdescjson, null, 2));

    DownloadImage(userdescjson.image, url, userpath);
    DownloadImage(userdescjson.imageBig, url, userpath);

    if(linkpath != null)
    {
        fs.symlink(savepath, linkpath + "/" + path.parse(savepath).base,
            illust.pageCount == 1 ? "file" : "dir", err => {
                if (err)
                    log.Error(err.toString());
            });
    }

    sandbox.illustinfo = null;
    sandbox = null;
    return true;
}

async function DownloadImage(url, referer, savepath)
{
    var result = true;
    var p = path.parse(url);

    utils.TryCreatePath(savepath);
    savepath = savepath + "/" + p.base;
    if(fs.existsSync(savepath))
    {
        log.Info("EXIST".blue + " " + savepath);
        return savepath;
    }
    await Request({url:url, headers:{
            Accept: "image/webp,image/*,*/*",
            Referer: referer,
        },
        encoding: null,
    }, (err, resp, body)=>{
        if(err == null)
        {
            fs.writeFileSync(savepath,  body);
            log.Info("Download Success: " + savepath);
        }
        else
        {
            log.Info("Download Error: " + url);
        }
    })
    return savepath;
}
async function Prepare()
{
    var login = await CheckLogin();
    //检查登陆
    if(!login)
    {
        //未登陆
        var b = await Login();
        if(b)
        {
            login = await CheckLogin();
            if(!login)
            {
                log.Debug("Login Failure!");
                return false;
            }
        }
    }
    return true;
}
async function Start()
{
    log.Info("Check LoginState")
    var login = await Prepare();
    if(!login)
    {
        log.Error("Login Failure");
        return;
    }
    log.Info("Start Bookmark New");
    await AcquireBookmarkNew();
    log.Info("Start Favourite New");
    await AcquireFavourite();
    log.Info("End");
}
function Logout()
{
    if(fs.existsSync(conf.COOKIES_FILE))
        fs.unlinkSync(conf.COOKIES_FILE);
    log.Info("Unlink " + conf.COOKIES_FILE);
    log.Info("Logout");
}
function ShowUserList(pagemode)
{
    fs.readdir(conf.USERPATH, (err, fils)=>{
        if(err != null)
        {
            log.Error(err);
            return;
        }
        
        descs = [];
        fils.forEach(name => {
            var json = fs.readFileSync(conf.USERPATH + '/' + name + '/desc.json', 'utf8');
            var desc = JSON.parse(json);
            descs.push(desc);
        });

        descs.sort((a, b) =>
        {
            var id1 = Number.MAX_VALUE;
            var id2 = Number.MAX_VALUE;
            if(a != null)
                id1 = parseInt(a.userId);
            if(b != null)
                id2 = parseInt(b.userId);
            return id1 - id2;
        })

        if(pagemode)
        {
            var currindex = 0;
            function ShowDesc(ci, rows)
            {
                console.log("ID          ILLUSTS   NAME           ".yellow)
                if(rows == undefined)
                    rows = 30;
                for(var i = 0; 
                    ci + i < descs.length && i < rows - 2; 
                    ++i)
                {
                    var desc = descs[ci + i];
                    if(desc == null)
                        continue;
                    var illust_count = String(utils.GetDictSize(desc.list));
                    console.log(desc.userId + utils.Space(12 - desc.userId.length) + illust_count +
                                utils.Space(10 - illust_count.length) + desc.name);
                }
                if(ci + i < descs.length - 1)
                    process.stdout.write("Press Any key to Next Page.");
                else
                    process.exit();
                return rows
            }
            currindex += ShowDesc(currindex, process.stdout.rows);
            process.stdin.on('data', chunk=>{
                console.log("".prev_line(2)+"")
                currindex += ShowDesc(currindex, process.stdout.rows);
            });
        }
        else
        {
            console.log("ID          ILLUSTS   NAME           ".yellow)
            descs.forEach(desc => {
                if (desc == null)
                    return;
                var illust_count = String(utils.GetDictSize(desc.list));
                console.log(desc.userId + utils.Space(12 - desc.userId.length) + illust_count +
                    utils.Space(10 - illust_count.length) + desc.name);
            });
        }
        
    });
}
function ShowIllusts(userid, pagemode)
{
    var userpath = conf.USERPATH + '/' + userid;
    if(!fs.existsSync(userpath))
    {
        console.log("Can not found user in library.");
        return
    }

    var json = fs.readFileSync(userpath + '/desc.json', 'utf8');
    var desc = JSON.parse(json);
    
    var descs = [];
    for(var id in desc.list)
    {
        var illust_desc_path = conf.IMAGEPATH + "/" + desc.userId + "/" + id + ".json";
        if(!fs.existsSync(illust_desc_path))
            continue;
        var json = fs.readFileSync(illust_desc_path, 'utf8');
        var illusdesc = JSON.parse(json);
        descs.push(illusdesc);
    }

    descs.sort((a, b) => {
        var id1 = Number.MAX_VALUE;
        var id2 = Number.MAX_VALUE;
        if (a != null)
            id1 = parseInt(a.id);
        if (b != null)
            id2 = parseInt(b.id);
        return id1 - id2;
    })

    if(pagemode)
    {
        var currindex = 0;
        function ShowDesc(ci, rows)
        {
            console.log("ID          PAGE    NAME   ".yellow)
            if(rows == undefined)
                rows = 30;
            for (var i = 0;
                ci + i < descs.length && i < rows - 2;
                ++i) 
            {
                var desc = descs[ci + i];
                if (desc == null)
                    continue;
                var count = String(desc.count)
                console.log(desc.id + utils.Space(12 - desc.id.length) + count +
                    utils.Space(8 - count.length) + desc.title)
            }
            if(ci + i < descs.length - 1)
                process.stdout.write("Press Any key to Next Page.");
            else
                process.exit();
            return rows
        }
        currindex += ShowDesc(currindex, process.stdout.rows);
        process.stdin.on('data', chunk=>{
            console.log("".prev_line(2)+"")
            currindex += ShowDesc(currindex, process.stdout.rows);
        });
    }
    else
    {
        console.log("ID          PAGE    NAME".yellow)
        descs.forEach(desc => {
            if (desc == null)
                return;
            var count = String(desc.count)
            console.log(desc.id + utils.Space(12 - desc.id.length) + count +
                utils.Space(8 - count.length) + desc.title)
        });
    }
}
function ZipUser(zipfile, userid, hasdesc)
{
    var userpath = conf.USERPATH + '/' + userid;
    if(!fs.existsSync(userpath))
    {
        console.log("Can not found user in library.");
        return
    }

    var files = {};
    var json = fs.readFileSync(userpath + '/desc.json', 'utf8');
    var desc = JSON.parse(json);

    var descs = [];
    for(var id in desc.list)
    {
        var illust_desc_path = conf.IMAGEPATH + "/" + desc.userId + "/" + id + ".json";
        if(!fs.existsSync(illust_desc_path))
            continue;
        var json = fs.readFileSync(illust_desc_path, 'utf8');
        var illusdesc = JSON.parse(json);
        if(illusdesc.files == undefined)
            continue;
        if(illusdesc.count == 1)
        {
            var name = illusdesc.files[0];
            var path = conf.IMAGEPATH + "/" + desc.userId + "/" + name;
            files[name] = path;
        }
        else
        {
            var name = id;
            var path = conf.IMAGEPATH + "/" + desc.userId + "/" + id;
            files[name] = path;
        }
        if(hasdesc)
            files[id + ".json"] = illust_desc_path;
    }
    files["user.json"] = userpath + '/desc.json';
    utils.CreateZip(zipfile, conf.ZLIB_LEVEL, files);
}
function ZipFav(zipfile, hasdesc)
{
    var filedict = {};
    fs.readdir(conf.FAVOURITEPATH, (err, files)=>{
        if(err != null)
        {
            log.Error(err);
            return;
        }

        files.forEach(filename=>{
            var p = path.parse(filename);
            if(p.ext !== '.json')
                return;
            var jsonpath = conf.FAVOURITEPATH + "/" + filename;
            var json = fs.readFileSync(jsonpath, 'utf8');
            var desc = JSON.parse(json);

            if(desc.count == 1)
            {
                var name = desc.files[0];
                var filepath = conf.FAVOURITEPATH + "/" + name;
                var linkpath = fs.readlinkSync(filepath, "utf8");
                filedict[name] = linkpath;
            }
            else
            {
                var name = desc.id;
                var filepath = conf.FAVOURITEPATH + "/" + desc.id;
                var linkpath = fs.readlinkSync(filepath, "utf8");
                filedict[name] = linkpath;
            }
            if(hasdesc)
            {
                var linkpath = fs.readlinkSync(jsonpath, "utf8");
                filedict[filename] = linkpath;
            }
        })
        utils.CreateZip(zipfile, conf.ZLIB_LEVEL, filedict);
    })
}
exports.Prepare = Prepare;
exports.GetLinkDir = GetLinkDir;
exports.DownloadUserIllusts = DownloadUserIllusts;
exports.DownloadIllust = DownloadIllust;
exports.Init = Init;
exports.Start = Start;
exports.AcquireFavourite = AcquireFavourite;
exports.Logout = Logout;
exports.ShowUserList = ShowUserList;
exports.ShowIllusts = ShowIllusts;
exports.ZipUser = ZipUser;
exports.ZipFav = ZipFav;