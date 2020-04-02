//index.js
//获取应用实例
const app = getApp()
// 引入数据库
const db = wx.cloud.database()
// 引入时间
var util = require('../../utils/util.js');
Page({
  data: {
    // 用于点击六下得到用户头像的计数
    getUserLoge: 0,
    // 图片来源
    image: app.globalData.image,
    // 从 app.js 中传来的全局变量用于得到用户信息
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  // 点击六下得到用户头像
  bindViewTap: function () {
    let getUserLoge = this.data.getUserLoge;
    if (getUserLoge != 6) {
      getUserLoge++;
    } else {
      getUserLoge = 0;
    }
    this.setData({
      getUserLoge: getUserLoge,
    })
  },  
  onLoad: function () {
    let that = this;
    // 打开 user_info 集合查找是否有该用户
    // 有 不做操作 无写入    
    db.collection('user_info').where({
      _openid: app.checkUser()
    }).get({
      success: (res => {              
        if (res.data.length == 0) {//无用户信息
          var time = util.formatTime(new Date());
          var dateToCheckGetToday = new Date(time.replace(/-/g, "/"));
          //转成毫秒数
          var days = dateToCheckGetToday.getTime();
          // 向下取整         
          var day = parseInt(days / (1000 * 60 * 60 * 24));
          db.collection('user_info').add({
            data: {
              // 创建时间
              createTime: db.serverDate(),
              // 打开的次数
              countOpen: 1,
              // 啥时候打开 用于判定是否可以今天再打开
              // 该处还没有使用
              today: day-1,
              // 是否可以使用 当 countOpen == 290时改为不可
              canUseApp: true,
              // 错误了几道题
              errNum:0,
              // 错的具体是那几个题
              numArrErr:([]),              
            }
          })          
        }
      }),
    })  
    // 用于显示加载轻提醒
    wx.showLoading({
      title: '加载中',
    })
    
    if (app.globalData.userInfo) {
      wx.hideLoading()
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse) {
      wx.hideLoading()
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        },
        fail: res => { // 调用微信弹窗接口             
          wx.showModal({
            title: '提示',
            content: '拒绝头像和昵称授权是无法使用分录英雄的哦~',
            showCancel: false,
            success: function (res) {
              if (res.confirm) {
                console.log('用户点击确定')
              }
            }
          })
          wx.reLaunch({
            url: '../index/index',
          })
        }        
      })
    }
  },
  getUserInfo: function (e) {
    app.globalData.userInfo = e.detail.userInfo
    if (e.detail.userInfo) {
      this.setData({
        userInfo: e.detail.userInfo,
        hasUserInfo: true
      })
    } else {
      //用户按了拒绝按钮
      wx.showModal({
        title: '提示',
        content: '拒绝头像和昵称授权是无法使用分录英雄的哦~',
        showCancel: false,
      })
      wx.reLaunch({
        url: '../index/index',
      })
    }
  },
  // 去 WarnupOrExam 页面
  redirectToWarnupOrExam: function () {
    if (wx.getStorageSync('warnupOpenOrNot')) {
      //wx.redirectTo
      wx.redirectTo({
        url: '../warnup/warnup',
      })
    } else {
      //
      wx.redirectTo({
        url: '../exam/exam',
      })
    }
  },
  // 去 记忆卡片页面 页面
  navigateToRC: function () {
    wx.navigateTo({
      url: '../rememberCard/rememberCard',
    })
  },
  //  去 用户 页面
  navigateToUserPage: function () {
    wx.navigateTo({
      url: '../userPage/userPage',
    })
  },
  // 去使用帮助页面
  navigateToInfo: function () {
    wx.navigateTo({
      url: '../info/info',
    })
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})