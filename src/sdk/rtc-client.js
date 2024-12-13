/**
 * Copyright 2024 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import VERTC, { MediaType, StreamIndex } from '@volcengine/rtc';

export default class RtcClient {
  constructor(props) {
    this.config = props.config;
    this.streamOptions = props.streamOptions;
    this.engine = VERTC.createEngine(props.config.appId);
    this.handleUserPublishStream = props.handleUserPublishStream;
    this.handleUserUnpublishStream = props.handleUserUnpublishStream;
    // this.handleUserStartVideoCapture = props.handleUserStartVideoCapture;
    // this.handleUserStopVideoCapture = props.handleUserStopVideoCapture;
    this.handleEventError = props.handleEventError;
    // this.setRemoteVideoPlayer = this.setRemoteVideoPlayer.bind(this);
    this.handleUserJoin = props.handleUserJoin;
    this.handleUserLeave = props.handleUserLeave;
    this.handleAutoPlayFail = props.handleAutoPlayFail;
    this.handlePlayerEvent = props.handlePlayerEvent;
    this.handleRoomMessageReceived =props.handleRoomMessageReceived
    // this.handleRoomStreamStats =props.handleRoomStreamStats
    this.handleRoomBinaryMessageReceived=props.handleRoomBinaryMessageReceived
    this.handleUserMessageReceived=props.handleUserMessageReceived
    this.bindEngineEvents();
  }
  SDKVERSION = VERTC.getSdkVersion();
  bindEngineEvents() {
    this.engine.on(VERTC.events.onUserPublishStream, this.handleUserPublishStream);
    this.engine.on(VERTC.events.onUserUnpublishStream, this.handleUserUnpublishStream);
    this.engine.on(VERTC.events.onRoomMessageReceived, this.handleRoomMessageReceived);
    
    // this.engine.on(VERTC.events.onRemoteAudioPropertiesReport, (event)=>{
    //   console.log('%c [ onRemoteAudioPropertiesReport ]-36', 'font-size:13px; background:pink; color:#bf2c9f;', event)
    // });
    // this.engine.on(VERTC.events.onRemoteStreamStats, this.handleRoomStreamStats);
    this.engine.on(VERTC.events.onRoomBinaryMessageReceived, this.handleRoomBinaryMessageReceived);
    this.engine.on(VERTC.events.onUserMessageReceived, this.handleUserMessageReceived);
    // this.engine.on(VERTC.events.onUserStartVideoCapture, this.handleUserStartVideoCapture);
    // this.engine.on(VERTC.events.onUserStopVideoCapture, this.handleUserStopVideoCapture);
    this.engine.on(VERTC.events.onUserJoined, this.handleUserJoin);
    this.engine.on(VERTC.events.onUserLeave, this.handleUserLeave);
    this.engine.on(VERTC.events.onAutoplayFailed, (events) => {
      console.log('VERTC.events.onAutoplayFailed', events.userId);
      this.handleAutoPlayFail(events);
    });
    this.engine.on(VERTC.events.onPlayerEvent, this.handlePlayerEvent);
    this.engine.on(VERTC.events.onError, (e) => this.handleEventError(e, VERTC));
  }
  // async setRemoteVideoPlayer(remoteUserId, domId) {
  //   await this.engine.setRemoteVideoPlayer(StreamIndex.STREAM_INDEX_MAIN, {
  //     userId: remoteUserId,
  //     renderDom: domId,
  //   });
  // }
  /**
   * remove the listeners when `createEngine`
   */
  removeEventListener() {
    this.engine.off(VERTC.events.onUserPublishStream, this.handleStreamAdd);
    this.engine.off(VERTC.events.onUserUnpublishStream, this.handleStreamRemove);
    this.engine.off(VERTC.events.onRoomMessageReceived, this.handleRoomMessageReceived);
    // this.engine.off(VERTC.events.onRemoteAudioPropertiesReport, (event)=>{
    //   console.log('%c [ event ]-36', 'font-size:13px; background:pink; color:#bf2c9f;', event)
    // });
    // this.engine.off(VERTC.events.onRemoteStreamStats, this.handleRoomStreamStats);
    this.engine.off(VERTC.events.onRoomBinaryMessageReceived, this.handleRoomBinaryMessageReceived);
    this.engine.off(VERTC.events.onUserMessageReceived, this.handleUserMessageReceived);
    // this.engine.off(VERTC.events.onUserStartVideoCapture, this.handleUserStartVideoCapture);
    // this.engine.off(VERTC.events.onUserStopVideoCapture, this.handleUserStopVideoCapture);
    this.engine.off(VERTC.events.onUserJoined, this.handleUserJoin);
    this.engine.off(VERTC.events.onUserLeave, this.handleUserLeave);
    this.engine.off(VERTC.events.onAutoplayFailed, this.handleAutoPlayFail);
    this.engine.off(VERTC.events.onPlayerEvent, this.handlePlayerEvent);
    this.engine.off(VERTC.events.onError, this.handleEventError);
  }
  join(token, roomId, uid) {
    return this.engine.joinRoom(
      token,
      roomId,
      {
        userId: uid,
      },
      {
        isAutoPublish: false,
        isAutoSubscribeAudio: true,
        isAutoSubscribeVideo: false,
      }
    );
  }
  audioFrameCallback(set,uid,cb){
    this.engine.setPlaybackVolume(uid,StreamIndex.STREAM_INDEX_MAIN,0)
    set? this.engine.setAudioFrameCallback(StreamIndex.STREAM_INDEX_MAIN,uid,cb):this.engine.pauseAllSubscribedStream(MediaType.AUDIO)
  }
  // check permission of browser
  checkPermission() {
    return VERTC.enableDevices();
  }
  /**
   * get the devices
   * @returns
   */
  async getDevices() {
    const devices = await VERTC.enumerateAudioCaptureDevices();
    
    // const devices = await VERTC.enumerateDevices();
    return {
      audioInputs: devices.filter((i) => i.deviceId && i.kind === 'audioinput'),
      // videoInputs: devices.filter((i) => i.deviceId && i.kind === 'videoinput'),
    };
  }
  /**
   * create the local stream with the config and publish the local stream
   * @param {*} callback
   */
  async createLocalStream(userId, callback) {
    const devices = await this.getDevices();
    const devicesStatus = {
      // video: 0,
      audio: 1,
    };
    if (!devices.audioInputs.length ) {
      callback({
        code: -1,
        msg: '设备权限获取失败',
        devicesStatus: {
          // video: 0,
          audio: 0,
        },
      });
      return;
    }
    if (this.streamOptions.audio && devices.audioInputs.length) {

      await this.engine.startAudioCapture(devices.audioInputs[0].deviceId);
    } else {
      // devicesStatus['video'] = 0;
      this.engine.unpublishStream(MediaType.AUDIO);
    }
    // if (this.streamOptions.video && devices.videoInputs.length) {
      // await this.engine.startVideoCapture(devices.videoInputs[0].deviceId);
    // } else {
      // devicesStatus['audio'] = 0;
      // this.engine.unpublishStream(MediaType.VIDEO);
    // }

    // this.engine.setLocalVideoPlayer(StreamIndex.STREAM_INDEX_MAIN, {
    //   renderDom: 'local-player',
    //   userId,
    // });

    // 如果joinRoom的config设置了自动发布，这里就不需要发布了
    this.engine.publishStream(MediaType.AUDIO);
    // this.engine.enableAudioPropertiesReport()
    callback &&
      callback({
        code: 0,
        msg: '设备获取成功',
        devicesStatus,
      });
  }

  async changeAudioState(isMicOn) {
    if (isMicOn) {
      await this.engine.publishStream(MediaType.AUDIO);
    } else {
      await this.engine.unpublishStream(MediaType.AUDIO);
    }
  }

  // async changeVideoState(isVideoOn) {
  //   if (isVideoOn) {
  //     await this.engine.startVideoCapture();
  //   } else {
  //     await this.engine.stopVideoCapture();
  //   }
  // }

  async leave() {

    console.log('%c [leave  ]-159', 'font-size:13px; background:pink; color:#bf2c9f;', )
    // this.engine.stopVideoCapture();
    this.engine.stopAudioCapture();
    this.engine.unpublishStream(MediaType.AUDIO);

    this.engine.leaveRoom();

    console.log('%c [ leaveRoom ]-166', 'font-size:13px; background:pink; color:#bf2c9f;', )
    // VERTC.destroyEngine(this.engine);
  }
}
