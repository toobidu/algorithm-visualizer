import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  readonly id: string;
  readonly tone: 'success' | 'error';
  readonly message: string;
}

const toastSlice = createSlice({
  name: 'toast',
  initialState: { items: [] as Toast[] },
  reducers: {
    show: {
      reducer(state, action: PayloadAction<Toast>) {
        state.items.push(action.payload);
      },
      prepare(tone: Toast['tone'], message: string) {
        return { payload: { id: nanoid(), tone, message } };
      },
    },
    hide(state, action: PayloadAction<string>) {
      state.items = state.items.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const toastActions = toastSlice.actions;
export const toastReducer = toastSlice.reducer;
