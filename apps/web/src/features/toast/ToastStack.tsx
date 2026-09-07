import { useEffect } from 'react';
import { toastActions, useAppDispatch, useAppSelector } from '../../app/store';
import { cx } from '../../shared/lib/cx';
import styles from './ToastStack.module.scss';

const AUTO_HIDE_MS = 6000;

export function ToastStack(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.toast.items);

  useEffect(() => {
    const timers = items.map((toast) =>
      window.setTimeout(() => dispatch(toastActions.hide(toast.id)), AUTO_HIDE_MS),
    );
    return () => {
      timers.forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
  }, [dispatch, items]);

  return (
    <div className={styles['stack']} role="status" aria-live="polite">
      {items.map((toast) => (
        <div key={toast.id} className={cx(styles['toast'], styles[toast.tone])}>
          <span>{toast.message}</span>
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => dispatch(toastActions.hide(toast.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
