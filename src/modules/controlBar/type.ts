/**
 * Copyright 2024 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { MutableRefObject } from 'react';
import { RTCClient } from '../../interfaces/rtc';

interface ModuleConfig {
  moduleName: string;
  moduleProps?: Record<string, any>;
  visible?: boolean;
}

export interface IControlBarProps {
  moduleConf?: ModuleConfig[];
  systemConf?: ModuleConfig[];
  RClient: MutableRefObject<RTCClient | undefined>;
}