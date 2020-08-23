// pages/rememberCard/rememberCard.js
//获取应用实例
const app = getApp()
// 打开数据库
const db = wx.cloud.database()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 从云上得到的资源数据
    dataGetFromCloud: [],
    // 用户是否有错题 0 有展示不然 1 去 warnup 页
    notToUse: 0,
    // 默认不显示
    uhide: 0,
    uhide_big:0,
  },
  // 去热身页
  toWarnup: function() {
    wx.redirectTo({
      url: '../warnup/warnup',
    })
  },
  // 去首页
  toIndex: function() {
    wx.redirectTo({
      url: '../index/index',
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    //用于显示加载轻提醒
    wx.showLoading({
      title: '加载中',
    })
    // setTimeout(function() {
    //   wx.hideLoading()
    // }, 1000)
    db.collection('user_info').where({
      _openid: app.checkUser()
    }).get({
      success: (res => {
        if (res.data.length == 1) { //有用户
          if (res.data[0].numArrErr.length != 0) {
            let err = res.data[0].numArrErr;
            this.setData({
              days: res.data[0].countOpen
            })
            let that = this;
            const _ = db.command;
            const arrLen = err.length;
            const count = arrLen / 20;
            const tasks = []
            for (let i = 0; i < count; i++) {
              const promise = db.collection('item-150').where({
                num: _.in(err.slice(i * 20, (i + 1) * 20))
              }).get()
              tasks.push(promise)
            }
            Promise.all(tasks).then(value => {
              let data = new Array();
              value.forEach(res=>{
                res.data.forEach(res=>{
                  data.push(res)
                })
              })
              this.setData({
                notToUse: 0,
                dataGetFromCloud: data
              })
              wx.hideLoading()
            });          
          } else {
            that.setData({
              notToUse: 1
            })
          }
        }
      }),
    })
  },
  pickUp: function(event) {
    // console.log(event)
    var that = this;
    var javaData = this.data.uhide;
    var wxmlData = event.currentTarget.id;
    if (javaData == wxmlData) {
      that.setData({
        uhide: 0
      })
    } else {
      that.setData({
        uhide: wxmlData
      })
    }  
  },
  pickUp_big: function (event) {    
    var that = this;
    var javaData = this.data.uhide_big;
    var wxmlData = event.currentTarget.id;
    // console.log(event.touches)
    if (javaData == wxmlData) {
      that.setData({
        uhide_big: 0
      })
    } else {
      that.setData({
        uhide_big: wxmlData
      })
    }
  },
  
})