import type { PendingPatch } from '@/services/projectFs';
import { Modal, Button } from 'antd';
import { FC } from 'react';

interface Props {
  patch: PendingPatch | null;
  onResolve: (approved: boolean) => void;
}

const PatchApproveModal: FC<Props> = ({ patch, onResolve }) => {
  return (
    <Modal
      open={!!patch}
      title={`Apply changes to ${patch?.relativePath}`}
      onCancel={() => { onResolve(false); }}
      footer={[
        <Button key="reject" onClick={() => { onResolve(false); }}>
          Reject
        </Button>,
        <Button key="approve" type="primary" onClick={() => { onResolve(true); }}>
          Apply
        </Button>,
      ]}
      width={720}
    >
      {patch && (
        <pre
          style={{
            maxHeight: 400,
            overflow: 'auto',
            fontSize: 11,
            whiteSpace: 'pre-wrap',
          }}
        >
          {patch.newContent.slice(0, 12000)}
          {patch.newContent.length > 12000 ? '\n... (truncated)' : ''}
        </pre>
      )}
    </Modal>
  );
};

export default PatchApproveModal;
