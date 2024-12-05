import axios from 'axios';

const TIME_OUT = 60000;
const BASE_URL = 'https://cloud.walliai.com';

// 存储请求标识和取消函数
const pendingMap = new Map();

/**
 * 生成每个请求唯一的键
 * @param {*} config 
 * @returns string
 */
function getPendingKey(config) {
  const { url, method, params, data } = config;
  return [url, method, JSON.stringify(params), JSON.stringify(data)].join('&');
}

/**
 * 储存每个请求唯一值, 也就是cancel token
 * @param {*} config 
 */
function addPending(config) {
  const pendingKey = getPendingKey(config);
  config.cancelToken = config.cancelToken || new axios.CancelToken((cancel) => {
    if (!pendingMap.has(pendingKey)) {
      pendingMap.set(pendingKey, cancel);
    }
  });
}

/**
 * 删除重复的请求
 * @param {*} config 
 */
function removePending(config) {
  const pendingKey = getPendingKey(config);
  if (pendingMap.has(pendingKey)) {
    const cancelToken = pendingMap.get(pendingKey);
    cancelToken(pendingKey);
    pendingMap.delete(pendingKey);
  }
}

// 创建 axios 实例
const service = axios.create({
  baseURL: BASE_URL,
  timeout: TIME_OUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 检查是否存在重复请求，若存在则取消已发的请求
    removePending(config);
    // 把当前请求添加到pendingMap中
    addPending(config);
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  response => {
    // 从pendingMap中移除请求
    removePending(response.config);
    return response.data;
  },
  error => {
    // 从pendingMap中移除请求
    if (axios.isCancel(error)) {
      console.log('Request canceled:', error.message);
    } else {
      removePending(error.config || {});
    }
    return Promise.reject(error);
  }
);

/**
 * 手动取消请求
 * @param {*} config 
 */
export const cancelRequest = (config) => {
  const pendingKey = getPendingKey(config);
  if (pendingMap.has(pendingKey)) {
    const cancelToken = pendingMap.get(pendingKey);
    cancelToken(pendingKey);
    pendingMap.delete(pendingKey);
  }
};

/**
 * 取消所有请求
 */
export const cancelAllRequest = () => {
  pendingMap.forEach((cancelToken) => {
    cancelToken();
  });
  pendingMap.clear();
};

const request = (options) => {
  return service({
    url: options.url,
    method: options.method || 'GET',
    data: options.method !== 'GET' ? options.data : null,
    params: options.method === 'GET' ? options.data : null,
    ...options
  });
};

export default request;