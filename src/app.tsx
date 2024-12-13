import { PropsWithChildren } from 'react'
// import axios from 'axios';
// import axios from './utils/request'
// import { Provider } from 'react-redux';
import { useLaunch } from '@tarojs/taro'
// import store from './store';
import './app.less'

function App({ children }:PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.')
  })

  // children 是将要会渲染的页面
  // return (<Provider store={store}>{children}</Provider>)
  return children
}
  


export default App
