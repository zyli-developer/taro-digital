import request from '../utils/request'

export const vrtcGetToken = ()=>{
    return request({
        url:'/nh/vrtc/v0/gettoken',
        method:'POST',
        data:{}
    })
}

export const operaibot = (params)=>{
    return request({
        url:'/nh/vrtc/v0/operaibot',
        method:'POST',
        data:params
    })
}
// export const updateVoicec = (params)=>{
//     return request({
//         url:'/nh/vrtc/v0/updatevoicec',
//         method:'POST',
//         data:params
//     })
// }
// export const stopVoiceChat = (params)=>{
//     return request({
//         url:'/nh/vrtc/v0/stopvoicechat',
//         method:'POST',
//         data:params
//     })
// }