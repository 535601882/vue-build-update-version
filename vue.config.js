// vue.config.js
var SetVersionsWebpackPlugin = require('./plugins/SetVersionsWebpackPlugin')
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