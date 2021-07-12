import React, { useEffect, useMemo } from 'react';
import { history, IRouteComponentProps } from 'umi';
import { useSingleState, useSingleInstanceVar } from 'nice-hooks';
import socket from '@/utils/socket';
import cache from '@/utils/cache';
import update from 'immutability-helper';
import { message, Badge, Button, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import classnames from 'classnames';
import MyAvatar from '@/components/MyAvatar';
import './game_s4.less';

type BoardGridsType = (number | string)[][];
type PlayerStatusType = { online: boolean, move: boolean };
type Position = { x: number, y: number };

type SyncPlayersStatusMsg = {
  playersStatusMap: {
    [key: string]: PlayerStatusType,
  },
}
type SyncPlayersInfoMsg = {
  playersInfoMap: {
    [key: string]: UserType,
  },
}

type OtherPlayerJoinMsg = {
  playerId: string,
  playerInfo: UserType,
}

type SyncBoardMsg = {
  currentStepNum: number,
  boardGrids: BoardGridsType,
}
type CustomGameMasterMsg = {
  customGameMaster: string,
}

type SeizeSuccessMsg = {
  stopStepNum: number,
}


type OtherPlayerMoveMsg = {
  playerId: string,
}

type OtherPlayerQuitGameMsg = {
  playerId: string,
}
type GameOverMsg = {
  winner?: string,
  result: string,
}


type GameState = {
  account: UserType,
  gameType: GameType,
  myPos?: Position,
  myNextPos?: Position,
  boardGrids: BoardGridsType,
  currentStepNum: number,
  isTopSide: boolean,
  avatar: any,
  canNextStep: boolean,
  gameSizeX: number,
  gameSizeY: number,
  boardWidth: number,
  boardHeight: number,
  nextStepCanMovedGrids: Position[],
  myAvatarPxPos?: Position,
  playersInfoMap: {
    [key: string]: UserType
  },
  playersStatusMap: {
    [key: string]: PlayerStatusType
  },
  customGameMaster: string,
}

/**
 * 判断坐标是否在坐标列表里
 * @param pos 
 * @param posList 
 * @returns 
 */
function isPosInList(pos: Position, posList: Position[]) {
  return posList.findIndex(p => p.x === pos.x && p.y === pos.y) !== -1
}


const GameS4: React.FC<IRouteComponentProps> = ({ location }) => {

  const [state, setState] = useSingleState<GameState>({
    account: cache.getItem('account') as UserType,
    gameType: cache.getItem('gameType') as GameType,
    myPos: undefined,
    myNextPos: undefined,
    boardGrids: [],
    currentStepNum: 1,
    isTopSide: false,
    avatar: null,
    canNextStep: false, // 是否可以落子
    gameSizeX: 9, // 游戏列数
    gameSizeY: 9, // 游戏行数
    boardWidth: 0,
    boardHeight: 0,
    nextStepCanMovedGrids: [], // 下一步可走的地砖，要在棋盘上亮起来
    myAvatarPxPos: undefined,
    playersInfoMap: {},
    playersStatusMap: {},
    customGameMaster: '',
  })

  const gameVar = useSingleInstanceVar({
    stopStepNum: 0,
  })

  // socket监听
  useEffect(() => {

    socket.on('sync board', handleSyncBoard) // 注册同步棋盘事件
    socket.on('custom game master', handleCustomGameMaster) // 注册同步棋盘事件
    socket.on('sync players status', handleSyncPlayersStatus) // 注册同步玩家状态事件
    socket.on('sync players info', handleSyncPlayersInfo) // 注册同步玩家状态事件
    socket.on('other player leave', handleOtherPlayerLeave) // 注册其他用户离线事件
    socket.on('other player join', handleOtherPlayerJoin) // 注册其他用户上线事件
    socket.on('seize success', handleSeizeSuccess) // 注册抢位成功事件
    socket.on('seize fail', handleSeizeFail) // 注册抢位失败事件
    socket.on('other player move', handleOtherPlayerMove) // 注册其他玩家移动棋子事件
    socket.on('quit game success', handleQuitGameSuccess) // 注册退出游戏成功事件
    socket.on('other player quit game', handleOtherPlayerQuitGame) // 注册其他玩家退出游戏事件
    socket.on('game over', handleGameOver) // 注册游戏结束事件

    if (state.account) {
      joinGameRoom(); // 加入游戏房间
    }

    return () => {
      socket.off('sync board', handleSyncBoard)
      socket.off('custom game master', handleCustomGameMaster)
      socket.off('sync players status', handleSyncPlayersStatus)
      socket.off('sync players info', handleSyncPlayersInfo)
      socket.off('other player leave', handleOtherPlayerLeave)
      socket.off('other player join', handleOtherPlayerJoin)
      socket.off('seize success', handleSeizeSuccess)
      socket.off('seize fail', handleSeizeFail)
      socket.off('other player move', handleOtherPlayerMove)
      socket.off('quit game success', handleQuitGameSuccess)
      socket.off('other player quit game', handleOtherPlayerQuitGame)
      socket.off('game over', handleGameOver)

    }
  }, [state.account])


  // 根据当前局面，设置下一步可走的地砖
  useEffect(() => {
    let nextStepCanMovedGrids: Position[] = [];
    if (state.canNextStep) {
      if (state.myPos) {
        // 对战中，先求出一步能达的棋子，再根据是都能走，过滤出可走的一步棋
        nextStepCanMovedGrids = [
          { x: state.myPos.x + 1, y: state.myPos.y },
          { x: state.myPos.x - 1, y: state.myPos.y },
          { x: state.myPos.x, y: state.myPos.y + 1 },
          { x: state.myPos.x, y: state.myPos.y - 1 },
        ];

        nextStepCanMovedGrids = nextStepCanMovedGrids.filter((pos: Position) => {
          return pos.x >= 0 &&
            pos.y >= 0 &&
            pos.x < state.gameSizeX &&
            pos.y < state.gameSizeY &&
            !state.boardGrids[pos.y][pos.x]
        })
      } else {
        nextStepCanMovedGrids = state.boardGrids.reduce((result: Position[], rows, y) => {
          result.push(...rows.map((grid, x) => ({ x, y })))
          return result;
        }, [])
      }
    }

    setState({ nextStepCanMovedGrids })
  }, [
    state.gameSizeX,
    state.gameSizeY,
    state.canNextStep,
    state.boardGrids,
    state.myPos,
    state.isTopSide,
  ])


  // boardGrids变化时，设置myPos
  useEffect(() => {
    (() => {
      if (state.boardGrids[0]) {
        for (let y = 0; y < state.boardGrids.length; y++) {
          const x = state.boardGrids[y].findIndex(item => item === state.account?._id)
          if (x > -1) {
            setState({ myPos: { x, y } })
            return
          }
        }
      }
    })()
  }, [state.boardGrids, state.account])



  // 根据步数与玩家状态，判断是否可走
  useEffect(() => {
    let canNextStep = true;
    if (gameVar.stopStepNum === state.currentStepNum) {
      canNextStep = false
    }
    if (state.playersStatusMap[state.account?._id]?.move) {
      canNextStep = false
    }
    setState({ canNextStep });
  }, [state.account, state.currentStepNum, state.playersStatusMap])


  /**
   * 其他玩家退出游戏
   * @param param0 
   */
  function handleOtherPlayerQuitGame({ playerId }: OtherPlayerQuitGameMsg) {
    setState({
      playersStatusMap: update(state.playersStatusMap, {
        [playerId]: {
          online: { $set: false }
        }
      })
    })
    const player = state.playersInfoMap[playerId]?.nickname
    message.info(`${player}退出游戏`);
  }

  /**
   * 清除缓存，并返回首页
   */
  function clearGameAndGoHome() {
    cache.removeItem('gameRoomId')
    cache.removeItem('gameType')
    cache.removeItem('gameStatus')
    history.replace('/')
  }

  /**
   * 游戏结束
   * @param param0 
   */
  function handleGameOver({ result, winner }: GameOverMsg) {
    if (result === 'normal') {
      if (winner && winner === state.account._id) {
        Modal.success({
          title: '胜',
          content: '大风起兮云飞扬，威加海内兮归故乡，安得猛士兮守四方！',
          onOk: clearGameAndGoHome,
          okText: '返回首页',
        })
      } else {
        Modal.error({
          title: '负',
          content: '力拔山兮气盖世，时不利兮骓不逝。骓不逝兮可奈何，虞兮虞兮奈若何！',
          onOk: clearGameAndGoHome,
          okText: '返回首页',
        })
      }
    } else if(result === 'draw') {
      Modal.warn({
            title: '平',
            content: '天下英雄，唯使君与操耳。',
            onOk: clearGameAndGoHome,
            okText: '返回首页',
          })
    }
  }

  /**
   * 抢位失败提示
   */
  function handleSeizeFail() {
    message.info('抢位失败，退回原地')
  }

  /**
   * 同步棋盘局面和当前步数
   * @param param0 
   */
  function handleSyncBoard({ boardGrids, currentStepNum }: SyncBoardMsg) {
    if (currentStepNum !== state.currentStepNum) {
      setState({
        myNextPos: undefined,
      })
    }
    setState({
      boardGrids,
      currentStepNum,
    })
  }

  function handleCustomGameMaster({ customGameMaster }: CustomGameMasterMsg) {
    setState({
      customGameMaster,
    })
  }

  function handleSeizeSuccess({ stopStepNum }: SeizeSuccessMsg) {
    message.info('抢位成功，暂停一步')
    gameVar.stopStepNum = stopStepNum
  }

  function handleOtherPlayerMove({ playerId }: OtherPlayerMoveMsg) {
    setState({
      playersStatusMap: update(state.playersStatusMap, {
        [playerId]: {
          move: { $set: true },
        }
      }),
    })
  }

  function handleOtherPlayerJoin({ playerId, playerInfo }: OtherPlayerJoinMsg) {
    setState({
      playersInfoMap: update(state.playersInfoMap, {
        [playerId]: { $set: playerInfo },
      }),
    }, () => {
      let playersStatusMap;
      if (state.playersStatusMap[playerId]) {
        playersStatusMap = update(state.playersStatusMap, {
          [playerId]: {
            online: { $set: true },
          }
        })
      } else {
        playersStatusMap = update(state.playersStatusMap, {
          [playerId]: {
            $set: {
              online: true,
              move: false,
            }
          }
        })
      }
      setState({
        playersStatusMap,
      })
    })

  }

  function handleOtherPlayerLeave({ playerId }: { playerId: string }) {
    setState({
      playersStatusMap: update(state.playersStatusMap, {
        [playerId]: {
          online: { $set: false },
        }
      }),
    })
  }

  /**
   * 当前用户加入房间成功事件
   * @param param0 
   */
  function handleSyncPlayersStatus({ playersStatusMap }: SyncPlayersStatusMsg) {
    setState({ playersStatusMap })
  }
  /**
   * 当前用户加入房间成功事件
   * @param param0 
   */
  function handleSyncPlayersInfo({ playersInfoMap }: SyncPlayersInfoMsg) {
    setState({ playersInfoMap })
  }


  /**
   * 退出游戏成功
   */
  function handleQuitGameSuccess() {
    clearGameAndGoHome();
  }

  /**
   * 加入游戏房间
   */
  function joinGameRoom() {
    const gameRoomId = cache.getItem('gameRoomId')
    if (gameRoomId) {
      socket.emit('join game room', { gameRoomId })
    } else {
      message.warn({
        content: '程序错误，退出游戏',
      })
      history.replace('/')
    }
  }

  /**
   * 点击格子事件
   * @param pos 
   */
  function onClickGrid(pos: Position) {
    if (isPosInList(pos, state.nextStepCanMovedGrids)) {
      setState({ myNextPos: pos })
    }
  }

  /**
   * 确定移动
   */
  function submitMove() {
    if (state.myNextPos) {
      socket.emit('submit move', { movePos: state.myNextPos, stepNum: state.currentStepNum });
      const playersStatusMap = update(state.playersStatusMap, {
        [state.account?._id]: {
          move: { $set: true },
        }
      })
      setState({ playersStatusMap });
    }
  }

  /**
   * 复制邀请链接，仅限自定义游戏
   */
  async function copyGameDoor() {
    const gameRoomId = cache.getItem<string>('gameRoomId');
    const gameRoomDoor = `${window.location.protocol}//${window.location.host}/game_door?gameRoomId=${gameRoomId}`;
    await navigator.clipboard.writeText(gameRoomDoor);
    message.success({
      content: '复制邀请链接成功'
    })
  }

  /**
   * 开始游戏
   */
  function startGame() {
    const gameRoomId = cache.getItem<string>('gameRoomId');
    socket.emit('custom game start', { gameRoomId })
  }

  /**
   * 弹出退出游戏模态框
   */
  function quitGame() {
    Modal.confirm({
      title: '确定退出?',
      icon: <ExclamationCircleOutlined />,
      // content: 'When clicked the OK button, this dialog will be closed after 1 second',
      onOk() {
        socket.emit('quit game');
      },
      onCancel() { },
    });
  }


  const myGridPos = useMemo(() => state.myNextPos || state.myPos, [state.myNextPos, state.myPos])

  const canStartGame = useMemo(() => {
    return Object.keys(state.playersStatusMap).filter(userId => state.playersStatusMap[userId].online).length > 1
  }, [state.playersStatusMap])

  return <div className="GameS4">
    <div className="players">
      <div className="self">
        <div className="player">
          <MyAvatar
            src={state.account?.avatar}
            size={48}
          />
          <div className="status">
            {state.playersStatusMap[state.account?._id]?.move ? '已走' : null}
          </div>
        </div>
      </div>
      <div className="others">
        {Object.keys(state.playersInfoMap).map((playerId) => {
          return (
            state.account?._id === playerId ? null : <div className="player" key={playerId}>
              <Badge dot offset={[-6, 6]} color={state.playersStatusMap[playerId]?.online ? 'green' : 'red'}>
                <MyAvatar
                  src={state.playersInfoMap[playerId]?.avatar}
                  size={48}
                />
              </Badge>
              <div className="status">
                {state.playersStatusMap[playerId]?.move ? '已走' : null}
              </div>
            </div>
          )
        })}
      </div>

    </div>
    <div className="boardGrids">
      {state.boardGrids.map((rowGrids, y) => <div className="row" key={y}>
        {rowGrids.map((grid, x) => {
          return <div
            className={classnames('grid', {
              nextStepCanMoved: isPosInList({ y, x }, state.nextStepCanMovedGrids),
              isBaned: grid === 1,
              isMyPos: grid === state.account?._id,
            })}
            key={x}
            onClick={() => onClickGrid({ x, y })}
          >
            {typeof grid === 'string' && state.account?._id !== grid && state.playersStatusMap[grid] && state.playersInfoMap[grid] ? (
              <MyAvatar size={40} src={state.playersInfoMap[grid].avatar} />
            ) : null}
            {myGridPos && myGridPos.y === y && myGridPos.x === x ? (
              <MyAvatar size={36} src={state.account?.avatar} />
            ) : null}
          </div>
        })}
      </div>)}
    </div>
    <div className="buttons">
      {state.customGameMaster &&
        state.customGameMaster === state.account?._id &&
        state.currentStepNum === 0 ? (
        <Button
          type="primary"
          onClick={startGame}
          disabled={!canStartGame}
        >开始游戏</Button>
      ) : null}
      {state.currentStepNum === 0 ? (
        <Button
          type="primary"
          onClick={copyGameDoor}
        >邀请朋友</Button>
      ) : null}

      <Button
        type="primary"
        onClick={submitMove}
        disabled={!state.canNextStep || !state.myNextPos}
      >确定</Button>

      <Button
        type="primary"
        onClick={quitGame}
      >退出</Button>
    </div>
  </div>
}

export default GameS4;