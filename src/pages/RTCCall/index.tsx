import React, { useState,  useEffect, useCallback, useRef } from 'react';
import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { v4 as uuid } from "uuid";
import {
  MediaType,
  onUserJoinedEvent,
  onUserLeaveEvent,
  PlayerEvent,
  AutoPlayFailedEvent,
  AudioFrameData,
} from '@volcengine/rtc';
import { ControlBar, AutoPlayModal } from '../../modules';


import RTCComponent from '../../sdk/rtc-component';
import { RTCClient } from '../../interfaces/rtc';
import { streamOptions } from './constant';
import MediaPlayer from '../../components/MediaPlayer';
import { removeLoginInfo } from '../../utils';
import { operaibot } from '../../server/rtc';

type BOT_ACTION =  'START' | 'STOP' | 'UPDATE'

interface RTCCallProps {
  Token: string;
  appId: string;
  roomId: string;
  userId: string;
  setJoin: (joined: boolean) => void;
  setJoinFailReason: (reason: string) => void;
  onSpeakArrayBuffer: (buffer: string) => void;
  onOpenTextSteam:(any)=>void;
}

const RTCCall: React.FC<RTCCallProps> = ({
  Token,
  appId,
  roomId, 
  userId,
  setJoin,
  setJoinFailReason,
  onSpeakArrayBuffer,
  onOpenTextSteam
}) => {

  const [isMicOn, setMicOn] = useState<boolean>(true);
  const [isVideoOn, setVideoOn] = useState<boolean>(true);
  const rtc = useRef<RTCClient>();
  const [autoPlayFailUser, setAutoPlayFailUser] = useState<string[]>([]);
  const playStatus = useRef<{ [key: string]: { audio: boolean; video: boolean } }>({});
  const autoPlayFailUserdRef = useRef<string[]>([]);

  const [remoteStreams, setRemoteStreams] = useState<{
    [key: string]: {
      playerComp: React.ReactNode;
    };
  }>({});

  const audioBufferQueue = useRef<Float32Array[]>([]);
  const SAMPLES_PER_SECOND = 48000;
  const FRAME_SIZE = 4096;
  const FRAMES_PER_SECOND = Math.ceil(SAMPLES_PER_SECOND / FRAME_SIZE); // ≈12 frames

  const FRAME_TIMEOUT = 200; // 500ms timeout to determine end of audio segment
  const lastFrameTime = useRef<number>(0);
  const frameTimeoutId = useRef<NodeJS.Timeout | null>(null);

  const leaveRoom = useCallback(
    async (refresh: boolean) => {
      if (!rtc.current) return;
    
      await controlAgent('STOP')
      rtc.current.removeEventListener();

      rtc.current.leave();
      if (!refresh) {
        setJoin(false);
        removeLoginInfo();
      }

      setAutoPlayFailUser([]);
      setJoinFailReason('');
    },
    [rtc, setJoin]
  );

  // useEffect(() => {
  //   if (sessionStorage.getItem('store')) {
  //     const a = sessionStorage.getItem('store');
  //     a && alert(a);
  //   }
  // }, []);
  /**
   * @brief call leaveRoom function when the browser window closes or refreshes
   */
  const leaveFunc = useCallback(async () => {
    try {
      await leaveRoom(true);
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  }, [leaveRoom]);

  // Handle all possible page exit scenarios
  useEffect(() => {
    // window.addEventListener('pagehide',  ()=>leaveRoom(false));

    window.addEventListener('beforeunload', leaveFunc);
    window.addEventListener('unload', leaveFunc);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
       leaveRoom(false)
      }
    };
    // document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // window.removeEventListener('pagehide', leaveFunc);
      window.removeEventListener('beforeunload', leaveFunc);
      window.removeEventListener('unload', leaveFunc);
      // document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [leaveFunc]);

  const handleUserPublishStream = useCallback(
    (stream: { userId: string; mediaType: MediaType }) => {
      const uId = stream.userId;
      console.log('%c [ handleUserPublishStream ]-87', 'font-size:13px; background:pink; color:#bf2c9f;', stream)
      // if (stream.mediaType & MediaType.VIDEO) {
      //   if (remoteStreams[uId]) {
      //     rtc.current?.setRemoteVideoPlayer(userId, `remoteStream_${uId}`);
      //   }
      // }
    },
    [remoteStreams]
  );

  /**
   * @brief remove stream & update remote streams list
   * @param {Event} event
   */
  const handleUserUnpublishStream = (event: { userId: string; mediaType: MediaType }) => {
    console.log('%c [ handleUserUnpublishStream ]-101', 'font-size:13px; background:pink; color:#bf2c9f;', event)
    const { userId: uId, mediaType } = event;

    // if (mediaType & MediaType.VIDEO) {
    //   rtc.current?.setRemoteVideoPlayer(uId, undefined);
    // }
  };

  const handleUserStartVideoCapture = (event: { userId: string }) => {
    const { userId:uId } = event;

    if (remoteStreams[uId]) {
      rtc.current?.setRemoteVideoPlayer(uId, `remoteStream_${uId}`);
    }
  };

  /**
   * Remove the user specified from the room in the local and clear the unused dom
   * @param {*} event
   */
  const handleUserStopVideoCapture = (event: { userId: string }) => {
    const { userId:uId } = event;
    rtc.current?.setRemoteVideoPlayer(uId, undefined);
  };
  
const handleRemoteArrayBuffer = async (event: AudioFrameData) => {
  const inputData = event.channels[0];
  const isSignificantAudio = checkAudioSignificance(inputData);
  
  if (!isSignificantAudio) {
    console.log('%c [ audioBufferQueue.current.length ]-180', 'font-size:13px; background:pink; color:#bf2c9f;', audioBufferQueue.current.length)
    if (audioBufferQueue.current.length > 0) {
      processAudioSegment();
    }
    return;
  }
  
  // Add current frame to queue
  audioBufferQueue.current.push(new Float32Array(inputData));
  
  // Update last frame time
  lastFrameTime.current = Date.now();
  
  if (frameTimeoutId.current) {
    clearTimeout(frameTimeoutId.current);
  }
  
  frameTimeoutId.current = setTimeout(() => {
    if (Date.now() - lastFrameTime.current >= FRAME_TIMEOUT && audioBufferQueue.current.length > 0) {
      processAudioSegment();
    }
  }, FRAME_TIMEOUT);
};

// Helper function to detect silence/meaningless audio
const checkAudioSignificance = (buffer: Float32Array): boolean => {
  const SILENCE_THRESHOLD = 0.01; // Adjust this threshold as needed
  
  // Calculate RMS (Root Mean Square) of the audio frame
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / buffer.length);
  
  return rms > SILENCE_THRESHOLD;
};

const processAudioSegment = () => {
  try {
    // Calculate total size needed for all frames
    const totalSize = FRAME_SIZE * audioBufferQueue.current.length;
    const combinedBuffer = new Float32Array(totalSize);
    
    // Copy frames into combined buffer
    for (let i = 0; i < audioBufferQueue.current.length; i++) {
      const frame = audioBufferQueue.current[i];
      const startIndex = i * FRAME_SIZE;
      for (let j = 0; j < FRAME_SIZE && j < frame.length; j++) {
        combinedBuffer[startIndex + j] = frame[j];
      }
    }
    
    // Clear queue
    audioBufferQueue.current = [];
    
    // Downsample to 16kHz
    const decimationFactor = 3;
    const outputLength = Math.floor(combinedBuffer.length / decimationFactor);
    const outputBuffer = new Float32Array(outputLength);
    
    // Downsample to 16kHz by taking every 3rd sample
    for (let i = 0; i < outputLength; i++) {
      outputBuffer[i] = combinedBuffer[i * decimationFactor];
    }
    
    // Convert Float32 to Int16 PCM
    const pcmBuffer = new Int16Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const s = Math.max(-1, Math.min(1, outputBuffer[i]));
      pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Convert to WAV base64
    const wavBase64 = pcmToWavBase64(pcmBuffer.buffer);
    
    // Send WAV base64 to callback
    onSpeakArrayBuffer(wavBase64);
    
  } catch (error) {
    console.error('Error processing audio segment:', error);
    audioBufferQueue.current = [];
  }
};
const writeString = (view: DataView, offset: number, string: string): void => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};
const createWavHeader = (
  numChannels: number,
  sampleRate: number,
  bitsPerSample: number,
  dataLength: number
): ArrayBuffer => {
  const headerLength = 44;
  const buffer = new ArrayBuffer(headerLength);
  const view = new DataView(buffer);
  
  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // File length minus RIFF identifier length and file description length
  view.setUint32(4, 36 + dataLength, true);
  // WAVE identifier
  writeString(view, 8, 'WAVE');
  // Format chunk identifier
  writeString(view, 12, 'fmt ');
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (raw)
  view.setUint16(20, 1, true);
  // Channel count
  view.setUint16(22, numChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  // Block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  // Bits per sample
  view.setUint16(34, bitsPerSample, true);
  // Data chunk identifier
  writeString(view, 36, 'data');
  // Data chunk length
  view.setUint32(40, dataLength, true);
  
  return buffer;
};
const pcmToWavBase64 = (pcmBuffer: ArrayBuffer): string => {
  // WAV Header parameters
  const numChannels = 1; // Mono
  const sampleRate = 16000; // 16kHz
  const bitsPerSample = 16; // 16-bit
  
  // Create WAV header
  const header = createWavHeader(numChannels, sampleRate, bitsPerSample, pcmBuffer.byteLength);
  
  // Combine header and PCM data
  const wavBuffer = new Uint8Array(header.byteLength + pcmBuffer.byteLength);
  wavBuffer.set(new Uint8Array(header), 0);
  wavBuffer.set(new Uint8Array(pcmBuffer), header.byteLength);
  
  // Convert to base64
  let binary = '';
  const bytes = new Uint8Array(wavBuffer.buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `${window.btoa(binary)}`;
};
// Clean up on component unmount
useEffect(() => {
  return () => {
    if (frameTimeoutId.current) {
      clearTimeout(frameTimeoutId.current);
    }
  };
}, []);

  const handleUserJoin = (e: onUserJoinedEvent) => {
    rtc.current?.audioFrameCallback(true,e.userInfo.userId,handleRemoteArrayBuffer);
    const { userInfo } = e;
    const remoteUserId = userInfo.userId;

    if (Object.keys(remoteStreams).length < 3) {
      if (remoteStreams[remoteUserId]) return;
      remoteStreams[remoteUserId] = {
        playerComp: <MediaPlayer userId={remoteUserId} />,
      };

      setRemoteStreams({
        ...remoteStreams,
      });
    }
  };

  useEffect(() => {
    const streams = Object.keys(remoteStreams);
    const _autoPlayFailUser = autoPlayFailUser.filter(
      (item) => streams.findIndex((stream) => stream === item) !== -1
    );
    setAutoPlayFailUser([..._autoPlayFailUser]);
  }, [remoteStreams]);

  const handleUserLeave = (e: onUserLeaveEvent) => {
    rtc.current?.audioFrameCallback(false,e.userInfo.userId,handleRemoteArrayBuffer)
    const { userInfo } = e;
    const remoteUserId = userInfo.userId;
    if (remoteStreams[remoteUserId]) {
      delete remoteStreams[remoteUserId];
    }
    setRemoteStreams({
      ...remoteStreams,
    });
  };

  useEffect(() => {
    (async () => {
      if (!roomId || !userId || !rtc.current || !Token) return;
     
      rtc.current
        .join((Token as string) || null, roomId, userId)
        .then(() =>
          rtc?.current?.createLocalStream(userId, (res: any) => {
            const { code, msg } = res;
            if (code === -1) {
              handleJoinFailure(msg);
            }
            controlAgent('START')
          })
        )
        .catch((err: any) => {
          leaveRoom(false);
          setJoinFailReason(JSON.stringify(err));
        });
    })();
  }, [roomId, userId, rtc,Token]);

  const controlAgent =(type:BOT_ACTION)=>{
    return new Promise<Boolean>((resolve,reject)=>{
      const parmas = {
        apiAction: type,
        roomId,
        userId
      }
      operaibot(parmas).then((res:any)=>{
        if(res.code === 0){
          resolve(true)
        }else{
          reject(false)
        }
      })
    }) 
      
  }

  const changeMicState = useCallback((): void => {
    if (!rtc.current) return;
    rtc.current.changeAudioState(!isMicOn);
    setMicOn(!isMicOn);
  }, [isMicOn, rtc]);

  const changeVideoState = useCallback((): void => {
    if (!rtc.current) return;
    rtc.current.changeVideoState(!isVideoOn);
    setVideoOn(!isVideoOn);
  }, [isVideoOn, rtc]);

  const handleEventError = (e: any, VERTC: any) => {
    if (e.errorCode === VERTC.ErrorCode.DUPLICATE_LOGIN) {
      Taro.showToast({
        title: '你的账号被其他人顶下线了',
        icon: 'none'
      });
      leaveRoom(false);
    }
  };

  const handleAutoPlayFail = (event: AutoPlayFailedEvent) => {

    const { userId:uId, kind } = event;

    let playUser = playStatus.current?.[uId] || {};
    playUser = { ...playUser, [kind]: false };
    playStatus.current[uId] = playUser;

    addFailUser(uId);
  };

  const addFailUser = (uId: string) => {
    const index = autoPlayFailUser.findIndex((item) => item === uId);
    if (index === -1) {
      autoPlayFailUser.push(uId);
    }
    setAutoPlayFailUser([...autoPlayFailUser]);
  };

  const playerFail = (params: { type: 'audio' | 'video'; userId: string }) => {
    const { type, userId } = params;
    let playUser = playStatus.current?.[userId] || {};


    playUser = { ...playUser, [type]: false };

    const { audio, video } = playUser;

    if (audio === false || video === false) {
      addFailUser(userId);
    }
  };

  const handlePlayerEvent = (event: PlayerEvent) => {
    const { userId:uId, rawEvent, type } = event;
    let playUser = playStatus.current?.[uId] || {};

    if (!playStatus.current) return;

    if (rawEvent.type === 'playing') {
      playUser = { ...playUser, [type]: true };
      const { audio, video } = playUser;
      if (audio !== false && video !== false) {
        const _autoPlayFailUser = autoPlayFailUserdRef.current.filter((item) => item !== uId);
        setAutoPlayFailUser([..._autoPlayFailUser]);
      }
    } else if (rawEvent.type === 'pause') {
      playerFail({ userId:uId, type });
    }

    playStatus.current[uId] = playUser;
  };

  const handleAutoPlay = () => {
    const users: string[] = autoPlayFailUser;
 
    if (users && users.length) {
      users.forEach((user) => {
        rtc.current?.engine.play(user);
      });
    }
    setAutoPlayFailUser([]);
  };

  useEffect(() => {
    autoPlayFailUserdRef.current = autoPlayFailUser;
  }, [autoPlayFailUser]);

  const handleJoinFailure = async (msg: string) => {
    const { confirm } = await Taro.showModal({
      title: '提示',
      content: `请重试?`
    });
    
    if (confirm) {
      
    }
    setMicOn(false);
    setVideoOn(false);
  };

  const handleRoomMessageReceived =(event)=>{
    console.log('%c [ event ]-334', 'font-size:13px; background:pink; color:#bf2c9f;', event)
  }
  // const handleRoomStreamStats= (stats)=>{
  //   console.log('%c [ stats ]-337', 'font-size:13px; background:pink; color:#bf2c9f;', stats)
  // }

  const msgUuid =useRef('')
  const handleRoomBinaryMessageReceived = (event: { userId: string; message: ArrayBuffer }) => {
    const { message } = event;
  
    const decoder = new TextDecoder('utf-8');
    const str = decoder.decode(message);
    const start = str.indexOf('{');
    const context = JSON.parse(str.substring(start, str.length)) || {};
    const data = context.data?.[0] || {};
    if (data) {
      if(msgUuid.current === ''){
        msgUuid.current = uuid()
      }
      const { text: msg, definite, userId: user, paragraph } = data;
      if(paragraph && msgUuid.current !== ''){
        msgUuid.current = ''
        
        onOpenTextSteam( msg, user !== userId, definite, msgUuid.current)
        return 
      }
      if(msgUuid.current !== ''){
        onOpenTextSteam( msg, user !== userId, definite, msgUuid.current)
      }

    }
  };
  const handleUserMessageReceived =(event)=>{
    console.log('%c [ handleUserMessageReceived ]-386', 'font-size:13px; background:pink; color:#bf2c9f;', event)
  }
  return (
    <View>
      <RTCComponent
        onRef={(ref: any) => (rtc.current = ref)}
        config={{
          appId,
          Token,
          roomId,
          uid: '',
        }}
        streamOptions={streamOptions}
        handleUserPublishStream={handleUserPublishStream}
        handleUserUnpublishStream={handleUserUnpublishStream}
        handleRoomMessageReceived={handleRoomMessageReceived}
        // handleRoomStreamStats={handleRoomStreamStats}
        handleRoomBinaryMessageReceived={handleRoomBinaryMessageReceived}
        handleUserMessageReceived={handleUserMessageReceived}
        // handleUserStartVideoCapture={handleUserStartVideoCapture}
        // handleUserStopVideoCapture={handleUserStopVideoCapture}
        handleUserJoin={handleUserJoin}
        handleUserLeave={handleUserLeave}
        handleEventError={handleEventError}
        handleAutoPlayFail={handleAutoPlayFail}
        handlePlayerEvent={handlePlayerEvent}
      />

      <ControlBar
        RClient={rtc}
        systemConf={[
          {
            moduleName: 'DividerModule',
            moduleProps: {
              width: 2,
              height: 32,
              marginL: 20,
            },
            visible: true,
          },
          {
            moduleName: 'HangUpModule',
            moduleProps: {
              changeHooks: () => {
                leaveRoom(false);
              },
            },
          },
        ]}
        moduleConf={[
          {
            moduleName: 'MicoPhoneControlModule',
            moduleProps: {
              changeHooks: () => changeMicState(),
              isMicOn,
            },
            visible: true,
          },
          // {
          //   moduleName: 'VideoControlModule',
          //   moduleProps: {
          //     changeHooks: () => changeVideoState(),
          //     isVideoOn,
          //   },
          //   visible: false,
          // },
        ]}
      />
      <AutoPlayModal handleAutoPlay={handleAutoPlay} autoPlayFailUser={autoPlayFailUser} />
    </View>
  );
};

export default RTCCall;
