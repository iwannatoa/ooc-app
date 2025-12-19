import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PythonServerStatus, OllamaStatus } from '@/types';

interface ServerState {
  pythonServerStatus: PythonServerStatus;
  ollamaStatus: OllamaStatus;
  isServerLoading: boolean;
  serverError: string | null;
  flaskPort: number | null;
  apiUrl: string;
}

const initialState: ServerState = {
  pythonServerStatus: 'stopped',
  ollamaStatus: 'checking',
  isServerLoading: false,
  serverError: null,
  flaskPort: null,
  apiUrl: 'http://localhost:5000',
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
    setFlaskPort: (state, action: PayloadAction<number | null>) => {
      state.flaskPort = action.payload;
      if (action.payload) {
        state.apiUrl = `http://localhost:${action.payload}`;
      } else {
        state.apiUrl = 'http://localhost:5000';
      }
    },
  },
});

export const {
  setPythonServerStatus,
  setOllamaStatus,
  setServerLoading,
  setServerError,
  clearServerError,
  setFlaskPort,
} = serverSlice.actions;

export default serverSlice.reducer;
