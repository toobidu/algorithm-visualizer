import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

const EXT_COOKIE = 'ext';

/** Ngam #20: ngon ngu ua thich luu o cookie, mac dinh `js`. */
function readExtCookie(): string {
  if (typeof document === 'undefined') return 'js';
  const match = new RegExp(`(?:^|; )${EXT_COOKIE}=([^;]*)`).exec(document.cookie);
  return match?.[1] ?? 'js';
}

function writeExtCookie(ext: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${EXT_COOKIE}=${ext}; path=/; max-age=31536000; samesite=lax`;
}

const THEME_KEY = 'av:theme';
const MOTION_KEY = 'av:motion';

/** Độ biểu cảm của hoạt cảnh — xem docs/y-tuong-hoat-canh.md */
export type Motion = 'off' | 'motion' | 'claw';

function readMotion(): Motion {
  try {
    const saved = localStorage.getItem(MOTION_KEY);
    if (saved === 'off' || saved === 'motion' || saved === 'claw') return saved;
  } catch {
    // bị chặn lưu trữ thì dùng mặc định
  }
  return 'motion';
}

function writeMotion(motion: Motion): void {
  try {
    localStorage.setItem(MOTION_KEY, motion);
  } catch {
    // mất phần nhớ chứ không được làm hỏng phiên đang dùng
  }
}

export type Theme = 'dark' | 'light';

/**
 * Lần đầu thì theo cài đặt của hệ điều hành; sau đó theo lựa chọn của người dùng.
 * Đọc localStorage có thể ném lỗi ở chế độ riêng tư nên phải bọc try/catch.
 */
function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // bị chặn lưu trữ thì rơi xuống cài đặt hệ điều hành
  }
  if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function writeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // mất phần nhớ chứ không được làm hỏng phiên đang dùng
  }
}

export interface EnvState {
  ext: string;
  theme: Theme;
  motion: Motion;
  /** Chế độ dán code thuần: code không gọi tracer, hệ thống tự suy ra cách vẽ. */
  plainMode: boolean;
}

const envSlice = createSlice({
  name: 'env',
  initialState: {
    ext: readExtCookie(),
    theme: readTheme(),
    motion: readMotion(),
    plainMode: false,
  },
  reducers: {
    setExt(state, action: PayloadAction<string>) {
      state.ext = action.payload;
      writeExtCookie(action.payload);
    },
    setPlainMode(state, action: PayloadAction<boolean>) {
      state.plainMode = action.payload;
    },
    setMotion(state, action: PayloadAction<Motion>) {
      state.motion = action.payload;
      writeMotion(action.payload);
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      writeTheme(state.theme);
    },
  },
});

export const envActions = envSlice.actions;
export const envReducer = envSlice.reducer;
