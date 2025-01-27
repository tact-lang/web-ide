import { Filter } from '@/components/workspace/BottomPanel/BottomPanel';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { LogEntry, LogType } from '@/interfaces/log.interface';
import EventEmitter from '@/utility/eventEmitter';
import { delay } from '@/utility/utils';
import { SearchAddon } from '@xterm/addon-search';
import { useEffect, useState } from 'react';

const useLogFilter = (
  filter: Filter,
  printLog: (data: LogEntry) => void,
  searchAddon: SearchAddon | null,
) => {
  const { getLog } = useLogActivity();
  const [filterType, setFilterType] = useState<LogType | 'all'>('all');

  useEffect(() => {
    const updateLogs = async () => {
      let logs: LogEntry[] = [];
      if (filter.type !== filterType) {
        setFilterType(filter.type);
        EventEmitter.emit('LOG_CLEAR');

        logs =
          filter.type === 'all' ? getLog(null) : getLog({ type: filter.type });

        logs.forEach(printLog);
      }
      if (!searchAddon) {
        return;
      }
      if (logs.length !== 0) {
        // Wait for log rendering
        await delay(500);
      }
      searchAddon.findNext(filter.text);
    };

    updateLogs().catch((error) => {
      console.error('Error updating logs:', error);
    });
  }, [filter]);
};

export default useLogFilter;
