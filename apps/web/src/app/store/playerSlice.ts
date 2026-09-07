import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type BuildStatus = 'idle' | 'building' | 'ready' | 'error';

export interface PlayerState {
  /**
   * CHI giữ cursor và so luong — mảng `chunks` có the lên hang tram nghin phần tử
   * nên năm ngoài store, trong VizEngine (PLAN.md Task 2.1, lưu y hiệu năng).
   */
  cursor: number;
  chunkCount: number;
  lineNumber: number | undefined;
  playing: boolean;
  /** 0..4 buoc 0,5 — ngam #11 */
  speed: number;
  status: BuildStatus;
  errorMessage: string | undefined;
  userOutput: string;
}

const initialState: PlayerState = {
  cursor: 0,
  chunkCount: 0,
  lineNumber: undefined,
  playing: false,
  speed: 2,
  status: 'idle',
  errorMessage: undefined,
  userOutput: '',
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    /**
     * Chỉ đánh dấu đang chạy. KHONG xóa cursor hay chunkCount o đây: làm vậy thì
     * khung hình dang hiện biến mất trong vai chuc mili giay roi hiện lai — người dùng
     * thay man hinh nhay mỗi lan bam Run. Canh cu được giữ cho tới khi có kết quả mỗi.
     */
    buildStarted(state) {
      state.status = 'building';
      state.errorMessage = undefined;
      state.playing = false;
    },
    buildSucceeded(state, action: PayloadAction<{ chunkCount: number; userOutput: string }>) {
      state.status = 'ready';
      state.chunkCount = action.payload.chunkCount;
      state.userOutput = action.payload.userOutput;
      state.cursor = 0;
      state.lineNumber = undefined;
    },
    buildFailed(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.errorMessage = action.payload;
      state.playing = false;
    },
    setCursor(state, action: PayloadAction<{ cursor: number; lineNumber: number | undefined }>) {
      state.cursor = action.payload.cursor;
      state.lineNumber = action.payload.lineNumber;
    },
    setPlaying(state, action: PayloadAction<boolean>) {
      state.playing = action.payload;
    },
    setSpeed(state, action: PayloadAction<number>) {
      state.speed = action.payload;
    },
    reset() {
      return initialState;
    },
  },
});

export const playerActions = playerSlice.actions;
export const playerReducer = playerSlice.reducer;

/** Ngam #11: 4000ms o cham nhat xuong ~73ms o nhanh nhat. */
export function intervalFromSpeed(speed: number): number {
  return 4000 / Math.pow(Math.E, speed);
}
