import React from 'react';
import { View } from '@tarojs/components';

interface Props {
  width?: number;
  height?: number;
  marginL?: number;
}

const Divider: React.FC<Props> = ({ width = 2, height = 32, marginL = 20 }) => {
  return (
    <View 
      className='divider'
      style={{
        width: `${width}px`,
        height: `${height}px`,
        marginLeft: `${marginL}px`
      }}
    />
  );
};

export default Divider; 