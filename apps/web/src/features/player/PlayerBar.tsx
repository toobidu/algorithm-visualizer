import { envActions, useAppDispatch, useAppSelector } from '../../app/store';
import type { PlayerControls } from './usePlayer';
import styles from './PlayerBar.module.scss';

export function PlayerBar({ controls }: { controls: PlayerControls }): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { cursor, chunkCount, playing, speed, status } = useAppSelector((state) => state.player);
  const motion = useAppSelector((state) => state.env.motion);
  const building = status === 'building';
  const canPrev = cursor > 1;
  const canNext = cursor < chunkCount;

  return (
    // Phím tắt của trình phát nghe ở cấp window trong `useGlobalShortcuts`: gắn ở đây thì
    // chỉ chạy khi thanh này đang giữ focus, và còn đá nhau với hành vi sẵn có của nút
    // và thanh trượt (Space vừa bấm nút vừa lật play/pause).
    <div className={styles['bar']}>
      <button
        type="button"
        className={styles['primary']}
        data-tour="run"
        onClick={controls.build}
        disabled={building}
      >
        {building ? 'Đang chạy…' : 'Chạy'}
      </button>

      <button
        type="button"
        onClick={playing ? controls.pause : controls.play}
        disabled={chunkCount === 0}
        aria-label={playing ? 'Tạm dừng' : 'Phát'}
      >
        {playing ? 'Dừng' : 'Bắt đầu'}
      </button>

      <button type="button" onClick={controls.prev} disabled={!canPrev} aria-label="Bước lùi">
        ‹
      </button>

      <input
        className={styles['progress']}
        data-tour="progress"
        type="range"
        min={0}
        max={Math.max(0, chunkCount)}
        value={cursor}
        aria-label="Tiến độ"
        onChange={(event) => {
          controls.seek(Number(event.target.value));
        }}
      />

      <button type="button" onClick={controls.next} disabled={!canNext} aria-label="Bước tới">
        ›
      </button>

      <span className={styles['counter']}>
        {cursor} / {chunkCount}
      </span>

      <label className={styles['motion']}>
        Hiệu ứng
        <select
          value={motion}
          aria-label="Độ biểu cảm của hoạt cảnh"
          onChange={(event) => {
            dispatch(envActions.setMotion(event.target.value as 'off' | 'motion' | 'claw'));
          }}
        >
          <option value="off">Gọn</option>
          <option value="motion">Chuyển động</option>
          <option value="claw">Cánh tay gắp</option>
        </select>
      </label>

      <label className={styles['speed']}>
        Tốc độ
        <input
          type="range"
          min={0}
          max={4}
          step={0.5}
          value={speed}
          aria-label="Tốc độ phát"
          onChange={(event) => {
            controls.setSpeed(Number(event.target.value));
          }}
        />
      </label>
    </div>
  );
}
