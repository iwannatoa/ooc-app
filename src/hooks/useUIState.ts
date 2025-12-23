import { useAppSelector, useAppDispatch } from './redux';
import {
  setConversationListCollapsed,
  setSettingsSidebarCollapsed,
  setIsNewConversation,
  setPendingConversationId,
} from '@/store/slices/uiSlice';

export const useUIState = () => {
  const dispatch = useAppDispatch();
  const uiState = useAppSelector((state) => state.ui);

  return {
    ...uiState,
    setConversationListCollapsed: (collapsed: boolean) =>
      dispatch(setConversationListCollapsed(collapsed)),
    setSettingsSidebarCollapsed: (collapsed: boolean) =>
      dispatch(setSettingsSidebarCollapsed(collapsed)),
    setIsNewConversation: (isNew: boolean) =>
      dispatch(setIsNewConversation(isNew)),
    setPendingConversationId: (id: string | null) =>
      dispatch(setPendingConversationId(id)),
  };
};
