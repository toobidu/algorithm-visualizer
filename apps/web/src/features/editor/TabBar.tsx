import type { SourceFile } from '../../entities/file';
import { cx } from '../../shared/lib/cx';
import styles from './TabBar.module.scss';

interface Props {
  readonly files: readonly SourceFile[];
  readonly activeName: string | undefined;
  readonly onSelect: (name: string) => void;
  readonly onAdd: () => void;
  readonly onDelete: (name: string) => void;
}

export function TabBar({ files, activeName, onSelect, onAdd, onDelete }: Props): React.JSX.Element {
  return (
    <div className={styles['tabs']} role="tablist">
      {files.map((file) => (
        <div
          key={file.name}
          className={cx(styles['tab'], file.name === activeName && styles['active'])}
        >
          <button
            type="button"
            role="tab"
            aria-selected={file.name === activeName}
            onClick={() => {
              onSelect(file.name);
            }}
          >
            {file.name}
          </button>
          <button
            type="button"
            className={styles['close']}
            aria-label={`Xóa ${file.name}`}
            onClick={() => {
              onDelete(file.name);
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className={styles['add']} onClick={onAdd} aria-label="Thêm file">
        +
      </button>
    </div>
  );
}
