import { buildScene } from '@av/viz-core';
import { useRef, useSyncExternalStore } from 'react';
import { intervalFromSpeed, useAppSelector } from '../../app/store';
import { getEngine } from '../player/usePlayer';
import type { MotionLevel } from './animate';
import { SceneView } from './SceneView';
import styles from './Visualizer.module.scss';

/**
 * Ba hàm dưới đây phải ổn định giữa các lần render.
 *
 * Truyền hàm mới mỗi lần render khiến React huỷ rồi đăng ký lại subscription sau MỌI
 * lần render — vừa tốn kém vừa gây nhấp nháy.
 */
const subscribeToEngine = (listener: () => void): (() => void) => getEngine().subscribe(listener);
const readEngineVersion = (): number => getEngine().getVersion();
const readZeroOnServer = (): number => 0;

/**
 * Trần độ dài trace cho từng mức biểu cảm.
 *
 * Cánh tay gắp mất tới 700ms một lần; trace vài trăm khung mà giữ nguyên mức đó thì xem hết
 * mất hàng phút. Tự hạ mức thay vì để người dùng tự phát hiện ra mình chọn sai.
 */
const CLAW_MAX_FRAMES = 200;
const MOTION_MAX_FRAMES = 2000;

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Mức biểu cảm THỰC SỰ dùng, sau khi trừ đi mọi lý do phải hạ xuống.
 *
 * `jumped` là điều kiện đúng đắn chứ không phải tối ưu: kéo thanh tua từ khung 5 sang khung
 * 300 thì trạng thái nhảy cóc, hoạt cảnh "bay từ ô này sang ô kia" sẽ mô tả một chuyện chưa
 * từng xảy ra.
 */
function effectiveMotion(chosen: MotionLevel, chunkCount: number, jumped: boolean): MotionLevel {
  if (chosen === 'off' || jumped || prefersReducedMotion()) return 'off';
  if (chosen === 'claw' && chunkCount > CLAW_MAX_FRAMES) return 'motion';
  if (chunkCount > MOTION_MAX_FRAMES) return 'off';
  return chosen;
}

/**
 * Cầu nối giữa `viz-core` và React — ngầm #14 và #33.
 *
 * Engine giữ trạng thái mutable ở ngoài React để đạt tốc độ; React nghe thay đổi qua
 * `useSyncExternalStore` nên vẫn đúng chuẩn React 19 và không vỡ ở StrictMode.
 */
export function Visualizer(): React.JSX.Element {
  const engine = getEngine();
  const chosen = useAppSelector((state) => state.env.motion);
  const speed = useAppSelector((state) => state.player.speed);
  const playing = useAppSelector((state) => state.player.playing);
  const chunkCount = useAppSelector((state) => state.player.chunkCount);

  // Chỉ cần đăng ký để được render lại; giá trị trả về không dùng tới.
  // Component này không có nguồn trạng thái nào khác nên không cần ghi nhớ cảnh.
  useSyncExternalStore(subscribeToEngine, readEngineVersion, readZeroOnServer);

  const previousCursor = useRef(engine.cursor);
  const jumped = Math.abs(engine.cursor - previousCursor.current) > 1;
  previousCursor.current = engine.cursor;

  const scene = buildScene(engine.root, (key) => engine.objectAt(key));
  const motion = effectiveMotion(chosen, chunkCount, jumped);

  /**
   * Trần thời lượng chỉ có ý nghĩa KHI ĐANG PHÁT: lúc đó hoạt cảnh dài hơn nhịp giữa hai
   * khung sẽ chồng lên nhau. Người dùng bấm từng bước thì không có nhịp nào để bám,
   * cứ cho chạy hết — không thì kéo thanh tốc độ lên cao là bấm từng bước cũng không kịp nhìn.
   */
  const budgetMs = playing ? intervalFromSpeed(speed) * 0.85 : Number.POSITIVE_INFINITY;

  return (
    <div className={styles['visualizer']}>
      <SceneView scene={scene} motion={motion} budgetMs={budgetMs} />
    </div>
  );
}
