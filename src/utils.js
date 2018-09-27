let fs = require("fs");
let path =  require("path");
let archiver = require("archiver");

function TryCreatePath(dir)
{
    if(dir === ".")
        return;
    if(fs.existsSync(dir))
        return;
    var p = path.parse(dir);
    TryCreatePath(p.dir);
    fs.mkdirSync(dir);
}

let space = [
    "",
    " ",
    "  ",
    "   ",
    "    ",
    "     ",
    "      ",
    "       ",
    "        ",
    "         ",
    "          ",
    "           ",
]
function Space(n)
{
    if(n >= space.count)
        return space[n-1];
    return space[n]; 
}
function GetDictSize(dict)
{
    if(dict == null)
        return 0;
    var c = 0;
    for(var k in dict)
    {
        ++c;
    }
    return c;
}
function CreateZip(zipfile, level, files)
{
    var notempty = false;
    for(var key in files)
    {
        notempty = true;
        break;
    }
    if(!notempty)
    {
        return;
    }

    var output = fs.createWriteStream(zipfile);
    var archive = archiver('zip',
        {
            zlib: { level: level },
        }
    )
    archive.on('warning', function (err) {
        console.log(err);
        if (err.code === 'ENOENT') {
        } else {
            throw err;
        }
    });
    archive.on('error', function (err) {
        console.log(err);
        throw err;
    });
    archive.pipe(output);

    for(var name in files)
    {
        var fullpath = path.resolve(files[name]);
        if(!fs.existsSync(fullpath))
            continue;
        var stat = fs.statSync(fullpath);
        if(stat.isDirectory())
        {
            archive.directory(fullpath, name);
            console.log("Add Directory " + fullpath)
        }
        else
        {
            archive.file(fullpath, {name:name})
            console.log("Add File " + fullpath)
        }
    }
    archive.append('Create By Pixider', { name: 'info.txt' });
    archive.finalize();

    console.log("Create zipfile: " + path.resolve(zipfile))
}
exports.TryCreatePath = TryCreatePath;
exports.Space = Space;
exports.GetDictSize = GetDictSize;
exports.CreateZip = CreateZip;