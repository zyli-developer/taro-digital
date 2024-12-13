import React from 'react';
import { View, Image } from '@tarojs/components';
import hangUpIcon from '../../../assets/hangup.svg';

interface Props {
  changeHooks: () => void;
}

const HangUp: React.FC<Props> = ({ changeHooks }) => {
  return (
    <View className='hang-up-button' onClick={changeHooks}>
      <Image className='hang-up-icon' src={hangUpIcon} />
    </View>
  );
};

export default HangUp; 