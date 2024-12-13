import React from 'react';
import { View, Image } from '@tarojs/components';
import micOnIcon from '../../../assets/micOnIcon.png';
import micOffIcon from '../../../assets/micOffIcon.png';

interface Props {
  changeHooks: () => void;
  isMicOn: boolean;
}

const MicoPhoneControl: React.FC<Props> = ({ changeHooks, isMicOn }) => {
  return (
    <View className='control-item' onClick={changeHooks}>
      <Image 
        className='control-icon'
        src={isMicOn ? micOnIcon : micOffIcon} 
      />
    </View>
  );
};

export default MicoPhoneControl;