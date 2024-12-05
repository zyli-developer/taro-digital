import React from 'react';

let importAll = (requireContext) => requireContext.keys().forEach(requireContext);
try {importAll(require.context('assets', true, /\.svg$/));} 
catch (error) {console.log(error);}

const Icon = (props) => {
  console.log('%c [ props ]-8', 'font-size:13px; background:pink; color:#bf2c9f;', props)
  return (
    <svg>
      <use xlinkHref={'#' + props.name}/>
    </svg>
  );
};

export default Icon;
