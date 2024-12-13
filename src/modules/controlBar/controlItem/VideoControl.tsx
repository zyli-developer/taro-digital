import React from 'react';
import { View, Image } from '@tarojs/components';
import videoOnIcon from '../../../assets/videoOnIcon.png';
import videoOffIcon from '../../../assets/videoOffIcon.png';

interface Props {
  changeHooks: () => void;
  isVideoOn: boolean;
}

const VideoControl: React.FC<Props> = ({ changeHooks, isVideoOn }) => {
  return (
    <View className='control-item' onClick={changeHooks}>
      <Image 
        className='control-icon'
        src={isVideoOn ? videoOnIcon : videoOffIcon} 
      />
    </View>
  );
};

export default VideoControl; 