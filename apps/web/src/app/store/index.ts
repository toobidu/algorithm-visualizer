import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { currentReducer } from './currentSlice';
import { envReducer } from './envSlice';
import { playerReducer } from './playerSlice';
import { toastReducer } from './toastSlice';

export const store = configureStore({
  reducer: {
    current: currentReducer,
    env: envReducer,
    player: playerReducer,
    toast: toastReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export { currentActions, type CurrentState } from './currentSlice';
export { envActions, type EnvState, type Motion, type Theme } from './envSlice';
export { playerActions, intervalFromSpeed, type PlayerState } from './playerSlice';
export { toastActions, type Toast } from './toastSlice';
