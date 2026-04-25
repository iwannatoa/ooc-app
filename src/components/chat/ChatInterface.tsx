import React from 'react';
import MessageList from './MessageList';
import ChatOnboarding from './ChatOnboarding';
import { StoryActions } from '../story';
import { UserNarrationBar } from './UserNarrationBar';
import styles from './ChatInterface.module.scss';

const ChatInterface: React.FC = () => {
  return (
    <div className={styles.chatInterface}>
      <ChatOnboarding />
      <MessageList />
      <UserNarrationBar />
      <StoryActions />
    </div>
  );
};

export default ChatInterface;
