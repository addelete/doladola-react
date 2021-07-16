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
  myselfMoved: boolean,
  myAvatarPxPos?: Position,
  playersInfoMap: {
    [key: string]: UserType
  },
  playersStatusMap: {
    [key: string]: PlayerStatusType
  },
  customGameMaster: string,
  isGameOver: boolean,
  boardScale: number,
}

type GameVars = {
  voteRestartModal: any,
  voteNextStepModal: any,
  gameOverModal: any,
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

/**
 * 计算
 */
const isHView = window.innerWidth > window.innerHeight
const viewClassname = { hv: isHView, vv: !isHView }
const SIZE = Math.min(window.innerWidth, window.innerHeight, 640);
const allGameColsMap: {
  [key: string]: number,
} = {
  's4p2': 9,
  's4g9': 9,
  's4p4': 15,
  's4g15': 15,
  's4p8': 21,
  's4g21': 21,
}

document.documentElement.style.setProperty('--size', `${SIZE}px`);

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
    myselfMoved: false,
    myAvatarPxPos: undefined,
    playersInfoMap: {},
    playersStatusMap: {},
    customGameMaster: '',
    isGameOver: false,
    boardScale: 1,
  })

  const vars = useSingleInstanceVar<GameVars>({
    voteRestartModal: undefined,
    voteNextStepModal: undefined,
    gameOverModal: undefined,
  })

  useEffect(() => {
    const gameType = cache.getItem('gameType') as string
    const gameCols = allGameColsMap[gameType]
    const boardWidth = (gameCols) * 41 - 1
    setState({
      boardScale: SIZE / boardWidth,
      gameSizeX: gameCols,
      gameSizeY: gameCols,
    })
  }, [location])

  // socket监听
  useEffect(() => {

    socket.on('sync board', handleSyncBoard) // 注册同步棋盘事件
    socket.on('custom game master', handleCustomGameMaster) // 注册同步棋盘事件
    socket.on('sync players status', handleSyncPlayersStatus) // 注册同步玩家状态事件
    socket.on('sync players info', handleSyncPlayersInfo) // 注册同步玩家状态事件
    socket.on('other player leave', handleOtherPlayerLeave) // 注册其他用户离线事件
    socket.on('other player join', handleOtherPlayerJoin) // 注册其他用户上线事件
    socket.on('other player move', handleOtherPlayerMove) // 注册其他玩家移动棋子事件
    socket.on('clashed moving', handleClashedMoving) // 注册移动冲突事件
    socket.on('other player quit game', handleOtherPlayerQuitGame) // 注册其他玩家退出游戏事件
    socket.on('game over', handleGameOver) // 注册游戏结束事件
    socket.on('game over cause miss step', handleGameOverCauseMissStep) // 注册因错过步骤游戏结束事件
    socket.on('vote restart call', handleVoteRestartCall) // 注册发起投票重开游戏事件
    socket.on('vote restart success', handleVoteRestartSuccess) // 注册投票重开游戏成功事件
    socket.on('vote restart failed', handleVoteRestartFailed) // 注册投票重开游戏失败事件

    socket.on('vote next step call', handleVoteNextStepCall) // 注册发起投票拨轮事件
    socket.on('vote next step failed', handleVoteNextStepFailed) // 注册发起投票拨轮失败事件
    socket.on('vote next step success', handleVoteNextStepSuccess) // 注册发起投票拨轮成功事件
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
      socket.off('other player move', handleOtherPlayerMove)
      socket.off('clashed moving', handleClashedMoving)
      socket.off('other player quit game', handleOtherPlayerQuitGame)
      socket.off('game over', handleGameOver)
      socket.off('game over cause miss step', handleGameOverCauseMissStep)
      socket.off('vote restart call', handleVoteRestartCall)
      socket.off('vote restart success', handleVoteRestartSuccess)
      socket.off('vote restart failed', handleVoteRestartFailed)

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
    if (state.currentStepNum === 0) {
      canNextStep = false
    }
    if (state.playersStatusMap && state.account && (state.myselfMoved || (state.playersStatusMap[state.account._id]?.move))) {
      canNextStep = false
    }
    setState({ canNextStep });
  }, [state.account, state.currentStepNum, state.playersStatusMap, state.myselfMoved])

  /**
   * 移动冲突
   */
  function handleClashedMoving() {
    message.warning({ content: '格子已被占据，移动失败，请重新移动' })
    const playersStatusMap = update(state.playersStatusMap, {
      [state.account._id]: {
        move: { $set: false },
      }
    })
    setState({ playersStatusMap, myNextPos: undefined, });
  }

  // 开局，如果是房主，提示点击开始
  useEffect(() => {
    if(state.customGameMaster && state.customGameMaster === state.account?._id && state.currentStepNum === 0) {
      message.info('你是房主，请在准备好之后点击开始')
    }
  }, [state.customGameMaster, state.account, state.currentStepNum])

  /**
  * 其他人发起拨轮投票
  */
  function handleVoteNextStepCall() {
    vars.voteNextStepModal = Modal.confirm({
      title: '有人发起拨轮投票',
      content: '拨轮意思是直接进入下一回合，不再等待掉线的人',
      icon: null,
      okText: '赞成',
      cancelText: '反对',
      onOk() {
        socket.emit('vote next step', { vote: true });
      },
      onCancel() {
        socket.emit('vote next step', { vote: false });
      },
    });
  }

  /**
   * 其他人发起重开投票
   */
  function handleVoteRestartCall() {
    vars.voteRestartModal = Modal.confirm({
      title: '有人发起重开游戏投票',
      icon: null,
      okText: '赞成',
      cancelText: '反对',
      onOk() {
        socket.emit('vote restart', { vote: true });
      },
      onCancel() {
        socket.emit('vote restart', { vote: false });
      },
    });
  }

  /**
 * 注册因错过步骤游戏结束事件
 */
  function handleGameOverCauseMissStep() {
    Modal.error({
      title: '退出游戏',
      content: '可能因断线导致掉队，退出游戏',
      onOk() {
        quitGame()
      }
    })
  }


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
    socket.emit('quit game')
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
    setState({ isGameOver: true })
    if (result === 'normal') {
      if (winner && winner === state.account._id) {
        vars.gameOverModal = Modal.confirm({
          title: '胜',
          content: '大风起兮云飞扬，威加海内兮归故乡，安得猛士兮守四方！',
          onOk: clearGameAndGoHome,
          onCancel: VoteRestart,
          okText: '返回首页',
          cancelText: '重开游戏',
        })
      } else {
        vars.gameOverModal = Modal.confirm({
          title: '负',
          content: '力拔山兮气盖世，时不利兮骓不逝。骓不逝兮可奈何，虞兮虞兮奈若何！',
          onOk: clearGameAndGoHome,
          onCancel: VoteRestart,
          okText: '返回首页',
          cancelText: '重开游戏',
        })
      }
    } else if (result === 'draw') {
      vars.gameOverModal = Modal.confirm({
        title: '平',
        content: '天下英雄，唯使君与操耳。',
        onCancel: VoteRestart,
        onOk: clearGameAndGoHome,
        okText: '返回首页',
        cancelText: '重开游戏',
      })
    }
  }

  /**
  * 拨轮投票失败
  */
  function handleVoteNextStepFailed() {
    message.warning('有人投了反对票，拨轮失败');
    vars.voteNextStepModal && vars.voteNextStepModal.destroy()
    vars.voteNextStepModal = undefined;
  }

  /**
  * 拨轮游戏成功
  */
  function handleVoteNextStepSuccess() {
    message.success('拨轮成功，进入新回合');
  }

  /**
   * 投票重开游戏成功
   */
  function handleVoteRestartFailed() {
    message.warning('有人投了反对票，投票重开失败');
    vars.voteRestartModal && vars.voteRestartModal.destroy()
    vars.voteRestartModal = undefined;
  }

  /**
   * 重开游戏成功
   */
  function handleVoteRestartSuccess() {
    message.success('投票重开游戏成功');
    setState({
      myPos: undefined,
      myNextPos: undefined,
    })
    vars.gameOverModal && vars.gameOverModal.destroy()
  }


  /**
   * 同步棋盘局面和当前步数
   * @param param0 
   */
  function handleSyncBoard({ boardGrids, currentStepNum }: SyncBoardMsg) {
    if (currentStepNum !== state.currentStepNum) {
      setState({
        myNextPos: undefined,
        myselfMoved: false,
      })
    }
    setState({
      boardGrids,
      currentStepNum: Number(currentStepNum),
    })
  }

  /**
   * 自定义游戏房主
   * @param param0 
   */
  function handleCustomGameMaster({ customGameMaster }: CustomGameMasterMsg) {
    setState({
      customGameMaster,
    })
  }

  /**
   * 其他人移动
   * @param param0 
   */
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
      socket.emit('submit move', { oldPos: state.myPos, newPos: state.myNextPos, stepNum: state.currentStepNum });
      setState({ myselfMoved: true });
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
   * 手动投票进入下一回合
   */
  function voteNextStep() {
    socket.emit('vote next step', { vote: true });
    message.success('发起拨轮投票，等待其他人投票');
  }
  /**
   * 投票重开
   */
  function VoteRestart() {
    socket.emit('vote restart', { vote: true });
    message.success('发起重开投票，等待其他人投票');

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
      onOk() {
        clearGameAndGoHome();
      },
    });
  }

  function showRules() {
    Modal.info({
      title: '规则',
      icon: null,
      content: <ul className="rules">
        <li>多人在棋盘上走棋，每人一颗棋子。</li>
        <li>初始状态各自下一颗棋。而后每回合可以向当前位置四周走一步，走过的格子变成死路所有人不能走。</li>
        <li>随着回合进行有些人被死路围死，有些人活到最后吃鸡成功。</li>
        <li>自定义游戏，需要先邀请，等人到齐，开房人点击开始</li>
        <li>游戏开始后，绿色区域可以开局落子或回合内移动，落子或移动后点击确定</li>
        <li>每回合不分先后，所有人走一步后局面刷新</li>
        <li>如果有人未走且掉线，其他玩家可以点击拨轮投票放弃等待，进入下一回合</li>
        <li>四周被堵死者判负，最后幸存者判胜</li>
        <li>离开游戏需要点击退出</li>
      </ul>
    })
  }


  const myGridPos = useMemo(() => state.myNextPos || state.myPos, [state.myNextPos, state.myPos])

  const canStartGame = useMemo(() => {
    return Object.keys(state.playersStatusMap).filter(userId => state.playersStatusMap[userId].online).length > 1
  }, [state.playersStatusMap])

  const canVoteNextStep = useMemo(() => {
    return Object.keys(state.playersStatusMap).reduce((result, item) => {
      const { online, move } = state.playersStatusMap[item];
      if (!online && !move) {
        result = true;
      }
      return result;
    }, false)

  }, [state.playersStatusMap])

  return <div className={classnames('GameS4', viewClassname)}>
    <div className={classnames('gameStatus', viewClassname)}>
      <div className="currentStepNum">{state.currentStepNum > 0 ? `回合${state.currentStepNum}` : '未开始'}</div>
      <div className="tips">
        {state.customGameMaster && state.currentStepNum === 0 && (
          state.customGameMaster === state.account?._id ? '人齐即可点击开始' : '等待房主开始'
        )}
        {state.canNextStep && '先点绿色方块，再点确定'}
      </div>
    </div>
    <div className={classnames('players', viewClassname)}>

      <div className="self">
        <div className="player">
          <MyAvatar
            src={state.account?.avatar}
            size={48}
          />
          {state.currentStepNum > 0 && state.account && state.playersStatusMap && (
            <div className={classnames('moveStatus', { 'isMoved': state.myselfMoved })}>
              {(state.myselfMoved || state.playersStatusMap[state.account._id]?.move) ? '已走' : '未走'}
            </div>
          )}
        </div>
      </div>
      <div className={classnames('others', viewClassname)}>
        {Object.keys(state.playersInfoMap).map((playerId) => {
          return (
            state.account?._id === playerId ? null : <div className="player" key={playerId}>
              <Badge dot offset={[-6, 6]} color={state.playersStatusMap[playerId]?.online ? 'green' : 'red'}>
                <MyAvatar
                  src={state.playersInfoMap[playerId]?.avatar}
                  size={48}
                />
              </Badge>
              {state.currentStepNum > 0 && (
                <div className={classnames('moveStatus', { 'isMoved': state.playersStatusMap[playerId]?.move })}>{state.playersStatusMap[playerId]?.move ? '已走' : '未走'}</div>
              )}

            </div>
          )
        })}
      </div>

    </div>
    <div className={classnames('buttons', viewClassname)}>
      <Button
        type="primary"
        onClick={showRules}
      >规则</Button>
      {state.customGameMaster &&
        state.customGameMaster === state.account?._id &&
        state.currentStepNum === 0 ? (
        <Button
          type="primary"
          onClick={startGame}
          disabled={!canStartGame}
        >开始</Button>
      ) : null}
      {state.currentStepNum === 0 ? (
        <Button
          type="primary"
          onClick={copyGameDoor}
        >邀请</Button>
      ) : null}

      <Button
        type="primary"
        onClick={quitGame}
        className="prevSpace"
      >退出</Button>
    </div>
    <div className={classnames('boardWrap', viewClassname)}>
      <div
        className="boardGrids"
        style={{
          transform: `scale(${state.boardScale})`,
        }}>
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
    </div>


    <div className={classnames('buttons', viewClassname)}>
      <Button
        type="primary"
        onClick={voteNextStep}
        disabled={!canVoteNextStep}
      >拨轮</Button>

      <Button
        type="primary"
        onClick={VoteRestart}
        disabled={state.currentStepNum === 0}
      >重开</Button>

      <Button
        type="primary"
        onClick={submitMove}
        className="prevSpace"
        disabled={!state.canNextStep || !state.myNextPos}
      >确定</Button>

    </div>
  </div>
}

export default GameS4;