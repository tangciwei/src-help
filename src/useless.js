// 根据文件结构生成所有的
function createMd(tree) {

    let result = '';

    function travel(tree, level = 0) {
        level++;
        let count = 0;
        let mapCount = {
            1: '一',
            2: '二',
            3: '三',
            4: '四',
            5: '五',
            6: '六',
            7: '七',
            8: '八',
            9: '九'
        };
        for (let k in tree) {
            count++;
            let val = tree[k];
            let showNum = count;
            if (level === 1) {
                showNum = '第' + count + '级';
            }

            if (level === 2) {
                showNum = mapCount[count];
                lastLevel = '1';
            }

            result += '#'.repeat(level) + ` ${showNum} ` + k + '\n\n';
            if (typeof val !== 'string') {
                travel(val, level);
            }
            else {

                result += (val + '\n\n');
            }

        }
    }
    travel(tree);
}
