declare module '*.css';
declare module '*.less';
declare module '*.png';
declare module '*.gif';
declare module '*.jpg';
declare module '*.svg' {
  export function ReactComponent(
    props: React.SVGProps<SVGSVGElement>,
  ): React.ReactElement;
  const url: string;
  export default url;
}

declare var APP_SIGN: string;
declare var SOCKET_URI: string;

declare type UserType = {
  _id: string,
  nickname: string,
  avatar: string,
}

declare type GameType = 's4p2' | 's4p4' | 's4p8';
declare type GameInfo = {
  name: string,
  type: GameType,
  playersNum: number,
  sizeX: number,
  sizeY: number,
}
