<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<script>
  /*创建worker线程*/
  const createWorker = function(f) {
    let blob = new Blob(['(' + f.toString() + ')()']);
    let url = window.URL.createObjectURL(blob);
    let worker = new Worker(url);
    return worker;
  }

  import config from "@/config/version.js"//
  export default {
    data(){
      return {
        cancelDelay: 1000 * 60 * 60,// 下一次函数执行的时间
        pollingWorker: null // work实例
      }
    },
    created(){
      this.checkVersions()
    },
    methods:{
       // 访问前端服务器获取版本号
      checkVersions(){
        fetch(`/version.json`)
        .then((res) => res.json())
        .then((response) => {
          if(config.version !== response.version){
            // 利用setTimeout的作用是点击取消，延迟下次查询的时间
            this.openNotify( ()=> {
              setTimeout(this.startPollingTask, this.cancelDelay);
            }, response);
          }else{
            this.startPollingTask()
          }
        })
      },
      // 弹出提醒
      openNotify(cancelCallback, data) {
        console.log(data)
        var r = confirm("版本有更新，是否要刷新?");
        if (r){
            window.location.reload()//加载页面
        }else{
           cancelCallback && cancelCallback();
        }
      },
      /*轮询任务*/
      startPollingTask() {
        this.pollingWorker = createWorker( function(){
          let url = '',
              version = '',
              timer = null;
          //接收主线程传来的消息
          self.onmessage = function (message) {
            console.log("接收主线程传来的消息",message.data);
            url = message.data.url;
            version = message.data.version;
            start();
          }
          let start = function () {
            timer = setInterval(() => {
              self.fetch(`${url}?_t=${Date.now()}`)
              .then((res) => res.json())
              .then(data => {
                console.log("data.version === ",data)
                console.log("config version === ",version)
                if (data.version !== version) {
                  self.postMessage(data);// 版本号不同的状况下发送
                  clearInterval(timer);
                }
              });
            }, 60000 * 2);
          }
        });

        //接收子线程发回来的消息(版本号不同的状态下才有消息)
        this.pollingWorker.onmessage = (event) => {
          console.log("接收子线程发回来的消息",event);
          this.pollingWorker.terminate();// 关掉worker
          this.openNotify(() => {
            setTimeout(this.startPollingTask, this.cancelDelay);
          }, event.data);
        }
        // 主线程发送
        this.pollingWorker.postMessage({
          url: `${location.protocol}//${location.host}/version.json`,
          version: config.version
        });
      }
    }
  }
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>
