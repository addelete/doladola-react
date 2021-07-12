import React, { useState } from 'react';
import { Modal, Radio } from 'antd';
import {} from 'nice-hooks';

type CustomGameModalProps = {
  visible: boolean,
  onOk: (gameType: string) => void,
  onCancel: () => void,
};

const CustomGameModal: React.FC<CustomGameModalProps> = ({
  visible,
  onOk,
  onCancel,
}) => {
  const [gameType, setGameType] = useState<string>('s4g9')
  return <Modal
    visible={visible}
    onOk={() => onOk(gameType)}
    onCancel={onCancel}
    title="自定义游戏"
  >
    <div style={{
      fontWeight: 500,
      marginBottom: 10,
      }}>棋盘布局</div>
    <Radio.Group
      value={gameType}
      onChange={e => setGameType(e.target.value)}
    >
      <Radio.Button value="s4g9">9x9</Radio.Button>
      <Radio.Button value="s4g15">15x15</Radio.Button>
      <Radio.Button value="s4g21">21x21</Radio.Button>
    </Radio.Group>
  </Modal>
}

export default CustomGameModal;