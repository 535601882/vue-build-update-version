/**
 * 基于webpack 4.44.1开发
 * 功能：在webpack打包文件的时候，在指定静态文件内修改hash内容
 */
const pluginName = "SetVersionsWebpackPlugin"
const hashKey = 'APP$$_&&VERSIONS&&_$$HASH'
// 一个 JavaScript 命名函数。
class SetVersionsWebpackPlugin{
  constructor(options = {}) {
      this.options = options
  }

  // 在插件函数上定义一个 `apply` 方法。
  apply(compiler) {//compiler 对象代表了完整的 webpack 环境配置
    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
      const hash = compilation.hash
      let versionsConfig = {}// 版本信息
      let appJsStr = '';// 包含Key的内容，替换key为hash
      let appFilename = '';// 包含关键KEY对应的文件
      const regex = /^js\/app\.(.+)\.js$/ // 过滤 "js/app.451c7791.js"
  
      console.log("hash == ",hash)
      // 遍历所有编译过的资源文件，
      for (let filename in compilation.assets) {
        const source = compilation.assets[filename].source();
        // 过滤静态版本号文件
        if(filename == "version.json"){
          versionsConfig = JSON.parse(source)// 获取内容
        } else if (regex.test(filename)) {
          //webpack 打包过后的js/app.*.js文件,从内容替换key == hash
          appFilename = filename;
          appJsStr = source.replace(hashKey, hash);
        }
      }
      
      versionsConfig.version = hash
      versionsConfig.date = new Date().getTime();
      
      let versionsConfigStr = JSON.stringify(versionsConfig);// stringify
  
      if (appJsStr) {
        // 将这个列表作为一个新的文件资源，插入到 webpack 构建中：
        compilation.assets['version.json'] = {
          source: function() {
            return versionsConfigStr;
          },
          size: function() {
            return versionsConfigStr.length;
          }
        };
        compilation.assets[appFilename] = {
          source: function() {
            return appJsStr;
          },
          size: function() {
            return appJsStr.length;
          }
        };
      }
      //处理完成后调用webpack提供的回调
      callback();
    });
  }
}

module.exports = SetVersionsWebpackPlugin