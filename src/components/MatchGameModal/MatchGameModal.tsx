import React, { useEffect } from 'react';
import { useSingleInstanceVar, useSingleState } from 'nice-hooks';
import { Button, Modal } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import './MatchGameModal.less';

type MatchGameModalProps = {
  visible: boolean,
  onCancel: () => void,
};

type MatchGameModalInstanceVar = {
  interval: any,
  waitedSeconds: number,
}

const MatchGameModal: React.FC<MatchGameModalProps> = (props) => {
  const {
    visible,
    onCancel,
  } = props
  const instanceVar = useSingleInstanceVar<MatchGameModalInstanceVar>({
    interval: null,
    waitedSeconds: 0,
  })
  const [state, setState] = useSingleState({
    waitedSeconds: instanceVar.waitedSeconds
  })

  useEffect(() => {
    if (visible) {
      instanceVar.interval = setInterval(() => {
        instanceVar.waitedSeconds++;
        setState({ waitedSeconds: instanceVar.waitedSeconds })
      }, 1000)
    } else {
      instanceVar.waitedSeconds = 0;
      setState({ waitedSeconds: 0 })
      clearInterval(instanceVar.interval);
    }
    return () => {
      clearInterval(instanceVar.interval);
    }
  }, [visible])

  return <Modal
    visible={visible}
    maskClosable={false}
    destroyOnClose
    footer={<div>
      <Button
        type="primary"
        style={{ width: '100%' }}
        onClick={onCancel}
      >取消</Button>
    </div>}
    closable={false}
    className="MatchGameModal"
    width={300}
    centered
  >
    <div className="MatchGameModal_seconds">{state.waitedSeconds}</div>
    <div className="MatchGameModal_matching">
      <SyncOutlined spin />
      <span>匹配中</span>
    </div>
  </Modal>
}

export default MatchGameModal;