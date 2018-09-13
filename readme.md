# 源码笔记助手

## 笔记示例

在vue源码src目录下运行命令：`srch`

```js
// md
// 这里是一些markdown笔记，以// md开头，以// end结束
// 对initMixin解释说明
// end
export function initMixin(Vue: Class<Component>) {
```

将在src同级生成目录`src_md`

```

--src_md
  --config.json(配置文件)
  --out.md(笔记文件)
  --tree.json(扫描文件)
  
```

**out.md内容**

```markdown
#  第1级 core

##  一 instance

###  1 init.js

`export function initMixin(Vue: Class<Component>) {`

 这里是一些markdown笔记
 对initMixin解释说明
 1. 说明1
 2. 注释2
```

## 使用说明

1. 全局安装`npm install src-help -g`。
2. 进入源码目录，运行`srch`, 然后会扫描目录下面所有文件。运行`srch w`,将监听文件变化,更新markdown。
3. 注释块以`// md`开头，以`// end`结尾，将收集中间内容，以及`// end`下一行代码。
4. 初次运行将生成`config.json`和`tree.json`
后续将直接扫描`tree.json`，可以自行对`tree.json`内容进行一定的删减。
5. `config.json`配置项
    - **dealImg**：hexo静态博客服务，对图片进行处理。
    - **more**: hexo静态博客服务，将插入`<!--more-->`。
    - **addPreContent**： 对生成的内容，在最前面插入一些内容。
    - **targetOut**： markdown文件输出路径，为空默认输出路径。

