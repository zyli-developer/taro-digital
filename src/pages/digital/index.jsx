import { useEffect, useMemo, useRef, useState } from "react";
import { View, Input, Button, Text, Image } from "@tarojs/components";
import Taro from "@tarojs/taro";
import NextCas from "@nextcas/sdk";
import Recorder from "js-audio-recorder";
import { v4 as uuid } from "uuid";
import { vrtcGetToken } from "../../server/rtc";
import {
  dialogue,
  nhToken,
  textToSpeech,
  audioToText,
} from "../../server/digital";
import RTCCall from "../RTCCall";
import styles from "./index.module.less";
// import { blobToBase64 } from "../../utils/index";
// import Config from "../../config";
// import Utils from "../../utils";
// import { useJoin } from "../../lib/useCommon";

// import sendSvg from "../../assets/send.svg";
import adudioSvg from "../../assets/audio.svg";
import textSvg from "../../assets/text.svg";
import iphoneSvg from "../../assets/iphone.svg";

import downSvg from "../../assets/bg-down.svg";
import upSvg from "../../assets/bg-up.svg";
// import hangupSvg from "../../assets/hangup.svg";
// import interruptSvg from "../../assets/interrupt.svg";
// import micSvg from "../../assets/mic.svg";

let nextCas = null;

function Human() {
  const container = useRef(null);
  const chatRef = useRef(null);
  const [token, setToken] = useState();
  const [inited, setInited] = useState();
  const [progress, setProgress] = useState(0);
  const systemInfo = useMemo(() => {
    if (process.env.TARO_ENV === "h5") {
      return {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      };
    }
    return Taro.getSystemInfoSync();
  }, []);
  const { windowWidth: width, windowHeight: height } = systemInfo;
  const [packShow, setPackShow] = useState(false);
  const getToken = async () => {
    try {
      const response = await nhToken({ visitId: "123", visitName: "abc" });
      setToken(response.data);
    } catch (err) {
      console.log(
        "%c [ err ]-23",
        "font-size:13px; background:pink; color:#bf2c9f;",
        err
      );
    }
  };

  const recorder = useRef(null);
  useEffect(() => {
    getToken();
    recorder.current = new Recorder({
      sampleBits: 16, // 采样位数，支持 8 或 16，默认是16
      sampleRate: 16000, // 采样率，支持 11025、16000、22050、24000、44100、48000，根据浏览器默认值，我的chrome是48000
      numChannels: 1,
    });
  }, []);

  // 添加自动触发交互的函数
  const triggerUserInteraction = () => {
    // 创建一个临时按钮
    const tempButton = document.createElement("button");

    // 添加点击事件监听器
    tempButton.addEventListener(
      "click",
      async () => {
        // 点击后立即移除按钮
        tempButton.remove();
      },
      { once: true }
    ); // 使用 once 选项确保事件只触发一次

    // 设置按钮样式为隐藏
    Object.assign(tempButton.style, {
      position: "absolute",
      opacity: "0",
      pointerEvents: "none",
      height: "0",
      width: "0",
      overflow: "hidden",
    });

    // 添加到 DOM 并触发点击
    document.body.appendChild(tempButton);
    tempButton.click();
  };

  useEffect(() => {
    if (!token) return;
    nextCas = new NextCas(container.current, {
      avatarId: "avatar_522977",
      actorId: "actor_100256",
      token,
      templateName: "base",
    });

    nextCas.on("initProgress", (cent) => {
      setProgress(() => cent);
    });
    nextCas.on("ready", () => {
      setInited(true);
      // 初始化完成后触发交互
      triggerUserInteraction();
    });
    return () => {
      nextCas?.destroy();
    };
  }, [container, token]);

  const [speakText, setSpeakText] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [status, setStatus] = useState("talking");

  const handleMicClick = (type) => {
    setStatus(type); // 点击话筒切换到按住说话状态
    setIsRecording(false);
  };

  const [isRecording, setIsRecording] = useState(false);
  // const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const [inputColor, setInputColor] = useState("put");
  const [cancelRecording, setCancelRecording] = useState(false);

  const startYRef = useRef(0); // 记录触摸开始的 Y 坐标

  const initFetch = async (base64data) => {
    const asr = await audioToText({
      data: base64data,
      format: "wav",
      sampleRate: 1600,
    });

    if (!asr) return;
    if (asr.data) {
      setChatHistory((prev) =>
        prev.concat([
          {
            id: uuid(),
            source: "guest",
            content: asr.data,
          },
        ])
      );
    }
    setPackShow(true);
    const text = await dialogue({ streaming: false, data: asr.data });
    if (!text) return;

    const audioRes = await textToSpeech({ streaming: false, data: text });
    nextCas.speakByAudio(audioRes.data, {
      onEnd: () => {
        console.log("onEnd");
      },
      onStart: () => {
        setChatHistory((prev) =>
          prev.concat([
            {
              id: uuid(),
              source: "master",
              content: text,
            },
          ])
        );
      },
    });
  };

  // 添加一个状态来存储音量
  const [volume, setVolume] = useState(0);

  // 修改 startRecording 函数
  const startRecording = async () => {
    if (process.env.TARO_ENV === "weapp") {
      try {
        await Taro.authorize({ scope: "scope.record" });
        // 微信小程序使用录音管理器以获取实时音量
        const recorderManager = Taro.getRecorderManager();

        recorderManager.onStart(() => {
          setIsRecording(true);
        });

        recorderManager.onFrameRecorded((res) => {
          // 计算音量
          const dataView = new DataView(res.frameBuffer);
          let sum = 0;
          for (let i = 0; i < dataView.byteLength; i += 2) {
            sum += Math.abs(dataView.getInt16(i, true));
          }
          const averageVolume = sum / (dataView.byteLength / 2);
          const normalizedVolume = Math.min(100, (averageVolume / 5000) * 100);
          setVolume(normalizedVolume);
        });

        recorderManager.start({
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 48000,
          format: "PCM",
        });
      } catch (err) {
        Taro.showModal({
          title: "提示",
          content: "需要您的麦克风权限，是否去设置？",
          success: function (res) {
            if (res.confirm) {
              Taro.openSetting();
            }
          },
        });
      }
    } else {
      // H5环境
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder.current.start();
        setIsRecording(true);

        // 设置音量监听
        recorder.current.onprocess = (params) => {
          // volume 为0-100之间的值
          const normalizedVolume = Math.min(100, params.volume * 4);
          setVolume(normalizedVolume);
        };
      } catch (err) {
        console.error("录音权限获取失败:", err);
        Taro.showToast({
          title: "请允许使用麦克风",
          icon: "none",
        });
      }
    }
  };

  // 修改停止录音时重置音量
  const stopRecording = async () => {
    setVolume(0);
    if (process.env.TARO_ENV === "weapp") {
      // 微信小程序环境
      Taro.stopRecord({
        success: async function (res) {
          const { tempFilePath } = res;
          // Convert audio file to base64
          const fs = Taro.getFileSystemManager();
          const base64 = fs.readFileSync(tempFilePath, "base64");
          setIsRecording(false);
          initFetch(base64);
        },
        fail: function (error) {
          console.log("Stop recording failed:", error);
          setIsRecording(false);
        },
      });
    } else {
      // H5环境
      try {
        recorder.current.stop();
        const blob = recorder.current.getWAVBlob();
        // 将 Blob 转换为 Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(",")[1];
          setIsRecording(false);
          initFetch(base64);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error("停止录音失败:", err);
        setIsRecording(false);
      }
    }
  };
  const handleMouseDown = async (e) => {
    if (e && e.touches?.length > 0) {
      startYRef.current = e?.touches[0]?.clientY || 0; // 记录触摸的起始 Y 坐标
    }
    setStatus("recording");
    setInputColor("down");
    timeoutRef.current = setTimeout(() => {
      startRecording();
    }, 300); // 延迟 300 毫秒开始录音
  };
  const handleMouseUp = () => {
    setStatus("talking");
    setInputColor("put");
    setCancelRecording(false);
    clearTimeout(timeoutRef.current);
    if (isRecording) {
      stopRecording();
    }
  };
  const handleTouchMove = (e) => {
    const currentY = e?.touches[0]?.clientY || 0; // 当前 Y 坐标
    if (startYRef.current - currentY > 50) {
      // 如果上滑超过 50 像素
      setCancelRecording(true);
    } else {
      setCancelRecording(false);
    }
  };

  const sendSpeak = async () => {
    if (!speakText) return;
    setChatHistory((prev) =>
      prev.concat([
        {
          id: uuid(),
          source: "guest",
          content: speakText,
        },
      ])
    );
    setPackShow(true);
    setSpeakText("");
    const talk = await dialogue({ streaming: false, data: speakText });
    if (!talk) return;
    const audio = await textToSpeech({ data: talk });

    nextCas.speakByAudio(audio.data, {
      onEnd: () => {
        console.log("onEnd");
      },
      onStart: () => {
        setChatHistory((prev) =>
          prev.concat([
            {
              id: uuid(),
              source: "master",
              content: talk,
            },
          ])
        );
      },
    });
  };

  // 修改回车发送的处理函数
  const handleKeyPress = (e) => {
    if (process.env.TARO_ENV === "h5") {
      // H5 环境使用 keyCode
      if (e.keyCode === 13 || e.key === "Enter") {
        sendSpeak();
      }
    }
  };

  useEffect(() => {
    if (!chatRef?.current) return;
    chatRef.current.scrollTop = chatRef.current?.scrollHeight;
  }, [chatHistory]);

  const containerCss = useMemo(() => {
    return {
      position: "relative",
      width,
      height,
      borderColor: "none",
      outlineColor: "none",
      boxShadow: "none",
    };
  }, [height, width, chatHistory, packShow]);

  // 修改声波显示部分
  const WaveAnimation = ({ vol }) => {
    return (
      <View className={styles.waveContainer}>
        {[...Array(5)].map((_, index) => (
          <View
            key={index}
            className={styles.wave}
            style={{
              height: `${Math.max(20, vol * (1.5 + Math.random() * 0.8))}%`,
            }}
          />
        ))}
      </View>
    );
  };
  // 打电话

  // 添加通话状态控制
  const [joinFailReason, setJoinFailReason] = useState("");
  const [isInCall, setIsInCall] = useState(false);
  const [roomConfig, setRoomConfig] = useState({
    appId: "",
    roomId: "",
    userId: "",
    Token: "",
  });
  const nextCasStream = useRef();
  // 修改handleStart函数
  const handleStart = async () => {
    if (isInCall) return;
    const callConfig = await vrtcGetToken();
    if (callConfig.code === 0) {
      setRoomConfig({
        appId: callConfig.data.appId,
        roomId: callConfig.data.roomId,
        userId: callConfig.data.userId,
        Token: callConfig.data.token,
      });
      setIsInCall(true);
      nextCasStream.current = nextCas.createSpeakAudioStream();
      nextCasStream.current.onStart = () => {
        console.log("开始播报");
      };
      nextCasStream.current.onEnd = () => {
        console.log("播报结束");
      };
    } else {
      setIsInCall(false);
    }
  };

  // 修改handleHangup函数
  const handleHangup = () => {
    setIsInCall(false);
  };
const bs = 'UklGRiIBAABXQVZFZm10IBAAAAABAAEAQACABAAgAQAAAAABAAgAcGF0YQAQAAAAAACAAAAAA=='
const onOpenTextSteam = (text,isAi,definite,id) => {
  const findEqualData = chatHistory.find(e =>e.id === id)
  console.log('%c [ findEqualData ]-439', 'font-size:13px; background:pink; color:#bf2c9f;', findEqualData)
  !definite && !findEqualData ? nextCasStream.current.next(): setTimeout(()=> {
    console.log('%c [ last ]-441', 'font-size:13px; background:pink; color:#bf2c9f;', )
    nextCasStream.current.last(bs)
  },1000);
  let newHistory = []
  if (!text) return;
  if(findEqualData){
    newHistory = chatHistory.map((ele) => {
      if (ele.id === id) {
        return {
          id,
          source: isAi ? "master" : "guest",
          content: text,
        };
      } else return ele;
    });
  }else {
    newHistory = [...chatHistory,{
      id,
      source: isAi ? "master" : "guest",
      content: text,
    }]
  }
  setChatHistory(() => newHistory);
  
  if (!packShow) setPackShow(true);
}

  const onSpeakArrayBuffer = async (buf) => {
    try {
      if(!buf ) return
        setTimeout(() => {
          nextCasStream.current.next(buf);
        }, 1000);
    } catch (error) {
      console.error("Error processing audio buffer:", error);
      // 添加用户提示
      // Taro.showToast({
      //   title: '音频处理失败',
      //   icon: 'none',
      //   duration: 2000
      // });
    }
  };

  return (
    <View className={styles.main}>
      <View className={styles.content}>
        <View style={containerCss} ref={container} key='container'></View>
      </View>

      {!inited && (
        <View className={styles.apis}>
          <View className={styles.api_box}>
            <Text>初始化状态：</Text>
            <Text>{inited ? "初始化完成" : "正在加载" + progress + "%"}</Text>
          </View>
        </View>
      )}

      {inited && (
        <View className={styles.container}>
          {chatHistory.length > 0 && (
            <View className={styles.chat} ref={chatRef}>
              {packShow &&
                chatHistory?.map((e) => (
                  <View
                    key={e.id}
                    className={`${styles.chat_item} ${styles[e.source]}`}
                  >
                    {e.content}
                  </View>
                ))}
            </View>
          )}
          {packShow && (
            <View
              key='packup'
              className={styles.packup}
              onClick={() => setPackShow(false)}
            >
              <Image src={downSvg} alt='' />
            </View>
          )}
          {!packShow && chatHistory.length > 0 && (
            <View
              key='packup'
              className={styles.packup}
              onClick={() => setPackShow(true)}
            >
              <Image src={upSvg} alt='' />
            </View>
          )}
          {isInCall ? (
            <>
              <RTCCall
                {...roomConfig}
                setJoin={setIsInCall}
                setJoinFailReason={setJoinFailReason}
                onHangup={handleHangup}
                onSpeakArrayBuffer={
                  onSpeakArrayBuffer
                }
                onOpenTextSteam={
                  onOpenTextSteam
                }
              />
              {/* <View className={styles.footer}>
                <View className={styles.callControls}>
                  <Button
                    className={`${styles.controlBtn} ${styles.hangupBtn}`}
                    onClick={handleHangup}
                  >
                    <Image src={hangupSvg} />
                  </Button>
                  <Button
                    className={`${styles.controlBtn} ${styles.interruptBtn}`}
                    onClick={handleInterrupt}
                  >
                    <Image src={interruptSvg} />
                  </Button>
                  <Button
                    className={`${styles.controlBtn} ${styles.micBtn}`}
                    onClick={handleMicToggle}
                  >
                    <Image src={micSvg} />
                  </Button>
                </View>
              </View> */}
            </>
          ) : (
            <View className={styles.footer}>
              {status === "default" && (
                <View className={styles.input_container}>
                  <Input
                    type='text'
                    placeholder='来跟我聊聊吧'
                    className={styles.input}
                    value={speakText}
                    onKeyDown={handleKeyPress} // H5环
                    onConfirm={sendSpeak} // 小程序环境
                    onInput={(e) => setSpeakText(e.detail.value)}
                  />
                  <Button
                    className={styles.mic_button}
                    onClick={() => handleMicClick("talking")}
                  >
                    <Image src={adudioSvg} />
                  </Button>
                </View>
              )}
              {inited && ["talking", "recording"].includes(status) && (
                <View className={styles.input_container}>
                  <Button
                    placeholder={`${
                      status === "recording" ? "松手发送" : "按住说话"
                    }`}
                    className={`${styles.input} ${
                      inputColor === "put" ? styles.put : styles.down
                    }`}
                    readOnly
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleMouseUp}
                  >
                    {cancelRecording ? (
                      "松开取消"
                    ) : isRecording ? (
                      <WaveAnimation volume={volume} />
                    ) : (
                      "按住说话"
                    )}
                  </Button>

                  <Button
                    className={styles.mic_button}
                    onClick={() => handleMicClick("default")}
                  >
                    <Image src={textSvg} />
                  </Button>
                </View>
              )}

              <View className={styles.phone} onClick={handleStart}>
                <Image src={iphoneSvg} />
              </View>
            </View>
          )}
          <View className={styles.bot}>内容由AI生成，使用前请先仔细甄别</View>
        </View>
      )}
    </View>
  );
}

export default Human;
