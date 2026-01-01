import React from 'react';
import MessageList from './MessageList';
import { StoryActions } from '../story';
import styles from './ChatInterface.module.scss';

const ChatInterface: React.FC = () => {
  return (
    <div className={styles.chatInterface}>
      <MessageList />
      <StoryActions />
    </div>
  );
};

export default ChatInterface;
