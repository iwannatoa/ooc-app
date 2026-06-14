"""
Chat attachment repository.
"""
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session, sessionmaker

from model.chat_attachment import ChatAttachment
from repository.session_context import repository_session


class ChatAttachmentRepository:
    def __init__(self, session_factory: sessionmaker):
        self._session_factory = session_factory

    def create_attachment(
        self,
        conversation_id: str,
        profile_id: str,
        asset_ref: str,
        filename: str,
        mime_type: str,
        size_bytes: int,
        storage_path: str,
        status: str = 'uploaded',
        message_id: Optional[int] = None,
        session: Optional[Session] = None,
    ) -> ChatAttachment:
        with repository_session(self._session_factory, session) as sess:
            row = ChatAttachment(
                conversation_id=conversation_id,
                profile_id=profile_id,
                asset_ref=asset_ref,
                filename=filename,
                mime_type=mime_type,
                size_bytes=size_bytes,
                storage_path=storage_path,
                status=status,
                message_id=message_id,
                created_at=datetime.utcnow(),
            )
            sess.add(row)
            sess.flush()
            sess.refresh(row)
            return row

    def list_by_message_ids(
        self,
        message_ids: List[int],
        session: Optional[Session] = None,
    ) -> List[ChatAttachment]:
        if not message_ids:
            return []
        with repository_session(self._session_factory, session) as sess:
            return (
                sess.query(ChatAttachment)
                .filter(ChatAttachment.message_id.in_(message_ids))
                .order_by(ChatAttachment.created_at.asc())
                .all()
            )

    def list_by_asset_refs(
        self,
        asset_refs: List[str],
        session: Optional[Session] = None,
    ) -> List[ChatAttachment]:
        if not asset_refs:
            return []
        with repository_session(self._session_factory, session) as sess:
            return (
                sess.query(ChatAttachment)
                .filter(ChatAttachment.asset_ref.in_(asset_refs))
                .order_by(ChatAttachment.created_at.asc())
                .all()
            )

    def attach_to_message(
        self,
        asset_refs: List[str],
        message_id: int,
        conversation_id: str,
        session: Optional[Session] = None,
    ) -> None:
        if not asset_refs:
            return
        with repository_session(self._session_factory, session) as sess:
            (
                sess.query(ChatAttachment)
                .filter(
                    ChatAttachment.asset_ref.in_(asset_refs),
                    ChatAttachment.conversation_id == conversation_id,
                )
                .update({'message_id': message_id}, synchronize_session=False)
            )
