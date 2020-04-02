// pages/warnup/warnup.js
// 定义一个数组用于判断选项是否被选中 该数组中的值可以被用于同正确答案比较
var numArr = new Array(0, 0, 0, 0);
// progressNumber 不同的函数都需要
var progressNumber = 0;
import Notify from '../../miniprogram_npm/vant-weapp/notify/notify';
// 判断显示哪组按钮 0 跳过/进入按钮 1 单选  2 判断  3 多选
var numberForShowOrNot = 0;
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 使 点击之后显示一会
    canTap: 0,
    // 判断显示哪组按钮 0 跳过/进入按钮 1 单选  2 判断  3 多选
    numberForShowOrNot: 0,
    // 多选题未被选择 0 选择 1
    multiBeTap_A: 0,
    multiBeTap_B: 0,
    multiBeTap_C: 0,
    multiBeTap_D: 0,
    //定时器名字
    timer: null,
    timerToexam: null,
   // timeInLastTime:null,
    progressNumber: 0,
    // 单选题数组
    single_answer: {
      question: "通过销售商品、提供劳务取得应收票据",
      theRight: 2, // 0 A 正确 1 B 正确 2 C 正确 3 D 正确
      answer_A: {
        debit: "借：管理费用",
        credit: "贷：待处理财产损益",
      },
      answer_B: {
        debit: "借：库存商品",
        debit_index: ["应交税费——应交增值税（进项税额）", "银行存款"],
        credit: "贷：应收票据",
      },
      answer_C: {
        debit: "借：应收票据",
        credit_index: ["应交税费——应交增值税（进项税额）"],
        credit: "贷：主营业务收入",
      },
      answer_D: {
        "debit": "借：银行存款",
        "credit": "贷：应收股利",
      },
    },
    // 判断题数组
    True_or_False: {
      "judge": 1,
      "question": "企业的应收票据是指企业因销售商品、提供劳务等而收到的票据，主要包括商业汇票和银行汇票。",
    },
   
  },
  // 记录答题时间
  setIntervalInLastTime: function () {
    // 该函数中的 progressNumber 进入下一题
    let that = this;    
    // 多少秒推进一步 现为 1 秒
    var intervalTime = 1000;
    var timeInLastTime = setInterval(function () {      
      if (progressNumber == 0) {
        progressNumber = 0;
        that.setData({
          progressNumber: progressNumber,
        })
      }
      that.setData({
        progressNumber: progressNumber,
      })
      // 50秒走完
      progressNumber += 2;
      if (progressNumber == 100) {
        numberForShowOrNot++;
        that.setData({
          progressNumber: progressNumber,
          numberForShowOrNot: numberForShowOrNot
        })
        that.tipNotTap();
        progressNumber = 0;
        if (numberForShowOrNot == 4) {
          wx.redirectTo({
            url: '../exam/exam',
          })
          numberForShowOrNot = 100;
          that.setData({
            progressNumber: progressNumber,
          }) 
          clearInterval(timeInLastTime);         
        }       
      }
    }, intervalTime)
  },
  // 提示未作答
  tipNotTap: function () {    
    Notify({
      text: '未作答',
      duration: 700,
      selector: '#custom-selector_notTap_1',
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
  },
  // 定时器
  time: function (numTime) {
    var that = this;
    timer: setTimeout(function () {
      that.setData({        
        numberForShowOrNot: numberForShowOrNot,
      })
    }, numTime)
    clearTimeout(this.timer);
  },
  // 开始热身
  warnup: function () {
    let that = this
    numberForShowOrNot++;
    this.setData({
      numberForShowOrNot: numberForShowOrNot,
    })
    that.setIntervalInLastTime();
  },
  // 单选
  bindToNext: function (theRightFromWXML) {
    progressNumber = 0;
    // 不可多次点击
    var that = this   
    if (numberForShowOrNot == 1) {
      numberForShowOrNot++;
      let right = this.data.single_answer.theRight;
      if (right != theRightFromWXML) {
        var that = this;
        this.setData({
          checkOX: 'X',
        })
        that.time(700);
      } else {
        var that = this;
        this.setData({
          checkOX: 'O',
        })
        that.time(700);
      }
    } else {
      this.setData({
        numberForShowOrNot: numberForShowOrNot,
      })
    }
  },
  bindToNext_A: function () {
    this.setData({
      canTap: 1,
      showOX: 0
    })
    var that = this;
    that.bindToNext(0);   
  },
  bindToNext_B: function () {
    this.setData({
      canTap: 1,
      showOX: 1
    })
    var that = this;
    that.bindToNext(1);
  },
  bindToNext_C: function () {
    this.setData({
      canTap: 1,
      showOX: 2
    })
    var that = this;
    that.bindToNext(2);
  },
  bindToNext_D: function () {
    this.setData({
      canTap: 1,
      showOX: 3
    })
    var that = this;
    that.bindToNext(3);
  },
  //判断
  judge: function (rightFrom) {
    progressNumber = 0;
    if (numberForShowOrNot == 2) {
      //numberForShowOrNot++;
      let right = this.data.True_or_False.judge;
      if (right != rightFrom) {
        var that = this;
        that.tipError();
        that.time(700);
      } else {
        var that = this;
        that.tipCor();
        that.time(700);
      }
      this.timerToexam = setTimeout(function () {
        wx.redirectTo({
          url: '../exam/exam',
        })
        clearTimeout(this.timerToexam);
      }, 1000)  
    } else {
      this.setData({
        numberForShowOrNot: numberForShowOrNot,
      })
    }
  },
  judgeWrong: function () {
    var that = this;
    that.judge(1);
  },
  judgeRight: function () {
    var that = this;
    that.judge(0);
  },
  
  // 跳转到 exam
  redirectToExam: function () {
    wx.redirectTo({
      url: '../exam/exam',
    })
  },
  
})