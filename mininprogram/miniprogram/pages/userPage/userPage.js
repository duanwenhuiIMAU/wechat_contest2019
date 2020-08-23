// pages/userPage/userPage.js
//获取应用实例
const app = getApp()
// 引入图表
var wxCharts = require('./../../utils/wxcharts.js');
// 引入数据库
const db = wx.cloud.database()
// 设定屏幕宽度
var windowW = 0;
Page({
  /**
   * 页面的初始数据
   */
  data: {
    warnupOpenOrNot: [],
    warnup: "",
    checked: '',
    // 从 app.js 中传来的全局变量用于得到用户信息
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
    
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
  // 当 switch-cell 改变为关闭时候 关闭 warnup
  onChange: function () {
    if (wx.getStorageSync('warnupOpenOrNot')) {
      wx.setStorageSync('warnupOpenOrNot', false)
      this.setData({
        warnup: "打开热身",
        checked: false
      })
    } else {
      wx.setStorageSync('warnupOpenOrNot', true)
      this.setData({
        warnup: "关闭热身",
        checked: true
      })
    }
  },
  //  下载用户信息
  display: function () {
    db.collection('user_info').where({
      _openid: app.checkUser()
    }).get({
      success: (res => {        
        if (res.data.length == 1) { //有用户                        
          this.pieFun(res.data[0].countOpen);          
        }
        else{
          this.pieFun(0); 
        }
      }),
    })
      
  },
  // 图表化显示
  pieFun: function (countOpen){
    // 屏幕宽度 
    this.setData({
      imageWidth: wx.getSystemInfoSync().windowWidth
    });
    //计算屏幕宽度比列 
    windowW = this.data.imageWidth / 375;
    new wxCharts({
      animation: true,
      canvasId: 'ringCanvas',
      type: 'ring',
      extra: {
        ringWidth: 25,
        pie: {
          offsetAngle: -90
        }
      },
      title: {
        name: '进度',
        color: '#3bac6a',
        fontSize: 15
      },
      series: [{
        name: '已完成',
        data: countOpen,
        color: '#3bac6a',
        stroke: false
      },      
      {
        name: '未完成',
        data: 15 - countOpen,
        color: 'gray',
        stroke: false
      }],
      disablePieStroke: true,
      width: (375 * windowW),//(375 * windowW),
      height: (300 * windowW),//(200 * windowW),
      dataLabel: true,
      legend: true,
      padding: 0,      
    });
  },  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var that = this;
    that.display();
    
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
    // if (app.globalData.userInfo) {
    //   this.setData({
    //     userInfo: app.globalData.userInfo,
    //     hasUserInfo: true
    //   })
    // } else if (this.data.canIUse) {
    //   // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
    //   // 所以此处加入 callback 以防止这种情况
    //   app.userInfoReadyCallback = res => {
    //     this.setData({
    //       userInfo: res.userInfo,
    //       hasUserInfo: true
    //     })
    //   }
    // }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    if (!wx.getStorageSync('warnupOpenOrNot')) {
      this.setData({
        warnup: "打开热身",
        checked: false
      })
    } else {
      this.setData({
        warnup: "关闭热身",
        checked: true
      })
    }
  },

  

})