// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { StrictMode, useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { currentActions, store } from '../../app/store';
import { createFile } from '../../entities/file';
import { usePlayer } from './usePlayer';

/**
 * Tái hiện lỗi "bấm Run thì nháy Đang chạy" — PLAN.md §5.9 đòi test phải bắt được
 * lỗi thật chứ không chỉ chứng minh code chạy.
 *
 * Đếm số lần một lượt build được khởi động. Một lần bấm Run chỉ được sinh ra một lượt.
 */
let buildStarts = 0;

function Harness(): React.JSX.Element {
  const controls = usePlayer();
  const status = store.getState().player.status;
  const previous = useRef(status);

  useEffect(() => {
    if (previous.current !== 'building' && status === 'building') buildStarts += 1;
    previous.current = status;
  });

  return (
    <button type="button" onClick={controls.build}>
      Run
    </button>
  );
}

const CODE = [
  "const t = new Array1DTracer('A');",
  'Layout.setRoot(t);',
  't.set([3, 1, 2]);',
  'Tracer.delay();',
].join('\n');

describe('usePlayer — không được build lặp', () => {
  beforeEach(() => {
    buildStarts = 0;
    // Worker không có trong jsdom; giả lập bằng một worker trả kết quả ngay.
    vi.stubGlobal(
      'Worker',
      class {
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: ErrorEvent) => void) | null = null;
        postMessage(): void {
          queueMicrotask(() => {
            this.onmessage?.({
              data: {
                ok: true,
                commands: [
                  { key: 'a', method: 'Array1DTracer', args: ['A'] },
                  { key: null, method: 'setRoot', args: ['a'] },
                  { key: 'a', method: 'set', args: [[3, 1, 2]] },
                  { key: null, method: 'delay', args: [3] },
                ],
                error: undefined,
              },
            } as MessageEvent);
          });
        }
        terminate(): void {
          // không cần dọn gì trong bản giả lập
        }
      },
    );
    store.dispatch(
      currentActions.restore({
        files: [createFile('code.js', CODE)],
        editingFileName: undefined,
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('mở một file chỉ sinh ra đúng một lượt build', async () => {
    render(
      <Provider store={store}>
        <Harness />
      </Provider>,
    );

    await act(async () => {
      store.dispatch(currentActions.setEditingFile('code.js'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(store.getState().player.status).toBe('ready');
    });

    // Chờ thêm vài vòng render để lộ vòng lặp nếu có
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    expect(buildStarts).toBe(1);
    expect(store.getState().player.status).toBe('ready');
  });

  it('trạng thái dừng hẳn ở ready, không quay lại building', async () => {
    render(
      <Provider store={store}>
        <Harness />
      </Provider>,
    );

    await act(async () => {
      store.dispatch(currentActions.setEditingFile('code.js'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(store.getState().player.status).toBe('ready');
    });

    const seen: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
      });
      seen.push(store.getState().player.status);
    }

    expect(seen.every((status) => status === 'ready')).toBe(true);
  });

  it('mount trong StrictMode chỉ sinh ra một lượt build', async () => {
    render(
      <StrictMode>
        <Provider store={store}>
          <Harness />
        </Provider>
      </StrictMode>,
    );

    await act(async () => {
      store.dispatch(currentActions.setEditingFile('code.js'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(store.getState().player.status).toBe('ready');
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    // React 19 goi effect hai lan khi mount o StrictMode; khoa chong chay chong
    // phai giu cho chi mot luot build duoc khoi dong
    expect(buildStarts).toBe(1);
  });

  it('bấm Run nhiều lần liên tiếp lần nào cũng chạy', async () => {
    const view = render(
      <Provider store={store}>
        <Harness />
      </Provider>,
    );

    await act(async () => {
      store.dispatch(currentActions.setEditingFile('code.js'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(store.getState().player.status).toBe('ready');
    });

    const runButton = view.getByRole('button', { name: 'Run' });
    const before = buildStarts;

    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        runButton.click();
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }

    // Khong duoc dung bat ky khoa nao lam nut Run chet sau lan bam dau tien
    expect(buildStarts).toBe(before + 3);
    expect(store.getState().player.status).toBe('ready');
  });

  it('Run vẫn chạy được sau khi một lượt build lỗi', async () => {
    vi.stubGlobal(
      'Worker',
      class {
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: ErrorEvent) => void) | null = null;
        postMessage(): void {
          queueMicrotask(() => {
            this.onmessage?.({
              data: { ok: false, commands: [], error: 'loi gia lap' },
            } as MessageEvent);
          });
        }
        terminate(): void {
          // ban gia lap khong can don gi
        }
      },
    );

    const view = render(
      <Provider store={store}>
        <Harness />
      </Provider>,
    );

    await act(async () => {
      store.dispatch(currentActions.setEditingFile('code.js'));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(store.getState().player.status).toBe('error');
    });

    const before = buildStarts;
    await act(async () => {
      view.getByRole('button', { name: 'Run' }).click();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(buildStarts).toBe(before + 1);
  });
});
