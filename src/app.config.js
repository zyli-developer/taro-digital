import {defineAppConfig} from '@tarojs/cli'

export default defineAppConfig({
  pages: [
    'pages/invitation/index',
    'pages/digital/index'
  ],
  window: {
    backgroundTextStyle: 'light',
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
