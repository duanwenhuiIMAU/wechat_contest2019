// pages/exam/exam.js
// 导入弹出提醒
import Notify from '../../miniprogram_npm/vant-weapp/notify/notify';
//获取应用实例
const app = getApp()
// 引入图表
var wxCharts = require('./../../utils/wxcharts.js');
// 引入时间
var util = require('../../utils/util.js');
// 设定屏幕宽度
var windowW = 0;
//  当 10 时提交错题到 user——detail
// 将 numberArrToCorOrNot == 的显示出来
//                                    正确 1错误 2 未作答 0
var numberArrToCorOrNotDetail = new Array(0, 0, 0);
var numberArrToCorOrNot = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
// 上传那个为错误
var upNumArrErr = new Array();
// 定义一个数组用于判断多选选项是否被选中 该数组中的值可以被用于同正确答案比较，在使用之后置零
var numArr = new Array(0, 0, 0, 0);
// progressNumber 不同的函数都需要
var progressNumber = 0;
// 判断显示哪组按钮 0 跳过/进入按钮 1 单选  2 判断  3 多选
var numberForShowOrNot = 0;
// 打开数据库
const db = wx.cloud.database()
// 第几道题目
var numberOfQuestionRank = 0;
// 判断有多少个 item == 0
var count = 0;
// 正确答案
var numberForCorrectAnswer = 0;
// 定时器 => 记录答题时间
//var timeInLastTime;
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 可使用 0 今天完成 1 全部完成 2
    notToUse: 0,
    // 判断显示哪组页面 0 跳过/进入按钮 1 做题 2 展示 3动画
    numberForShowOrNot: 0,
    // 第几道题目
    numberOfQuestionRank: 0,
    // 从云上得到的资源数据
    dataGetFromCloud: [],
    // 从云上得到的检查数据
    checkData: [],
    // 向页面传参时将顺序打乱
    numberOfrandom_A: 0,
    numberOfrandom_B: 0,
    numberOfrandom_C: 0,
    numberOfrandom_D: 0,
    // 禁止选中由于在点击后要展示 X / O 故使用
    canTap: 0,
    // 多选题未被选择 0 选择 1 用于给 wxml 传参
    multiBeTap_A: 0,
    multiBeTap_B: 0,
    multiBeTap_C: 0,
    multiBeTap_D: 0,
    // 动画
    animationData: {},    
    countDownNum: '',//倒计时初始值
    //定时器名字
    // 单选题的
    timerinSingle: null,
    // 多选题的
    timerToexam: null,
    // 判断题的
    timerInJudge: null,
    timerOX: null,
    countTimer: null, // 设置 定时
    // 进度    
    progressNumber: 0,
  },
  // 到时间 bindtap 给页面传参
  // 到时间 progress 给页面传参
  toWxml_progressNumber: function () {
    let that = this
    this.countTimer = setInterval(() => {
      // progressNumber 为全局变量不但 setIntervalInLastTime（）方法会使其改变 
      // 选择按钮 也会使其改变 故需要判断是否为 0 
      // 为 0 即 未作答或需要进入下一题
      if (progressNumber == 0) {
        that.setData({
          progressNumber: progressNumber,
        })
      }
      // 当答题时间结束时
      if (progressNumber == 100) {
        progressNumber = 0;
        clearInterval(this.countTimer);
        that.whenTap(100);
        that.toWxml_progressNumber();
      }
      // 当不等于 0 或 100 时也需要给 wxml 传参
      that.setData({
        progressNumber: progressNumber,
      })
      // 50秒走完
      progressNumber += 2;
    }, 1000)
  },
  toWxml_forSingle: function () {    
      let that = this
      // 得到云中的数据
      let data = this.data.dataGetFromCloud;
      // 在 1- 6 如果 ralate  num 谁小从谁开始 创建一个新数值数组 4 个数
      // ralate 是该题最难分辨的错误选项 数据库其在正确答案前后
      // 在 7 /8 时从 5 开始
      var arrFourNumber = new Array(4);
      let fristNumber;
      if (numberOfQuestionRank < 10) {
        if (count - 2 <= data[numberOfQuestionRank].num) {
          fristNumber = count - 4;
        } else {
          if (data[numberOfQuestionRank].num > data[numberOfQuestionRank].relation) {
            fristNumber = data[numberOfQuestionRank].relation - 1;
          } else {
            fristNumber = data[numberOfQuestionRank].num - 1;
          }
        }
        for (let i = 0; i < 4; i++) {
          arrFourNumber[i] = fristNumber;
          fristNumber++;
        }
        // 将数组的打乱顺序
        arrFourNumber.sort(() => Math.random() > 0.5); // 大神的代码
        // 求正确答案
        for (let i = 0; i < arrFourNumber.length; i++) {
          if (arrFourNumber[i] == data[numberOfQuestionRank].num - 1) {
            numberForCorrectAnswer = i;
          }
        }
        this.timerinSingle = setTimeout(() => {
          that.setData({
            numberOfQuestionRank: numberOfQuestionRank,
            numberOfrandom_A: arrFourNumber[0],
            numberOfrandom_B: arrFourNumber[1],
            numberOfrandom_C: arrFourNumber[2],
            numberOfrandom_D: arrFourNumber[3],
            canTap: 0,
          })
          // 关闭定时器
          clearTimeout(this.timerinSingle);
        }, 700)
      }
      
  },
  toWxml_judge: function () {
    let that = this;
   
      this.timerInJudge = setTimeout(function () {
        that.setData({
          canTap: 0,
          numberOfQuestionRank: numberOfQuestionRank,
        })
        clearTimeout(this.timerInJudge);
      }, 700)
       
  },
  toWxml_OX: function (right) {
    var that = this
    if (that.whenTap(right) == 0) {
      this.setData({
        checkOX: 'O',
      })
    } else {
      this.setData({
        checkOX: 'X',
      })
    }
  },
  whenTap: function (theRight) {
    let data = this.data.dataGetFromCloud;
    var that = this
    progressNumber = 0;
    numberOfQuestionRank++;         
    // 单选而且无正确选项
    if (data[numberOfQuestionRank - 1].item == 0) {      
      let right = numberForCorrectAnswer;        
      that.toWxml_forSingle();               
      // 如果得到的不为正确答案
      if(theRight==100){
        if (numberOfQuestionRank == 10) {
          that.display();
        }
      }else if (right != theRight) {
        // 让 numberArrToCorOrNot 这一记录题是否做错的
        numberArrToCorOrNot[numberOfQuestionRank - 1] = 2;
        if (numberOfQuestionRank == 10) {
          that.display();
        }
        return 1;
      } else {
        numberArrToCorOrNot[numberOfQuestionRank - 1] = 1;
        if (numberOfQuestionRank == 10) {
          that.display();
        }
        return 0;
      }      
    }
    // 多选
    if (data[numberOfQuestionRank - 1].item == 2) {
      if (numberForShowOrNot == 3) {
        let countToCheckOnly = 0;
        for (let i = 0; i < 4; i++) {
          // 检查用户是否单选
          if (numArr[i] == 1) {
            countToCheckOnly++;
          }
        }
        if (countToCheckOnly == 1 || countToCheckOnly == 0) {
          wx.showModal({
            title: '提示',
            content: '多选题哦~~~',
            showCancel: false,
          })
        } else {
          numberForShowOrNot++;
          let errOrcor;
          let count = 0;
          let right = this.data.multiple_response.rightArr.concat();
          for (let i = 0; i < 4; i++) {
            // 将用户选择的和正确答案比较
            if (right[i] == numArr[i]) {
              count++;
            }
          }
          if (count != 4) {
            let that = this;
            that.tipError();
            that.time(700);
          } else {
            let that = this;
            that.tipCor();
            that.time(400);
          }
          this.timerToexam = setTimeout(function () {
            wx.redirectTo({
              url: '../exam/exam',
            })
          }, 700)
          clearTimeout(this.timerToexam);
        }
      }
    }
    // 判断
    if (data[numberOfQuestionRank-1].item == 3) {
      let right = data[numberOfQuestionRank-1].judge;
      // 如果得到的不为正确答案      
      that.toWxml_judge();
      if (theRight == 100) {
        if (numberOfQuestionRank == 10) {
          that.display();
        }
      }
      else if (right != theRight) {
        that.tipError();
        numberArrToCorOrNot[numberOfQuestionRank - 1] = 2;
        if (numberOfQuestionRank == 10) {
          that.display();
        }
        return 1;
      } else {
        that.tipCor();
        numberArrToCorOrNot[numberOfQuestionRank - 1] = 1;
        if (numberOfQuestionRank == 10) {
          that.display();
        }
        return 0;
      }                     
    }    
  },
  bindToNext_A: function () {
    this.setData({
      canTap: 1,
      showOX: 0
    })
    var that = this
    that.toWxml_OX(0)

  },
  bindToNext_B: function () {
    this.setData({
      canTap: 1,
      showOX: 1
    })
    var that = this
    that.toWxml_OX(1)
  },
  bindToNext_C: function () {
    this.setData({
      canTap: 1,
      showOX: 2
    })
    var that = this
    that.toWxml_OX(2)
  },
  bindToNext_D: function () {
    this.setData({
      canTap: 1,
      showOX: 3
    })
    var that = this
    that.toWxml_OX(3)
  },
  judgeWrong: function () {
    this.setData({
      canTap: 1
    })
    var that = this
    that.whenTap(1)
  },
  judgeRight: function () {
    this.setData({
      canTap: 1
    })
    var that = this
    that.whenTap(0)
  },
  // 开始热身
  warnup: function () {
    this.setData({
      numberForShowOrNot: 3    
    })
    var that = this    
    if (this.data.checkData[0].countOpen == 1) {
      db.collection('item-150').limit(10).get().then(res => {
        that.firstGetData(res.data)
      })
    } else {
      db.collection('item-150').limit(10).skip((this.data.checkData[0].countOpen - 1) * 10) // 
        .get().then(res => {
          that.firstGetData(res.data)
        })
    }
    that.countDown();   
  },
  //  用于 warnup 得到第一次数据并传参
  firstGetData: function (data_res) {
    let data = this.data.dataGetFromCloud = data_res //= res.data;
    for (let i = 0; i <= data.length - 1; i++) {
      if (data[i].item == 0) {
        count++;
      }
    }
    var arr = [0, 1, 2, 3];
    // 将数组的打乱顺序
    arr.sort(() => Math.random() > 0.5); // 大神的代码
    // 求正确答案
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] == data[numberOfQuestionRank].num - 1) {
        this.data.numberForCorrectAnswer = i;
      }
    }
    // 不需要延时器
    this.setData({
      dataGetFromCloud: this.data.dataGetFromCloud,
      numberOfrandom_A: arr[0],
      numberOfrandom_B: arr[1],
      numberOfrandom_C: arr[2],
      numberOfrandom_D: arr[3],
    })
  },
  countDown: function () {
    let that = this;
    let countDownNum = that.data.countDownNum = 4;
    that.setData({
      timer: setInterval(function () {
        var animation = wx.createAnimation({
          duration: 500,
          timingFunction: 'linear',
        })
        this.animation = animation
        if (countDownNum == 4) {
          this.animation.scale(9, 9).step()
          that.setData({
            countDownNum: countDownNum,
            animationData: animation.export()
          })
        }
        countDownNum--;
        that.setData({
          countDownNum: countDownNum,
          animationData: animation.export()
        })
        if (countDownNum == 1) {
          this.animation.scale(9, 9).step()
          that.setData({
            countDownNum: countDownNum,
            animationData: animation.export()
          })
        }
        if (countDownNum == 0) {
          this.animation.scale(6, 6).step()
          that.setData({
            countDownNum: "开始",
            animationData: animation.export()
          })
        }
        if (countDownNum == -1) {          
          this.animation.scale(0, 0).step()
          that.setData({
            countDownNum: "开始",
            animationData: animation.export()
          })
        }
        if(countDownNum==-2){
          clearInterval(that.data.timer);
          that.setData({
            notToUse: 0,
            numberForShowOrNot: 1,
          })
          that.toWxml_progressNumber();
        }
      }, 500)
    })  
    
  },
  // 去记忆卡片
  toRememberCard: function () {
    wx.redirectTo({
      url: '../rememberCard/rememberCard',
    })
  },
  // 去首页
  toIndex: function () {
    wx.redirectTo({
      url: '../index/index',
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let that = this;
    // 在 index 页将用户登记了
    // 将其应该使用的数据下载通过 countOpen 判断需要使用那组
    // countOpen = 1 => 1-10 countOpen = 2 => 10-20
    db.collection('user_info').where({
      _openid: app.checkUser()
    }).get({
      success: (res => {
        // console.log(this.data.checkData);
        // console.log(this.data);
        if (res.data.length == 1) { //有用户
          this.data.checkData = res.data;         
          if (res.data[0].canUseApp == false) {
            that.setData({
              notToUse: 4
            })
          } else {
            var time = util.formatTime(new Date());
            var dateToCheckGetToday = new Date(time.replace(/-/g, "/"));
            //转成毫秒数
            var days = dateToCheckGetToday.getTime();
            // 向下取整            
            var day = parseInt(days / (1000 * 60 * 60 * 24));
            //现在的时间大于打开的时间 说明今天已经使用了
            if (res.data[0].today >= day) {
              that.setData({
                notToUse: 1
              })
            }
          }
        }
      }),
    })
  },
  // 图表化显示 上传用户信息 
  display: function () {
    this.setData({
      numberForShowOrNot: 2,
      numberArrToCorOrNot: numberArrToCorOrNot
    })
    let count_open = this.data.checkData[0].countOpen;  
    let j = 0;
    for (let i = 0; i < 10; i++) {
      if (numberArrToCorOrNot[i] == 0) {
        numberArrToCorOrNotDetail[2]++; // 未作答         
      }
      if (numberArrToCorOrNot[i] == 1) {
        numberArrToCorOrNotDetail[0]++; // 正确     
      }
      if (numberArrToCorOrNot[i] == 2) {
        numberArrToCorOrNotDetail[1]++; // 错误         
        // numberArrToCorOrNot 的数组顺序为题的顺序的个位数减 1 
        upNumArrErr[j] = i + (count_open - 1) * 10 + 1;
        j++;
        // console.log(upNumArrErr)
      }
    }
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
        name: '你的成就',
        color: '#3bac6a',
        fontSize: 15
      },
      series: [{
        name: '正确',
        data: numberArrToCorOrNotDetail[0],
        color: '#3bac6a',
        stroke: false
      }, {
        name: '错误',
        data: numberArrToCorOrNotDetail[1],
        color: 'red',
        stroke: false
      }, {
        name: '未作答',
        data: numberArrToCorOrNotDetail[2],
        color: 'gray',
        stroke: false
      }],
      disablePieStroke: true,
      width: (375 * windowW),
      height: (200 * windowW),
      dataLabel: false,
      legend: true,
      padding: 0
    });
    db.collection('user_info').where({
      _openid: app.checkUser()
    }).get({
      success: res => {
        let openid = res.data[0]._openid;
        let count_open = res.data[0].countOpen;
        var time = util.formatTime(new Date());
        var dateToCheckGetToday = new Date(time.replace(/-/g, "/"));
        //转成毫秒数 
        var days = dateToCheckGetToday.getTime();
        // 向下取整 
        var day = parseInt(days / (1000 * 60 * 60 * 24));
        const _ = db.command;
        db.collection('user_info').doc(res.data[0]._id).update({
          // 必须使用 _id 来查找           
          data: {
            countOpen: this.data.checkData[0].countOpen + 1,
            errNum: numberArrToCorOrNotDetail[1] + this.data.checkData[0].errNum,
            //today: day, 
            numArrErr: _.push(upNumArrErr) 
          }          
        })
        if (count_open == 15) {
          db.collection('user_info').doc(res.data[0]._id).update({
            // 必须使用 _id 来查找 
            data: {
              canUseApp: false
            }
          })
        }
      }
    })
  }, 
  

  //多选
  submit: function () {
    progressNumber = 0;
    if (numberForShowOrNot == 3) {
      let countToCheckOnly = 0;
      for (let i = 0; i < 4; i++) {
        // 检查用户是否单选
        if (numArr[i] == 1) {
          countToCheckOnly++;
        }
      }
      if (countToCheckOnly == 1 || countToCheckOnly == 0) {
        wx.showModal({
          title: '提示',
          content: '多选题哦~~~',
          showCancel: false,
        })
      } else {
        numberForShowOrNot++;
        let errOrcor;
        let count = 0;
        let right = this.data.multiple_response.rightArr.concat();
        for (let i = 0; i < 4; i++) {
          // 将用户选择的和正确答案比较
          if (right[i] == numArr[i]) {
            count++;
          }
        }
        if (count != 4) {
          var that = this;
          that.tipError();
          that.time(700);
        } else {
          var that = this;
          that.tipCor();
          that.time(400);
        }
        this.timerToexam = setTimeout(function () {
          wx.redirectTo({
            url: '../exam/exam',
          })
        }, 700)
        clearTimeout(this.timerToexam);
      }
    }
  },
  answer_form_multi_A: function () {
    if (numArr[0] == 0) {
      numArr[0] = 1;
      this.setData({
        multiBeTap_A: 1,
      })
    } else {
      numArr[0] = 0;
      this.setData({
        multiBeTap_A: 0,
      })
    }
  },
  answer_form_multi_B: function () {
    if (numArr[1] == 0) {
      numArr[1] = 1;
      this.setData({
        multiBeTap_B: 1,
      })
    } else {
      numArr[1] = 0;
      this.setData({
        multiBeTap_B: 0,
      })
    }
  },
  answer_form_multi_C: function () {
    if (numArr[2] == 0) {
      numArr[2] = 1;
      this.setData({
        multiBeTap_C: 1,
      })
    } else {
      numArr[2] = 0;
      this.setData({
        multiBeTap_C: 0,
      })
    }
  },
  answer_form_multi_D: function () {
    if (numArr[3] == 0) {
      numArr[3] = 1;
      this.setData({
        multiBeTap_D: 1,
      })
    } else {
      numArr[3] = 0;
      this.setData({
        multiBeTap_D: 0,
      })
    }
  },
  // 提示未作答
  tipNotTap: function () {
    Notify({
      text: '未作答',
      duration: 700,
      selector: '#custom-selector_notTap',
      backgroundColor: 'gray'
    });
  },
  // 提示正确
  tipCor: function () {
    Notify({
      text: '正确',
      duration: 700,
      selector: '#custom-selector_cor',
      backgroundColor: '#3bac6a'
    });
  },
  // 提示错误
  tipError: function () {
    Notify({
      text: '错误',
      duration: 700,
      selector: '#custom-selector_err',
      backgroundColor: 'red'
    });
  }
})