import { useEffect, useRef, useState } from 'react';
import styles from './Claw.module.scss';

export interface ClawTarget {
  /** Toạ độ tâm hai ô, tính theo hệ toạ độ của khung chứa */
  readonly leftX: number;
  readonly rightX: number;
  readonly topY: number;
  /** Kích thước một ô, để càng gắp co giãn theo bảng thay vì luôn bé tí */
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly durationMs: number;
  /** Đổi mỗi lần có cú gắp mới, để React dựng lại hoạt cảnh thay vì bỏ qua */
  readonly seq: number;
}

/**
 * Cánh tay gắp — lớp da của sự kiện `swap`, xem docs/y-tuong-hoat-canh.md.
 *
 * Chỉ là trang trí: nó vẽ đè lên bảng, và toàn bộ thông tin thật vẫn nằm ở ô. Tắt hoạt cảnh
 * đi thì không mất gì cả — đó là điều kiện để nó được phép tồn tại.
 *
 * `pointer-events: none` ở CSS: tay không được nuốt cú bấm của người dùng.
 */
export function Claw({ target }: { target: ClawTarget | undefined }): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const seqRef = useRef(-1);

  useEffect(() => {
    if (target === undefined || target.seq === seqRef.current) return;
    seqRef.current = target.seq;
    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, target.durationMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [target]);

  if (target === undefined || !visible) return null;

  const { leftX, rightX, topY, cellWidth, cellHeight, durationMs, seq } = target;
  const span = Math.abs(rightX - leftX);
  const midX = (leftX + rightX) / 2;

  // Thanh ngang treo PHÍA TRÊN ô, càng thò xuống ôm lấy hai bên — không đè lên con số
  const beamY = Math.max(2, topY - 10);
  const jawWidth = Math.max(6, cellWidth * 0.42);
  const jawDrop = topY - beamY + cellHeight * 0.55;

  return (
    <svg
      key={seq}
      className={styles['claw']}
      style={{ ['--claw-duration' as string]: `${String(durationMs)}ms` }}
      aria-hidden="true"
    >
      {/*
        Hai lớp `g` lồng nhau, không gộp làm một được: keyframe của `rig` đặt `transform`,
        mà `transform` thì ghi đè toàn bộ chứ không cộng dồn — để chung là mất luôn vị trí
        ngang và cả cánh tay dán vào mép trái.
      */}
      <g style={{ transform: `translate(${String(midX)}px, 0)` }}>
        <g className={styles['rig']}>
          {/* Trục dọc: hạ xuống rồi rút lên */}
          <line className={styles['mast']} x1={0} y1={0} x2={0} y2={beamY} />
          {/* Thanh ngang nối hai càng */}
          <line className={styles['beam']} x1={-span / 2} y1={beamY} x2={span / 2} y2={beamY} />
          <Grip x={-span / 2} y={beamY} width={jawWidth} drop={jawDrop} side="left" />
          <Grip x={span / 2} y={beamY} width={jawWidth} drop={jawDrop} side="right" />
        </g>
      </g>
    </svg>
  );
}

function Grip({
  x,
  y,
  width,
  drop,
  side,
}: {
  x: number;
  y: number;
  width: number;
  drop: number;
  side: 'left' | 'right';
}): React.JSX.Element {
  const tip = drop * 0.72;
  return (
    <g
      className={`${styles['grip'] ?? ''} ${styles[side] ?? ''}`}
      style={{ transform: `translate(${String(x)}px, ${String(y)}px)` }}
    >
      <path
        className={styles['jaw']}
        d={`M ${String(-width)} 0 L ${String(-width)} ${String(tip)} L ${String(-width * 0.45)} ${String(drop)}`}
      />
      <path
        className={styles['jaw']}
        d={`M ${String(width)} 0 L ${String(width)} ${String(tip)} L ${String(width * 0.45)} ${String(drop)}`}
      />
    </g>
  );
}
