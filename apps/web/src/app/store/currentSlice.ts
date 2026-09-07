import { extensionOf } from '@av/config';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type SourceFile } from '../../entities/file';

export interface CurrentState {
  files: SourceFile[];
  editingFileName: string | undefined;
  /** Co dieu khien tu build lai — ngam #05 */
  shouldBuild: boolean;
}

const initialState: CurrentState = {
  files: [],
  editingFileName: undefined,
  shouldBuild: false,
};

const currentSlice = createSlice({
  name: 'current',
  initialState,
  reducers: {
    /** Khoi phuc phien lam viec tu localStorage luc mo app. */
    restore(
      state,
      action: PayloadAction<{ files: SourceFile[]; editingFileName: string | undefined }>,
    ) {
      state.files = action.payload.files;
      state.editingFileName = action.payload.editingFileName;
      state.shouldBuild = false;
    },

    setEditingFile(state, action: PayloadAction<string>) {
      if (state.editingFileName === action.payload) return;
      state.editingFileName = action.payload;
      state.shouldBuild = true;
    },

    addFile(state, action: PayloadAction<SourceFile>) {
      state.files.push(action.payload);
      state.editingFileName = action.payload.name;
      state.shouldBuild = true;
    },

    /**
     * Sửa nội dung file — ngầm #05 và #06.
     *
     * `shouldBuild` chỉ bật khi đuôi file là `.md`. Đây là thứ DUY NHẤT ngăn app gọi
     * runner sau mỗi lần gõ phím: markdown thì preview cập nhật ngay, code thì phải
     * bấm Chạy. Đổi điều kiện này là app spam sandbox.
     */
    modifyFile(state, action: PayloadAction<{ name: string; content: string }>) {
      const file = state.files.find((f) => f.name === action.payload.name);
      if (file === undefined) return;
      const index = state.files.indexOf(file);
      state.files[index] = { ...file, content: action.payload.content };
      state.shouldBuild = extensionOf(file.name) === 'md';
    },

    renameFile(state, action: PayloadAction<{ name: string; newName: string }>) {
      const file = state.files.find((f) => f.name === action.payload.name);
      if (file === undefined) return;
      const index = state.files.indexOf(file);
      state.files[index] = { ...file, name: action.payload.newName };
      if (state.editingFileName === action.payload.name) {
        state.editingFileName = action.payload.newName;
      }
      state.shouldBuild = extensionOf(action.payload.newName) === 'md';
    },

    /** File dang mo bi xoa thi chuyen sang file KE BEN, khong phai file dau — ngam #04. */
    deleteFile(state, action: PayloadAction<string>) {
      const index = state.files.findIndex((f) => f.name === action.payload);
      if (index < 0) return;
      state.files.splice(index, 1);
      if (state.editingFileName === action.payload) {
        state.editingFileName = state.files[Math.min(index, state.files.length - 1)]?.name;
        state.shouldBuild = true;
      }
    },

    /** Danh dau da build xong de khong build lai cho toi khi co thay doi moi. */
    buildConsumed(state) {
      state.shouldBuild = false;
    },
  },
});

export const currentActions = currentSlice.actions;
export const currentReducer = currentSlice.reducer;
