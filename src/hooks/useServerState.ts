import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import {
  setPythonServerStatus,
  setOllamaStatus,
  setServerLoading,
  setServerError,
  clearServerError,
} from '@/store/slices/serverSlice';
import { PythonServerStatus, OllamaStatus } from '@/types';

export const useServerState = () => {
  const dispatch = useAppDispatch();

  const serverState = useAppSelector((state) => state.server);

  const setServerPythonServerStatus = (status: PythonServerStatus) =>
    dispatch(setPythonServerStatus(status));

  const setServerOllamaStatus = (status: OllamaStatus) =>
    dispatch(setOllamaStatus(status));

  const setLoading = (loading: boolean) => dispatch(setServerLoading(loading));

  const setError = (error: string | null) => dispatch(setServerError(error));

  const clearServerErrorState = () => dispatch(clearServerError());

  return {
    ...serverState,
    setPythonServerStatus: setServerPythonServerStatus,
    setOllamaStatus: setServerOllamaStatus,
    setLoading: setLoading,
    setError: setError,
    clearError: clearServerErrorState,
  };
};
