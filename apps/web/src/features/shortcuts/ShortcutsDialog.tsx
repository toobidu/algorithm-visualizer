import { useEffect, useRef } from 'react';
import { SHORTCUT_GROUPS, keyLabel } from './shortcuts';
import styles from './ShortcutsDialog.module.scss';

interface Props {
  readonly onClose: () => void;
}

export function ShortcutsDialog({ onClose }: Props): React.JSX.Element {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();

    // Nghe ở cấp window chứ không phải trên bảng: người dùng có thể Tab ra ngoài,
    // và Escape vẫn phải đóng được
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className={styles['backdrop']}
      onMouseDown={(event) => {
        // Chỉ đóng khi bấm đúng nền: bấm rồi kéo chuột từ trong bảng ra ngoài
        // vẫn kết thúc bằng một sự kiện trên nền, và người dùng mất bảng oan
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={styles['panel']}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <header className={styles['head']}>
          <h2 id="shortcuts-title">Phím tắt</h2>
          <button type="button" ref={closeRef} aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </header>

        <div className={styles['groups']}>
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <dl>
                {group.items.map((item) => (
                  <div key={item.what} className={styles['row']}>
                    <dt>
                      {item.keys.map((key) => (
                        <kbd key={key}>{keyLabel(key)}</kbd>
                      ))}
                    </dt>
                    <dd>
                      {item.what}
                      {item.hint === undefined ? null : (
                        <span className={styles['hint']}>{item.hint}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
