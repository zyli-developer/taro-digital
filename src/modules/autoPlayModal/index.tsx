/**
 * Copyright 2024 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import React, { useEffect, useState } from 'react';
import { View } from '@tarojs/components';
import './index.less';

type AutoPlayModalProps = { 
  handleAutoPlay: () => void; 
  autoPlayFailUser: string[] 
};

const AutoPlayModal: React.FC<AutoPlayModalProps> = ({ handleAutoPlay, autoPlayFailUser }) => {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    setVisible(autoPlayFailUser.length ? true : false);
  }, [autoPlayFailUser]);

  if (!visible) return null;

  return (
    <View className='auto-play-modal'>
      <View className='modal-content'>
        <View className='auto-play-button' onClick={handleAutoPlay}>
          自动播放
        </View>
      </View>
    </View>
  );
};

export default AutoPlayModal;
