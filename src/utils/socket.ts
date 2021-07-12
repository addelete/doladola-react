import io from 'socket.io-client';
import { history } from 'umi';
import base64url from 'base64-url';
import qs from 'qs';
import cache from './cache';

const socket = io(SOCKET_URI, {
  auth: {
    token: cache.getItem('token'),
  }
});

socket.on('need login', () => {
  if (!/^\/auth\//.test(window.location.pathname)) {
    const fromUrlBase64 = base64url.encode(window.location.pathname + window.location.search);
    history.replace(`/auth/login?fromUrl=${fromUrlBase64}`)
  }
});

socket.on('login success', (data: any) => {
  const { token, account } = data;
  token && cache.setItem('token', token);
  account && cache.setItem('account', account);
  if (/^\/auth\//.test(window.location.pathname)) {
    const { fromUrlBase64 } = qs.parse(history.location.search.slice(1));
    const fromUrl = fromUrlBase64 ? base64url.decode(fromUrlBase64.toString()) : '/';
    history.replace(fromUrl);
  }
})


export default socket;
