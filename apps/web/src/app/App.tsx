import { LANGUAGES, extensionOf, languageById } from '@av/config';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createFile } from '../entities/file';
import { loadWorkspace, saveWorkspace } from '../entities/workspace';
import { CodeEditor } from '../features/editor/CodeEditor';
import { TabBar } from '../features/editor/TabBar';
import { PlayerBar } from '../features/player/PlayerBar';
import { usePlayer } from '../features/player/usePlayer';
import { ToastStack } from '../features/toast/ToastStack';
import { Visualizer } from '../features/visualizer/Visualizer';
import { ShortcutsDialog } from '../features/shortcuts/ShortcutsDialog';
import { hasSeenTour, startTour } from '../features/tour/tour';
import { useGlobalShortcuts } from '../features/shortcuts/useGlobalShortcuts';
import { ResizableSplit } from '../features/workspace/ResizableSplit';
import styles from './App.module.scss';
import { currentActions, envActions, toastActions, useAppDispatch, useAppSelector } from './store';

/** Ten file mac dinh cho mot ngon ngu, vi du `js` -> `code.js`. */
function defaultFileName(ext: string): string {
  return (
    languageById(LANGUAGES.find((l) => l.ext === ext)?.id ?? '')?.mainFileName ?? `code.${ext}`
  );
}

export function App(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const controls = usePlayer();
  const { files, editingFileName } = useAppSelector((state) => state.current);
  const ext = useAppSelector((state) => state.env.ext);
  const plainMode = useAppSelector((state) => state.env.plainMode);
  const theme = useAppSelector((state) => state.env.theme);
  const { status, errorMessage, userOutput, lineNumber } = useAppSelector((state) => state.player);

  const [restored, setRestored] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const showShortcuts = useCallback(() => {
    setShortcutsOpen(true);
  }, []);
  useGlobalShortcuts({ controls, onShowShortcuts: showShortcuts });

  /**
   * StrictMode ở bản dev dựng rồi huỷ rồi dựng lại effect. Không có chốt này thì lượt thứ hai
   * tạo thêm một file rỗng nữa — mở app lên thấy hai tab thay vì một.
   */
  const bootstrapped = useRef(false);

  // Khoi phuc phien truoc, hoac mo mot file trong theo ngon ngu dang chon
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const saved = loadWorkspace();
    if (saved !== undefined && saved.files.length > 0) {
      dispatch(
        currentActions.restore({
          files: saved.files.map((file) => ({ ...file })),
          editingFileName: saved.editingFileName ?? saved.files[0]?.name,
        }),
      );
    } else {
      dispatch(currentActions.addFile(createFile(defaultFileName(ext), '')));
    }
    setRestored(true);
    // Chi chay mot lan luc mo app
    // eslint-disable-next-line react-hooks/exhaustive-deps -- co y bo `ext`
  }, [dispatch]);

  /**
   * Ghi xuong localStorage sau khi ngung go 400ms.
   *
   * Ghi ngay moi lan go phim la ep JSON.stringify chay tren toan bo file sau moi ky tu.
   * `restored` chan luot ghi dau tien: chua khoi phuc xong ma da ghi thi state rong
   * de len mat phien truoc.
   */
  useEffect(() => {
    if (!restored) return;
    const timer = window.setTimeout(() => {
      saveWorkspace({ files, editingFileName });
    }, 400);
    return () => {
      window.clearTimeout(timer);
    };
  }, [editingFileName, files, restored]);

  /**
   * Mỗi ngôn ngữ một tab riêng. Đổi dropdown là chuyển tab, KHÔNG mang code sang.
   *
   * Ứng dụng không dịch được code giữa các ngôn ngữ, nên mang nội dung theo chỉ tạo ra
   * file `.py` chứa code Java — trông như app hiểu việc chuyển đổi trong khi không hề.
   * Tab riêng thì bản Java của người dùng nằm nguyên một chỗ, quay lại lúc nào cũng còn.
   *
   * Ngoại lệ duy nhất: file đang mở còn RỖNG thì đổi tên tại chỗ, vì không có gì để mất
   * và giữ cho người mới mở app không ôm một đống tab trống.
   */
  const previousExt = useRef(ext);
  useEffect(() => {
    if (previousExt.current === ext) return;
    previousExt.current = ext;

    const existing = files.find((file) => extensionOf(file.name) === ext);
    if (existing !== undefined) {
      dispatch(currentActions.setEditingFile(existing.name));
      return;
    }

    const name = defaultFileName(ext);
    const active = files.find((file) => file.name === editingFileName);
    if (active?.content.trim() === '') {
      dispatch(currentActions.renameFile({ name: active.name, newName: name }));
      dispatch(currentActions.setEditingFile(name));
      return;
    }
    dispatch(currentActions.addFile(createFile(name, '')));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- co y bo `files` va `editingFileName`
  }, [dispatch, ext]);

  useEffect(() => {
    document.title = 'Algorithm Visualizer';
  }, []);

  /**
   * Tour lần đầu. Chờ `restored` để tab và editor đã có trên trang — driver.js neo vào
   * phần tử thật, chạy sớm thì nửa số bước không tìm thấy gì.
   */
  useEffect(() => {
    if (!restored || hasSeenTour()) return;
    const timer = window.setTimeout(() => void startTour(), 600);
    return () => {
      window.clearTimeout(timer);
    };
  }, [restored]);

  // Đặt trên <html> chứ không trên #root: nền của body và cả hộp thoại dựng ngoài cây
  // React đều phải đọc được biến màu
  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);

  const editingFile = files.find((file) => file.name === editingFileName);

  const addFile = (): void => {
    // Ten file moi tang dan khi trung — ngam #21
    const base = defaultFileName(ext);
    const dot = base.lastIndexOf('.');
    const stem = base.slice(0, dot);
    const suffix = base.slice(dot);

    let name = base;
    let count = 0;
    while (files.some((file) => file.name === name)) {
      count += 1;
      name = `${stem}-${String(count)}${suffix}`;
    }
    dispatch(currentActions.addFile(createFile(name, '')));
  };

  return (
    <div className={styles['app']}>
      <header className={styles['header']}>
        <span className={styles['titleBar']}>Algorithm Visualizer</span>

        <label className={styles['language']} data-tour="language">
          Ngôn ngữ
          <select
            value={ext}
            onChange={(event) => {
              dispatch(envActions.setExt(event.target.value));
            }}
          >
            {LANGUAGES.map((language) => (
              <option key={language.id} value={language.ext}>
                {language.name}
              </option>
            ))}
          </select>
        </label>

        <label
          className={styles['plainToggle']}
          data-tour="plain"
          title="Code không cần gọi tracer; hệ thống tự suy ra cách vẽ"
        >
          <input
            type="checkbox"
            checked={plainMode}
            onChange={(event) => {
              dispatch(envActions.setPlainMode(event.target.checked));
            }}
          />
          Tự trực quan hóa
        </label>

        <PlayerBar controls={controls} />

        <button
          type="button"
          className={styles['themeToggle']}
          onClick={() => dispatch(envActions.toggleTheme())}
          title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          aria-pressed={theme === 'light'}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
        </button>

        <button
          type="button"
          className={styles['shortcuts']}
          onClick={() => void startTour()}
          title="Xem lại hướng dẫn sử dụng"
        >
          Hướng dẫn
        </button>

        <button
          type="button"
          className={styles['shortcuts']}
          onClick={showShortcuts}
          title="Phím tắt (Ctrl+Alt+K)"
        >
          Phím tắt
        </button>
      </header>

      <ResizableSplit direction="horizontal" weights={[1, 1]}>
        <div className={styles['middle']} data-tour="visualizer">
          <Visualizer />
          {status === 'error' && errorMessage !== undefined ? (
            <pre className={styles['buildError']}>{errorMessage}</pre>
          ) : null}
          {userOutput !== '' ? (
            <details className={styles['output']}>
              <summary>Output của chương trình</summary>
              <pre>{userOutput}</pre>
            </details>
          ) : null}
        </div>

        <div className={styles['right']} data-tour="editor">
          <TabBar
            files={files}
            activeName={editingFileName}
            onSelect={(name) => dispatch(currentActions.setEditingFile(name))}
            onAdd={addFile}
            onDelete={(name) => dispatch(currentActions.deleteFile(name))}
          />
          {editingFile ? (
            <CodeEditor
              fileName={editingFile.name}
              value={editingFile.content}
              lineNumber={lineNumber}
              onChange={(content) => {
                dispatch(currentActions.modifyFile({ name: editingFile.name, content }));
              }}
              onRun={controls.build}
              onMessage={(text) => dispatch(toastActions.show('error', text))}
              onShowShortcuts={showShortcuts}
              theme={theme}
            />
          ) : (
            <p className={styles['empty']}>Chưa có file nào đang mở. Bấm + để tạo file mới.</p>
          )}
        </div>
      </ResizableSplit>

      {shortcutsOpen ? (
        <ShortcutsDialog
          onClose={() => {
            setShortcutsOpen(false);
          }}
        />
      ) : null}

      <ToastStack />
    </div>
  );
}
