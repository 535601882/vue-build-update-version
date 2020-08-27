# 服务器部署更新代码时，本地操作访问时为用户做刷新提醒


## 创建插件 SetVersionsWebpackPlugin
webpack 插件由以下组成：

- 一个 JavaScript 命名函数。
- 在插件函数的 prototype 上定义一个 apply 方法。
- 指定一个绑定到 webpack 自身的事件钩子。
- 处理 webpack 内部实例的特定数据。
- 功能完成后调用 webpack 提供的回调。

#### 基本插件架构
```javascript
const pluginName = 'SetVersionsWebpackPlugin';

class SetVersionsWebpackPlugin {
    //定义一个 apply 方法
    apply(compiler) {//compiler 对象代表了完整的 webpack 环境配置
        //指定一个绑定到 webpack 自身的事件钩子
        compiler.hooks.run.tap(pluginName, compilation => {//compilation 对象代表了一次资源版本构建
            //处理 webpack 内部实例的特定数据。
            console.log("webpack 构建过程开始！");
            //功能完成后调用 webpack 提供的回调。
        });

        //emit 钩子  生成资源到 output 目录之前。
        compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
            ……
            // 遍历所有编译过的资源文件，
             for (let filename in compilation.assets) {
                const source = compilation.assets[filename].source();
                ……
                // 在这里进行操作文件。更新版本信息
             }
            ……
        })
    }
}
```

#### Compiler 和 Compilation
在插件开发中最重要的两个资源就是 compiler 和 compilation 对象。理解它们的角色是扩展 webpack 引擎重要的第一步。

- compiler 对象代表了完整的 webpack 环境配置。这个对象在启动 webpack 时被一次性建立，并配置好所有可操作的设置，包括 options，loader 和 plugin。当在 webpack 环境中应用一个插件时，插件将收到此 compiler 对象的引用。可以使用它来访问 webpack 的主环境。

- compilation 对象代表了一次资源版本构建。当运行 webpack 开发环境中间件时，每当检测到一个文件变化，就会创建一个新的 compilation，从而生成一组新的编译资源。一个 compilation 对象表现了当前的模块资源、编译生成资源、变化的文件、以及被跟踪依赖的状态信息。compilation 对象也提供了很多关键时机的回调，以供插件做自定义处理时选择使用。


## vue.config.js

新增vue.config.js文件，configureWebpack属性下为生产环境添加插件 SetVersionsWebpackPlugin

```javascript
module.exports = {
  configureWebpack: config => {
    //生产and测试环境
    let pluginsPro = [new SetVersionsWebpackPlugin()];
    //开发环境
    let pluginsDev = [];
    if(process.env.NODE_ENV === 'production') { 
        // 为生产环境修改配置
        config.plugins = [...config.plugins, ...pluginsPro];
    } else {
        // 为开发环境修改配置
        config.plugins = [...config.plugins, ...pluginsDev];
    }
  }
}
```

## APP.vue

在入口处创建轮询事件，查询服务器版本号json文件进行比对，有差异进行提醒

为避免轮询阻塞主线程，采用web workder技术

> JavaScript 语言采用的是单线程模型，也就是说，所有任务只能在一个线程上完成，一次只能做一件事。Web Worker 的作用，就是为 JavaScript 创造多线程环境，允许主线程创建 Worker 线程，将一些任务分配给后者运行。在主线程运行的同时，Worker 线程在后台运行，两者互不干扰。等到 Worker 线程完成计算任务，再把结果返回给主线程。这样的好处是，一些计算密集型或高延迟的任务，被 Worker 线程负担了，主线程（通常负责 UI 交互）就会很流畅，不会被阻塞或拖慢。

#### 实例：Worker 线程完成轮询
```javascript
function createWorker(f) {
  var blob = new Blob(['(' + f.toString() +')()']);
  //Worker 线程无法读取本地文件，即不能打开本机的文件系统（file://），它所加载的脚本，必须来自网络。
  var url = window.URL.createObjectURL(blob);
  var worker = new Worker(url);
  return worker;
}

var pollingWorker = createWorker(function (e) {
  var cache;

  function compare(new, old) { ... };

  setInterval(function () {
    fetch('/my-api-endpoint').then(function (res) {
      var data = res.json();

      if (!compare(data, cache)) {
        cache = data;
        self.postMessage(data);
      }
    })
  }, 1000)
});

pollingWorker.onmessage = function () {
  // render data
}

pollingWorker.postMessage('init');
```
上面代码中，Worker 每秒钟轮询一次数据，然后跟缓存做比较。如果不一致，就说明服务端有了新的变化，因此就要通知主线程。


##处理静态资源

静态资源可以通过两种方式进行处理：

- 在 JavaScript 被导入或在 template/CSS 中通过相对路径被引用。这类引用会被 webpack 处理。

- 放置在 public 目录下或通过绝对路径被引用。这类资源将会直接被拷贝，而不会经过 webpack 的处理。

存放version版本号的文件存放在public文件下，防止被webpack编译。这样在app fetch（url）的文件名就可以使用原先定义好的version文件，以免被webpack编译之后文件名变化找不到


