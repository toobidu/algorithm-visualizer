import { languageOfFile, runsInBrowser } from '@av/config';
import { toChunks } from '@av/protocol';
import { VizEngine } from '@av/viz-core';
import { useCallback, useEffect, useRef } from 'react';
import {
  currentActions,
  intervalFromSpeed,
  playerActions,
  toastActions,
  useAppDispatch,
  useAppSelector,
} from '../../app/store';
import { RunCancelled, runInWorker } from '../runner/runInWorker';
import { runOnGateway } from '../runner/runOnGateway';

/**
 * Engine sống ngoài React và ngoài Redux.
 *
 * `chunks` có thể lên hàng trăm nghìn phần tử; đưa vào store sẽ phá ngân sách §4.2.
 * Store chỉ giữ `cursor`, `chunkCount` và `lineNumber`.
 */
const engine = new VizEngine();

export function getEngine(): VizEngine {
  return engine;
}

export interface PlayerControls {
  readonly build: () => void;
  readonly play: () => void;
  readonly pause: () => void;
  readonly next: () => void;
  readonly prev: () => void;
  readonly seek: (cursor: number) => void;
  readonly setSpeed: (speed: number) => void;
}

export function usePlayer(): PlayerControls {
  const dispatch = useAppDispatch();
  const { files, editingFileName, shouldBuild } = useAppSelector((state) => state.current);
  const { playing, speed, cursor, chunkCount } = useAppSelector((state) => state.player);
  const plainMode = useAppSelector((state) => state.env.plainMode);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const syncCursor = useCallback(() => {
    dispatch(playerActions.setCursor({ cursor: engine.cursor, lineNumber: engine.lineNumber }));
  }, [dispatch]);

  const seek = useCallback(
    (target: number) => {
      engine.seek(target);
      syncCursor();
    },
    [syncCursor],
  );

  const pause = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    dispatch(playerActions.setPlaying(false));
  }, [dispatch]);

  const build = useCallback(() => {
    const file = files.find((f) => f.name === editingFileName);
    if (file === undefined) return;

    // Huỷ lượt đang chạy trước đó. Đây là cơ chế chống chạy chồng DUY NHẤT:
    // mọi khoá dựa trên cờ đều có nguy cơ kẹt vĩnh viễn nếu một nhánh quên mở khoá,
    // và khi đó nút Run chết hẳn.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    pause();
    dispatch(playerActions.buildStarted());

    const language = languageOfFile(file.name);
    const ext = /\.([^.]+)$/.exec(file.name)?.[1] ?? '';

    // File rỗng thì nói thẳng. Gửi đi thì runtime từng ngôn ngữ báo lỗi nội bộ của nó —
    // Java trả về "can't find main(String[]) method in class: Av", chẳng giúp gì người dùng.
    if (ext !== 'md' && file.content.trim() === '') {
      dispatch(playerActions.buildFailed(`File "${file.name}" đang trống — chưa có gì để chạy.`));
      return;
    }

    // Markdown và JSON xử lý ngay tại chỗ — ngầm #22
    if (ext === 'md') {
      const commands = [
        { key: 'md', method: 'MarkdownTracer', args: ['Markdown'] },
        { key: 'md', method: 'set', args: [file.content] },
        { key: null, method: 'setRoot', args: ['md'] },
      ];
      engine.load(toChunks(commands));
      engine.seek(engine.chunkCount);
      dispatch(playerActions.buildSucceeded({ chunkCount: engine.chunkCount, userOutput: '' }));
      syncCursor();
      return;
    }

    if (language === undefined) {
      dispatch(playerActions.buildFailed(`Không nhận ra ngôn ngữ của "${file.name}"`));
      return;
    }

    // JavaScript và TypeScript chạy thẳng trong trình duyệt. Chế độ dán code thuần
    // luôn đi qua gateway vì nó cần biến đổi mã nguồn hoặc hook lúc chạy.
    // JavaScript và TypeScript chạy thẳng trong trình duyệt ở CẢ HAI chế độ:
    // bộ chèn mã chạy được ngay trong worker nên không cần gọi ra ngoài.
    const run = runsInBrowser(language)
      ? runInWorker(file.content, controller.signal, plainMode)
      : runOnGateway(language.id, file.content, controller.signal, plainMode);

    run
      .then((result) => {
        engine.load(toChunks(result.commands));
        dispatch(
          playerActions.buildSucceeded({
            chunkCount: engine.chunkCount,
            userOutput: result.userOutput,
          }),
        );
        // Nhảy tới khung hình đầu ngay để không thấy màn hình trắng — ngầm #13
        engine.seek(1);
        syncCursor();
        if (result.warning !== undefined) {
          dispatch(toastActions.show('error', result.warning));
        }
      })
      .catch((error: unknown) => {
        // Lỗi do huỷ thì nuốt im lặng — ngầm #07
        if (error instanceof RunCancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        dispatch(playerActions.buildFailed(message));
        dispatch(toastActions.show('error', message));
      });
  }, [dispatch, editingFileName, files, pause, plainMode, syncCursor]);

  // Tự build khi đổi file hoặc đổi trang, và CHỈ khi shouldBuild bật — ngầm #05, #06
  useEffect(() => {
    if (!shouldBuild || editingFileName === undefined) return;
    dispatch(currentActions.buildConsumed());
    build();
  }, [build, dispatch, editingFileName, shouldBuild]);

  const next = useCallback(() => {
    if (engine.cursor >= chunkCount) return false;
    seek(engine.cursor + 1);
    return true;
  }, [chunkCount, seek]);

  const prev = useCallback(() => {
    if (engine.cursor <= 1) return;
    pause();
    seek(engine.cursor - 1);
  }, [pause, seek]);

  /**
   * Vòng phát — ngầm #12.
   *
   * Chạy hết trace thì DỪNG, không lặp lại. Bản cũ chỉ quay về đầu khi người dùng bấm Play
   * trong lúc đang ở cuối (`resume(true)`); các bước tự động sau đó dùng `resume()` với
   * `wrap = false` nên hết là dừng hẳn.
   */
  useEffect(() => {
    if (!playing) return;
    const tick = (): void => {
      if (engine.cursor >= chunkCount) {
        dispatch(playerActions.setPlaying(false));
        return;
      }
      seek(engine.cursor + 1);
      if (engine.cursor >= chunkCount) {
        dispatch(playerActions.setPlaying(false));
        return;
      }
      timerRef.current = window.setTimeout(tick, intervalFromSpeed(speed));
    };
    timerRef.current = window.setTimeout(tick, intervalFromSpeed(speed));
    return () => {
      window.clearTimeout(timerRef.current);
    };
  }, [chunkCount, dispatch, playing, seek, speed]);

  /** Bấm Play khi đang ở cuối thì quay về đầu — đây là lần lặp DUY NHẤT. */
  const play = useCallback(() => {
    if (chunkCount === 0) return;
    if (cursor >= chunkCount) seek(1);
    dispatch(playerActions.setPlaying(true));
  }, [chunkCount, cursor, dispatch, seek]);

  return {
    build,
    play,
    pause,
    next: () => void next(),
    prev,
    seek: (target: number) => {
      pause();
      seek(target);
    },
    setSpeed: (value: number) => dispatch(playerActions.setSpeed(value)),
  };
}
