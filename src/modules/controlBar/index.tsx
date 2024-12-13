/**
 * Copyright 2024 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import React from 'react';
import { View } from '@tarojs/components';
import ControlModules from './controlItem';
import SystemModules from './systemItems';
import './index.less';
import { IControlBarProps } from './type';

const ControlBar: React.FC<IControlBarProps> = (props) => {
  const { moduleConf = [], systemConf = [], RClient } = props;

  const attachModules = () => {
    return moduleConf.map((item, index) => {
      const { visible = true, moduleProps = {} } = item || {};
      const Comp = ControlModules[item.moduleName];
      return visible && Comp ? (
        <Comp RClient={RClient} {...moduleProps} key={index} />
      ) : null;
    });
  };

  const attachSystem = () => {
    return systemConf.map((item, index) => {
      const { visible = true, moduleProps = {} } = item || {};
      const Comp = SystemModules[item.moduleName];
      return visible && Comp ? (
        <Comp RClient={RClient} {...moduleProps} key={index} />
      ) : null;
    });
  };

  return (
    <View className='control-bar'>
      <View className='control-modules'>{attachModules()}</View>
      <View className='system-modules'>{attachSystem()}</View>
    </View>
  );
};

export default ControlBar;