//app.js
App({
  onLaunch: function () {
    // 用于判断是否显示热身页面
    var warnupOpenOrNot = wx.getStorageSync('warnupOpenOrNot') || []
    wx.setStorageSync("warnupOpenOrNot", true)
    // 展示本地存储能力
    // var logs = wx.getStorageSync('logs') || []
    // logs.unshift(Date.now())
    // wx.setStorageSync('logs', logs)
    //app.js
    // // 登录
    // wx.login({
    //   success: res => {
    //     // 发送 res.code 到后台换取 openId, sessionKey, unionId
    //     console.log(res);
    //   }
    // })
    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              // 可以将 res 发送给后台解码出 unionId
              this.globalData.userInfo = res.userInfo

              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res)
              }
            }
          })
        }
      }
    })
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        traceUser: true,
      })           
    }
  },
  // 用户鉴权
  checkUser: function () {
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        return res.result
      },
      fail: res => {
        wx.showModal({
          title: '提示',
          content: '程序出错了，请等待',
          showCancel: false,
          success: function (res) { }
        })
      }
    })
  },
  globalData: {
    userInfo: null,
    image: ['cloud://hero-of-item-dfc3cb.6865-hero-of-item-dfc3cb/logo/借贷new.jpg'],  
  }
})