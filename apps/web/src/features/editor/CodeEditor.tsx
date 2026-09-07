import { LANGUAGES, languageOfFile } from '@av/config';
import { displayName, hasFormatter } from './format';
import {
  monaco,
  registerCommentFolding,
  registerFormatters,
  setFormatErrorSink,
} from './monacoSetup';
import { useEffect, useRef } from 'react';
import styles from './CodeEditor.module.scss';

interface Props {
  readonly fileName: string;
  readonly value: string;
  readonly lineNumber: number | undefined;
  readonly onChange: (value: string) => void;
  readonly onRun: () => void;
  readonly onMessage: (text: string) => void;
  readonly onShowShortcuts: () => void;
  readonly theme: 'dark' | 'light';
}

/** Mode cho file khong phai ngon ngu lap trinh. */
const EXTRA_MODES: Record<string, string> = { md: 'markdown', json: 'json' };

// Đăng ký một lần cho mọi ngôn ngữ, ngay lúc nạp module: provider phải có mặt
// trước khi Monaco tính vùng gấp lần đầu.
for (const language of LANGUAGES) {
  registerCommentFolding(language.monacoId, language.commentPrefix);
}
registerFormatters();

/**
 * Từ gấp khối code trực quan hóa — sửa loi ngầm #17.
 *
 * Bản cũ hardcode regex `^\s*\/\/.+{\s*$` nên chỉ hoat đóng với ngôn ngữ dùng `//`.
 * Bay gio ký hiệu comment lấy từ `config/languages`, nên Python (`#`), Erlang (`%`)
 * và Racket (`;`) đều gap được.
 */
async function foldVisualizeBlocks(
  editor: monaco.editor.IStandaloneCodeEditor,
  prefix: string,
): Promise<void> {
  const model = editor.getModel();
  if (model === null) return;

  /**
   * Dòng mở khối: bắt đầu bằng ký hiệu comment của ngôn ngữ và kết thúc bằng `{`.
   *
   * Dùng phép so chuỗi chứ không dùng regex: ký hiệu comment thay đổi theo ngôn ngữ
   * (`#`, `%`, `;`, `//`) nên phải escape động, và một dấu escape sai thì tính năng
   * chết lặng chứ không báo lỗi.
   */
  const isOpener = (line: string): boolean => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith(prefix) && trimmed.endsWith('{') && trimmed.length > prefix.length + 1
    );
  };
  const selections: monaco.Selection[] = [];

  for (let line = 1; line <= model.getLineCount(); line += 1) {
    if (isOpener(model.getLineContent(line))) {
      selections.push(new monaco.Selection(line, 1, line, 1));
    }
  }
  if (selections.length === 0) return;

  // Vùng gấp do Monaco tính bất đồng bộ sau khi nội dung đổi. Gọi ngay lập tức thì
  // model chưa có vùng nào và lệnh gấp im lặng không làm gì — đúng lỗi đã thấy trên
  // trình duyệt thật. Nhường một khung hình rồi mới gấp.
  // Provider gấp chạy bất đồng bộ; một khung hình chưa chắc đủ để mọi vùng sẵn sàng
  await new Promise((resolve) => setTimeout(resolve, 60));
  if (editor.getModel() !== model) return;

  // Gấp TUẦN TỰ từng khối. Đặt nhiều con trỏ rồi gọi một lần chỉ gấp được khối đầu:
  // lệnh `editor.fold` xử lý vùng tại con trỏ chính, không xử lý hết mọi con trỏ.
  const foldAction = editor.getAction('editor.fold');
  for (const selection of selections) {
    editor.setSelection(selection);
    try {
      await foldAction?.run();
    } catch {
      // Monaco huỷ lệnh đang chạy khi người dùng đổi file giữa chừng và ném "Canceled".
      // Đó là kết thúc bình thường, không phải lỗi — nhưng không bắt thì nó nổi lên
      // thành pageerror và làm bẩn console.
      return;
    }
  }
  editor.setSelection(new monaco.Selection(1, 1, 1, 1));
  editor.revealLine(1);
}

export function CodeEditor({
  fileName,
  value,
  lineNumber,
  onChange,
  onRun,
  onMessage,
  onShowShortcuts,
  theme,
}: Props): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onShowShortcutsRef = useRef(onShowShortcuts);
  onShowShortcutsRef.current = onShowShortcuts;
  // Chi dung cho gia tri BAN DAU: doi theme sau do do effect rieng lo, khong dung lai editor
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    const editor = monaco.editor.create(host, {
      value: '',
      theme: themeRef.current === 'light' ? 'vs' : 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      tabSize: 2,
      // Những thứ người dùng mặc định mong đợi ở một trình soạn thảo code
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      // Không có dịch vụ ngôn ngữ nên gợi ý dựa trên từ đã có trong file
      wordBasedSuggestions: 'currentDocument',
      suggestOnTriggerCharacters: true,
      renderWhitespace: 'selection',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      linkedEditing: true,
      autoClosingBrackets: 'languageDefined',
      autoClosingQuotes: 'languageDefined',
      formatOnPaste: true,
      stickyScroll: { enabled: true },
    });
    editorRef.current = editor;
    decorationsRef.current = editor.createDecorationsCollection();

    /**
     * Móc cho E2E đặt nội dung file mà không phải gõ từng phím.
     *
     * Gõ bằng bàn phím giả lập bị Monaco tự thụt lề dồn theo từng dòng nên code vào đến nơi
     * không còn giống code gốc. `setValue` vẫn chạy qua đúng đường `onDidChangeModelContent`
     * như người dùng gõ, chỉ bỏ phần bàn phím. Chỉ có ở bản dev.
     */
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>)['__avEditor'] = editor;
    }

    // Lỗi cú pháp do provider format phát hiện phải đi ra được tới toast
    setFormatErrorSink((text) => {
      onMessageRef.current(text);
    });

    /**
     * Ctrl+Alt+L định dạng code — phim quen tay của IntelliJ. Shift+Alt+F của Monaco vẫn
     * chạy song song.
     *
     * Ngôn ngữ theo thụt lề (Python, Ruby…) không có formatter nào và phải nói rõ, vì lệnh
     * format của Monaco khi không có provider chỉ hiện một dòng tiếng Anh nhấp nháy rồi biến mất.
     */
    editor.addAction({
      id: 'av.formatDocument',
      label: 'Định dạng code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyL],
      contextMenuGroupId: 'modification',
      contextMenuOrder: 1,
      run: (target) => {
        const model = target.getModel();
        if (model === null) return;
        const languageId = model.getLanguageId();
        if (!hasFormatter(languageId)) {
          onMessageRef.current(
            `Chưa có trình định dạng cho ${displayName(languageId)} — thụt lề là cú pháp của ngôn ngữ này, sửa hộ là đổi luôn ý nghĩa chương trình. Ctrl+Alt+K để xem ngôn ngữ nào định dạng được.`,
          );
          return;
        }
        void target.getAction('editor.action.formatDocument')?.run();
      },
    });

    // Bảng phím tắt cũng phải mở được từ trong editor: Monaco nuốt gần hết phím của trang
    editor.addAction({
      id: 'av.shortcuts',
      label: 'Phím tắt',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyK],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 2,
      run: () => {
        onShowShortcutsRef.current();
      },
    });

    // Ctrl+Enter chạy code, không phải rời tay khỏi bàn phím để bấm nút
    editor.addAction({
      id: 'av.run',
      label: 'Chạy code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1,
      run: () => {
        onRunRef.current();
      },
    });

    const subscription = editor.onDidChangeModelContent(() => {
      onChangeRef.current(editor.getValue());
    });

    return () => {
      subscription.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  // Doi file: đặt lại nội dùng, doi ngôn ngữ, roi gấp khối trực quan hóa (ngầm #18)
  useEffect(() => {
    const editor = editorRef.current;
    if (editor === null) return;

    const language = languageOfFile(fileName);
    const ext = /\.([^.]+)$/.exec(fileName)?.[1] ?? '';
    const mode = language?.monacoId ?? EXTRA_MODES[ext] ?? 'plaintext';

    const model = editor.getModel();
    if (model !== null) monaco.editor.setModelLanguage(model, mode);
    if (editor.getValue() !== value) editor.setValue(value);

    void foldVisualizeBlocks(editor, language?.commentPrefix ?? '//');
    // Chỉ chạy khi doi FILE, không chạy khi go phim — nếu không khỏi vua mở sẽ bi gap lai
    // eslint-disable-next-line react-hooks/exhaustive-deps -- có y bỏ `value`, xem ghi chu trên
  }, [fileName]);

  /**
   * Đồng bộ lại khi nội dung trong store đổi mà TÊN FILE không đổi — ví dụ nạp lại bài mẫu.
   *
   * Thiếu effect này thì editor và store trôi khỏi nhau: màn hình hiển code người dùng vừa
   * viết nhưng bấm Chạy lại chạy nội dung cũ trong store.
   *
   * Điều kiện `getValue() !== value` là thứ giữ cho việc gõ phím không bị đứt: lúc đó store
   * đã bằng đúng nội dung editor nên không ai động vào ai.
   */
  // Theme cua Monaco la trang thai TOAN CUC chu khong phai cua tung editor
  useEffect(() => {
    monaco.editor.setTheme(theme === 'light' ? 'vs' : 'vs-dark');
  }, [theme]);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor === null || editor.getValue() === value) return;

    // Giữ nguyên vị trí con trỏ: `setValue` mặc định ném con trỏ về đầu file
    const position = editor.getPosition();
    editor.setValue(value);
    if (position !== null) editor.setPosition(position);
  }, [value]);

  // Vạch sáng đóng đang chạy — ngầm #15 và #16
  useEffect(() => {
    const collection = decorationsRef.current;
    if (collection === null) return;

    if (lineNumber === undefined || lineNumber <= 0) {
      collection.clear();
      return;
    }
    collection.set([
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: { isWholeLine: true, className: styles['currentLine'] ?? '' },
      },
    ]);
    editorRef.current?.revealLineInCenterIfOutsideViewport(lineNumber);
  }, [lineNumber]);

  return <div ref={hostRef} className={styles['editor']} />;
}
