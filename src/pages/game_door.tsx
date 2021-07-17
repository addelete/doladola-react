import React, { useEffect } from 'react';
import { message, Spin } from 'antd';
import { history, IRouteComponentProps } from 'umi';
import socket from '@/utils/socket';
import cache from '@/utils/cache';
import './game_door.less';


type GameBaseInfoSuccessMsg = {
  gameRoomId: string,
  gameType: string,
  canJoin: boolean,
}

const GameDoor: React.FC<IRouteComponentProps> = ({ location }) => {

  useEffect(() => {
    socket.on('custom game base info success', handleStartGame)
    if (location.query.gameRoomId) {
      socket.emit('custom game base info', { gameRoomId: location.query.gameRoomId })
    } else {
      history.replace('/')
    }
    return () => {
      socket.off('custom game base info success', handleStartGame)
    }
  }, [location.query])

  /**
   * 开始游戏
   * @param param0 
   */
  function handleStartGame({
    gameRoomId,
    gameType,
    canJoin,
  }: GameBaseInfoSuccessMsg) {
    const gameStatus = cache.getItem('gameStatus');
    const oldGameRoomId = cache.getItem('gameRoomId');
    if (gameStatus === 'gaming' && oldGameRoomId !== gameRoomId) {
      socket.emit('quit game');
    }
    setTimeout(() => {
      if (canJoin) {
        cache.setItem('gameStatus', 'gaming');
        cache.setItem('gameType', gameType);
        cache.setItem('gameRoomId', gameRoomId);
        history.replace(`/game_${gameType?.slice(0, 2)}`)
      } else {
        message.success({
          content: '加入失败，原因可能是游戏已经开始'
        })
        setTimeout(() => history.replace('/'), 1000)
      }
    }, 500)
  }

  return <div className="GameDoorPage">
    <Spin size="large" />
    <p style={{ marginTop: 10 }}>加入游戏</p>
  </div>
}

export default GameDoor;