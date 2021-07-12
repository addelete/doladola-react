import React from 'react';
import { IRouteComponentProps } from 'umi';
import { Button, Card, Form, Input } from 'antd';
import socket from '@/utils/socket';

const Login: React.FC<IRouteComponentProps> = ({ location }) => {
  
  // const handleSubmit = (data: any) => {
  //   socket.emit('login', data);
  // }
  const loginAsTourist = () => {
    socket.emit('login as tourist');
  }
  return <div>
    <Card bordered={false}>
      <Button
        type="primary"
        onClick={loginAsTourist}
      >游客登录</Button>
    </Card>

  </div>
}

export default Login;