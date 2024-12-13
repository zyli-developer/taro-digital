export default defineAppConfig({
  pages: [
    'pages/invitation/index',
    'pages/digital/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    backgroundColor:'#4b526b',
    navigationBarBackgroundColor: '#4b526b',
    // navigationBarTitleText: 'WeChat',
    // navigationBarTextStyle: 'black'
  },
  permission: {
    "scope.record": {
      "desc": "需要录音权限以实现语音对话功能"
    }
  },
})
