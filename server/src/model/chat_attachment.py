"""
Chat attachment data model.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Index

from model.base import Base


class ChatAttachment(Base):
    """Attachment linked to a chat message."""

    __tablename__ = 'chat_attachments'

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(100), nullable=False, index=True)
    message_id = Column(Integer, nullable=True, index=True)
    profile_id = Column(String(64), nullable=False, default='default')
    asset_ref = Column(String(64), nullable=False, unique=True, index=True)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(120), nullable=False)
    size_bytes = Column(Integer, nullable=False, default=0)
    storage_path = Column(String(500), nullable=False)
    status = Column(String(32), nullable=False, default='uploaded')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        Index(
            'idx_chat_attachments_conv_msg_created',
            'conversation_id',
            'message_id',
            'created_at',
        ),
    )

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'message_id': self.message_id,
            'profile_id': self.profile_id,
            'asset_ref': self.asset_ref,
            'filename': self.filename,
            'mime_type': self.mime_type,
            'size_bytes': self.size_bytes,
            'storage_path': self.storage_path,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
