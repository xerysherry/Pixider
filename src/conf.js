var user = null;
try
{
    user = require("./conf.user.js")
}
catch(error)
{}
conf = {
    START_TIME: 0100,

    COOKIES_PATH: "cookies",
    COOKIES_FILE: "cookies.json",
    
    USE_CONSOLE_LOG: true,
    USE_FILE_LOG: true,
    FILE_LOG_FILE:"log/pixider.log",

    PIXIVID: null,
    PIXIVPW: null,
    WORKPATH: null,

    DESCPATH: "desc",
    IMAGEPATH: "image",
    USERPATH: "user", 
    PAGEPATH: "page",
    DAILYPATH: "daily",
    FAVOURITEPATH: "favourite",

    ZLIB_LEVEL: 6,
};
if(user)
{
    for(var k in conf)
    {
        if(user[k])
            conf[k] = user[k];
    }
}
module.exports = conf;