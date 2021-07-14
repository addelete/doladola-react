import React, { useEffect } from 'react';
import { Helmet, history } from 'umi';
import cache from '@/utils/cache';
import socket from '@/utils/socket';
import { gameInfos } from '@/utils/gameInfo';
import { useSingleState } from 'nice-hooks';
import { Button, Card, Divider, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import MatchGameModal from '@/components/MatchGameModal';
import CustomGameModal from '@/components/CustomGameModal';
import MyAvatar from '@/components/MyAvatar';
import './index.less';


type IndexPageState = {
  account?: UserType,
  matchGameModalVisible: boolean,
  customGameModalVisible: boolean,
  reconnecting: boolean,
}

type MatchGameSuccessMsg = {
  gameRoomId: string,
}
type CustomGameSuccessMsg = {
  gameRoomId: string,
}

const IndexPage = () => {

  const [state, setState] = useSingleState<IndexPageState>({
    account: cache.getItem<UserType>('account', undefined),
    matchGameModalVisible: false,
    customGameModalVisible: false,
    reconnecting: false,
  })

  useEffect(() => {
    const gameStatus = cache.getItem('gameStatus')
    if (gameStatus === 'gaming') {
      const gameType = cache.getItem<string>('gameType')
      gameType && history.push(`/game_${gameType?.slice(0, 2)}`)
    }
  }, [])

  useEffect(() => {
    socket.on('connect', handleReconnect); // 注册重连成功事件
    socket.on('disconnect', handleDisconnect); // 注册断开连接事件
    socket.on('match game success', handleStartGame); // 注册匹配游戏成功事件
    socket.on('disconnect', handleMatchingGameDisconnect); // 注册匹配游戏时，断开连接事件
    socket.on('custom game success', handleStartGame); // 注册自定义游戏成功事件

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('match game success', handleStartGame);
      socket.off('disconnect', handleMatchingGameDisconnect);
      socket.off('custom game success', handleStartGame); // 注册自定义游戏成功事件

    }
  }, [])

  /**
   * 重连成功
   */
  function handleReconnect() {
    setState({ reconnecting: false })
  }


  /**
   * 断开连接
   */
  function handleDisconnect() {
    setState({
      reconnecting: true,
    })
    message.warn({
      content: '断开连接',
    })
  }


  /**
   * 匹配游戏时，断开连接
   */
  function handleMatchingGameDisconnect() {
    const gameStatus = cache.getItem('gameStatus')
    if (gameStatus === 'matching') {
      cache.removeItem('gameType')
      cache.removeItem('gameStatus')
      setState({
        matchGameModalVisible: false,
      })
      message.warn({
        content: '请在连接成功之后，重新发起游戏',
      })
    }

  }

  /**
   * 匹配/自定义游戏成功事件
   * @param param0 
   */
  function handleStartGame({ gameRoomId }: MatchGameSuccessMsg) {
    cache.setItem('gameRoomId', gameRoomId)
    cache.setItem('gameStatus', 'gaming')
    const gameType = cache.getItem<string>('gameType')
    history.push(`/game_${gameType?.slice(0, 2)}`)
  }

  /**
   * 退出
   */
  function logout() {
    cache.removeItem('account')
    cache.removeItem('token')
    socket.emit('logout')
  }

  /**
   * 请求匹配游戏
   * @param gameType 
   */
  function matchGame(gameType: GameType) {
    cache.setItem('gameStatus', 'matching')
    cache.setItem('gameType', gameType)
    socket.emit('match game', { gameType })
    setState({ matchGameModalVisible: true })
  }

  /**
   * 取消匹配游戏
   */
  function cancelMatchGame() {
    const gameType = cache.getItem('gameType')
    socket.emit('cancel match game', { gameType }); // 发送取消匹配消息
    cache.removeItem('gameStatus') // 删除游戏状态缓存
    cache.removeItem('gameType') // 删除游戏类型缓存
    setState({ matchGameModalVisible: false }); // 关闭匹配中弹窗
  }

  /**
   * 弹出自定义游戏弹窗
   */
  function showCustomGameModal() {
    setState({ customGameModalVisible: true })
  }

  /**
   * 隐藏自定义游戏弹窗
   */
  function hideCustomGameModal() {
    setState({ customGameModalVisible: false })
  }

  /**
   * 发送自定义游戏请求
   * @param gameType 
   */
  function handleCustomGame(gameType: string) {
    cache.setItem('gameType', gameType)
    socket.emit('custom game', { gameType });
  }


  return (
    <div className="IndexPage">
      <Helmet>
        <title>首页</title>
      </Helmet>
      <Card bordered={false}>
        {state.reconnecting ? '[重连中]' : ''}
        <div className="account">
          <MyAvatar
            size={64}
            icon={<UserOutlined />}
            src={state.account?.avatar}
          ></MyAvatar>
          <div className="nickname">{state.account?.nickname}</div>
          <Button
            onClick={logout}
          >退出</Button>
        </div>
      </Card>
      <Divider />
      <Card bordered={false}>
        <div className="startGameButtons">
          {gameInfos.map((item) => (
            <Button
              key={item.name}
              type="primary"
              className="item"
              onClick={() => matchGame(item.type)}
            >匹配{item.name}</Button>
          ))}
          <Button
            key="custom"
            type="primary"
            className="item"
            onClick={showCustomGameModal}
          >自定义游戏</Button>
        </div>
        <MatchGameModal
          visible={state.matchGameModalVisible}
          onCancel={cancelMatchGame}
        />
        <CustomGameModal
          visible={state.customGameModalVisible}
          onCancel={hideCustomGameModal}
          onOk={handleCustomGame}
        />
      </Card>
    </div>
  );
}

export default IndexPage
