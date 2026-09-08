import { useEffect, useRef } from 'react';
import { useAppSelector } from '../../app/store';
import type { PlayerControls } from '../player/usePlayer';

interface Options {
  readonly controls: PlayerControls;
  readonly onShowShortcuts: () => void;
}

/** Ô đang nhận chữ: Monaco (textarea), ô nhập, dropdown. Phím ở đây thuộc về người gõ. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Space và Enter trên nút đã có sẵn nghĩa "bấm nút" của trình duyệt. Bắt thêm ở đây là
 * chạy hai lần — đúng lỗi của bản cũ: bấm Space khi nút Dừng đang có focus thì play/pause
 * bị lật hai lượt và màn hình như không có gì xảy ra.
 */
function isActivatable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'BUTTON' || target.tagName === 'A';
}

/**
 * Phím tắt của trình phát nghe ở cấp window — PLAN.md §2.4.7 đòi điều khiển được toàn bộ
 * Player bằng bàn phím, mà thanh player thì hiếm khi đang giữ focus.
 */
export function useGlobalShortcuts({ controls, onShowShortcuts }: Options): void {
  const { playing, chunkCount } = useAppSelector((state) => state.player);

  // `controls` la object moi sau moi lan render; qua ref thi listener chi gan lai khi
  // trang thai player doi thuc su
  const controlsRef = useRef(controls);
  controlsRef.current = controls;
  const showRef = useRef(onShowShortcuts);
  showRef.current = onShowShortcuts;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return;
      const mod = event.ctrlKey || event.metaKey;

      // Bảng phím tắt mở được từ mọi nơi, kể cả khi đang gõ code — nó không cướp phím nào
      // của việc soạn thảo. Trong editor thì action `av.shortcuts` của Monaco lo trước.
      if (mod && event.altKey && event.code === 'KeyK') {
        event.preventDefault();
        showRef.current();
        return;
      }

      if (isTyping(event.target)) return;

      if (mod && event.key === 'Enter') {
        event.preventDefault();
        controlsRef.current.build();
        return;
      }
      if (mod || event.altKey || event.shiftKey) return;

      switch (event.key) {
        case ' ':
          if (isActivatable(event.target)) return;
          event.preventDefault();
          if (playing) controlsRef.current.pause();
          else controlsRef.current.play();
          return;
        case 'ArrowLeft':
          event.preventDefault();
          controlsRef.current.prev();
          return;
        case 'ArrowRight':
          event.preventDefault();
          controlsRef.current.next();
          return;
        case 'Home':
          event.preventDefault();
          controlsRef.current.seek(1);
          return;
        case 'End':
          event.preventDefault();
          controlsRef.current.seek(chunkCount);
          return;
        default:
          return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [chunkCount, playing]);
}
