let fs = require('fs');
let path = require('path');
let Sutil = require('string');
let format = require('./format');

let readFile = require('util').promisify(fs.readFile);
let writeFile = require('util').promisify(fs.writeFile);
let readdir = require('util').promisify(fs.readdir);
let mkdir = require('util').promisify(fs.mkdir);

let log = console.log;
// 遍历生成文件树
async function generateTree(root) {
    let tree = {};
    let baseRoot = root;

    async function travel(root, tree) {
        let dirs = await readdir(root);
        let all = [];
        dirs.forEach(dir => {
            let pathname = root + '/' + dir;
            let stat = fs.lstatSync(pathname);
            // 目录的话
            if (stat.isDirectory()) {
                tree[dir] = {};
                all.push(travel(pathname, tree[dir]));
            }
            else {
                tree[dir] = pathname;
            }
        });

        await Promise.all(all);
    }

    await travel(root, tree);
    return tree;
}

/**
 * 根据每个文件内容，提取注释块
 */
function dealFile(content = '') {
    let len = content.length;
    let result = [];
    let res = Sutil(content).between('// md', '// end').s;
    let reg = /\/\/\s?md\n([\s\S]*?)(?=(\/\/\s?end))/g;
    // let reg = /\/\/\s?md\n((\/\/(.*)\n)*)(?=(\/\/\s?end))/g

    // 找到索引行号
    content.replace(reg, ($0, $1, $2) => {
        result.push($1);
    });

    // 找到注释的代码
    function findCode() {
        let arr = content.split('\n');
        let codeArr = [];
        for (let i = 0; i < arr.length; i++) {
            // end
            if (/\/\/\s*end/.test(arr[i].trim())) {
                codeArr.push(arr[i + 1]);
            }

        }
        return codeArr;
    }

    let codeArr = [];
    if (result.length > 0) {
        codeArr = findCode();
    }

    result = result.map((item, i) => {
        let preCode = `**\`${codeArr[i]}\`**\n\n`;
        return preCode + item.split('\n').map(line => {
                line = line.trim();
                let r = /^\/\/\s?(.*)/;
                if (r.test(line)) {
                    line = line.replace(r, ($0, $1) => $1);
                }

                return line;
            }).join('\n');
    });

    return result;
}

// 读文件然后处理
async function readAndDeal(path, dealFile, mdObj, key) {
    let content = await readFile(path, 'utf8');
    let result = dealFile(content);
    if (result.length > 0) {
        result = result.join('\n\n');
        mdObj[key] = result;
    }
    else {
        result = '';
    }
    return result;
}

/**
 * 遍历文件树，每个文件读取并dealFile，最终得到一颗新树
 */

async function generateMdObj(tree, dealFile) {
    // md文件的对象；
    let mdObj = {};
    let promiseArr = [];

    async function travelFiles(tree, mdObj) {
        for (let k in tree) {
            let val = tree[k];
            if (typeof val === 'string') {
                promiseArr.push(readAndDeal(val, dealFile, mdObj, k));
            }
            else {
                mdObj[k] = {};
                travelFiles(val, mdObj[k]);
            }
        }
    }

    await travelFiles(tree, mdObj);
    await Promise.all(promiseArr);
    return mdObj;
}

function isEmpty(obj) {
    if (typeof obj !== 'object') {
        return !obj;
    }

    if (Object.keys(obj).length <= 0) {
        return true;
    }

    else {
        return Object.keys(obj).every(key => {
            return isEmpty(obj[key]);
        });
    }
}

/**
 * 生成md文档内容
 * 根据注释，有的就生成，没有的不生成
 * @param  {[obj]} tree [md树]
 */

function generateMdContent(tree) {
    let result = '';
    // 给标题增加索引
    function addIndex(level, count) {
        let showLevelCount = {
            1: {
                1: 'Ⅰ ',
                2: 'Ⅱ ',
                3: 'Ⅲ ',
                4: 'Ⅳ ',
                5: 'Ⅴ ',
                6: 'Ⅵ ',
                7: 'Ⅶ ',
                8: 'Ⅷ ',
                9: 'Ⅸ '
            },
            2: {
                1: '一、',
                2: '二、',
                3: '三、',
                4: '四、',
                5: '五、',
                6: '六、',
                7: '七、',
                8: '八、',
                9: '九、'
            },
            3: {
                1: '①',
                2: '②',
                3: '③',
                4: '④',
                5: '⑤',
                6: '⑥',
                7: '⑦',
                8: '⑧',
                9: '⑨'
            },
            4: {
                1: '1.',
                2: '2.',
                3: '3.',
                4: '4.',
                5: '5.',
                6: '6.',
                7: '7.',
                8: '8.',
                9: '9.'
            }
        };

        let showNum = count;

        try {
            showNum = showLevelCount[level][count];
        }
        catch (e) {}

        return showNum;
    }

    function travel(tree, level = 0) {
        level++;
        let count = 0;

        for (let k in tree) {
            count++;
            let val = tree[k];
            let showNum = addIndex(level, count);

            if (typeof val === 'object') {
                if (!isEmpty(val)) {
                    result += '#'.repeat(level) + ` ${showNum}` + k + '\n\n';
                    travel(val, level);
                }
                else {
                    count--;
                }
            }
            else {
                result += '#'.repeat(level) + ` ${showNum}` + k + '\n\n';
                result += (val + '\n-----------\n\n');
            }

        }
    }

    travel(tree);

    return result;
}
// 创建目录
async function addDir(path) {
    if (fs.existsSync(path)) {
    // console.log('目录已存在：', path);
    }
    else {
        await mkdir(path);
    }
}

let watchLock = false;

async function start() {
    let timeStart = new Date().getTime();

    let root = process.cwd();
    let tree = {};
    let projectName = root.split('/').pop();
    let outSource = path.join(root, `../${projectName}_md`);

    await addDir(outSource);

    try {
        tree = require(outSource + '/tree');
    }
    catch (e) {

        tree = await generateTree(root);
        writeFile(outSource + '/tree.json', JSON.stringify(tree, null, 4));
    }

    let mdObj = await generateMdObj(tree, dealFile);

    let mdContent = generateMdContent(mdObj);

    let config = {
        dealImg: false,
        more: false,
        addPreContent: '',
        targetOut: ''
    };

    try {
        config = require(outSource + '/config');
    }
    catch (e) {
        writeFile(outSource + '/config.json', JSON.stringify(config, null, 4));
    }
    // 配置
    mdContent = await format(mdContent, {
        dealImg: config.dealImg,
        more: config.more
    });

    let targetOut = config.targetOut ? config.targetOut : outSource + '/out.md';

    writeFile(targetOut, config.addPreContent + mdContent);

    // console.log('更新完成 ', new Date().getTime() - timeStart);
    
    upDateMd(tree);
}
// TODO： 更新markdown文件,暴力方式，后续优化
async function upDateMd(tree) {
    if (watchLock) {
        return;
    }

    watchLock = true;

    let param = process.argv.slice(2);
    if (param[0] === 'w' || param[0] === '-w') {
        function travelFiles(tree) {
            for (let k in tree) {
                let val = tree[k];
                if (typeof val === 'string') {
                    fs.watch(val, (curr, prev) => {
                        start();
                    });
                }
                else {
                    travelFiles(val);
                }
            }
        }
        travelFiles(tree);
    }
}

module.exports = start;
