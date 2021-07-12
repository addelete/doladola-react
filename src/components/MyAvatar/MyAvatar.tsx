import React, { useEffect, useState } from 'react';
import { Avatar, AvatarProps } from 'antd';

type MyAvatarProps = AvatarProps;

const MyAvatar: React.FC<MyAvatarProps> = (props) => {
  const { src } = props
  const [mySrc, setMySrc] = useState<any>()
  const [myStyle, setMyStyle] = useState<any>({})
  const [myChildren, setMyChildren] = useState<any>()
  useEffect(() => {
    let _src = src
    if (typeof _src === 'string' && /^\/random\//.test(_src)) {
      let data = _src.slice(8).split(',').reduce((result: any, item, index, params) => {
        if (index % 2 === 0) {
          let value: any = params[index + 1];
          if (item === 'w' || item === 'h') {
            value = Number(value);
          }
          if (value === 'undefined' || value === '') {
            value = undefined;
          }
          result[item] = value;
        }
        return result;
      }, {});
      data = Object.assign({
        b: 'ff0000',
        f: '000000',
      }, data);
      const text = data.t || `${data.w}x${data.h}`;
      setMySrc(undefined)
      setMyStyle({
        color: `#${data.f}`,
        backgroundColor: `#${data.b}`,
        fontFamily: 'serif',
        fontSize: 16,
      })
      setMyChildren(text)
    } else {
      setMySrc(_src)
    }
  }, [src])

  return myChildren ? (
    <Avatar size={props.size} style={myStyle}>{myChildren}</Avatar>
  ) : <Avatar {...props} src={mySrc} />
}

export default MyAvatar;