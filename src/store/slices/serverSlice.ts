import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PythonServerStatus, OllamaStatus } from '@/types';

interface ServerState {
  pythonServerStatus: PythonServerStatus;
  ollamaStatus: OllamaStatus;
  isServerLoading: boolean;
  serverError: string | null;
}

const initialState: ServerState = {
  pythonServerStatus: 'stopped',
  ollamaStatus: 'checking',
  isServerLoading: false,
  serverError: null,
};

const serverSlice = createSlice({
  name: 'server',
  initialState,
  reducers: {
    setPythonServerStatus: (
      state,
      action: PayloadAction<PythonServerStatus>
    ) => {
      state.pythonServerStatus = action.payload;
    },
    setOllamaStatus: (state, action: PayloadAction<OllamaStatus>) => {
      state.ollamaStatus = action.payload;
    },
    setServerLoading: (state, action: PayloadAction<boolean>) => {
      state.isServerLoading = action.payload;
    },
    setServerError: (state, action: PayloadAction<string | null>) => {
      state.serverError = action.payload;
    },
    clearServerError: (state) => {
      state.serverError = null;
    },
  },
});

export const {
  setPythonServerStatus,
  setOllamaStatus,
  setServerLoading,
  setServerError,
  clearServerError,
} = serverSlice.actions;

export default serverSlice.reducer;
