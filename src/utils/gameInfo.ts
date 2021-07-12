
export const gameInfoMap: {
  [key in GameType]: GameInfo
} = {
  s4p2: {
    type: 's4p2',
    name: '方格2人战',
    playersNum: 2,
    sizeX: 9,
    sizeY: 9,
  },
  s4p4: {
    type: 's4p4',
    name: '方格4人战',
    playersNum: 4,
    sizeX: 15,
    sizeY: 15,
  },
  s4p8: {
    type: 's4p8',
    name: '方格8人战',
    playersNum: 8,
    sizeX: 19,
    sizeY: 19,
  },
};

export const gameInfos = Object.values(gameInfoMap)

export function getGameInfo(gameType: GameType): GameInfo {
  return gameInfoMap[gameType] as GameInfo;
}