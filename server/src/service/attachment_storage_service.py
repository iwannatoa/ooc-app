"""
Attachment storage and retrieval service.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List, Optional
from uuid import uuid4

from sqlalchemy.orm import Session
from werkzeug.datastructures import FileStorage

from repository.chat_attachment_repository import ChatAttachmentRepository
from utils.db_path import get_active_profile_id, get_attachment_dir


class AttachmentStorageService:
    def __init__(self, attachment_repository: ChatAttachmentRepository):
        self.repository = attachment_repository

    def save_uploads(
        self,
        conversation_id: str,
        uploads: List[FileStorage],
        profile_id: Optional[str] = None,
        session: Optional[Session] = None,
    ) -> List[Dict]:
        if not uploads:
            return []
        resolved_profile = (profile_id or get_active_profile_id()).strip() or 'default'
        root = get_attachment_dir(profile_id=resolved_profile)
        root.mkdir(parents=True, exist_ok=True)

        records: List[Dict] = []
        for upload in uploads:
            if not upload or not upload.filename:
                continue
            filename = os.path.basename(upload.filename)
            asset_ref = f"att-{uuid4().hex}"
            ext = Path(filename).suffix
            storage_name = f"{asset_ref}{ext}" if ext else asset_ref
            target = root / storage_name
            upload.save(target)
            size_bytes = target.stat().st_size if target.exists() else 0
            row = self.repository.create_attachment(
                conversation_id=conversation_id,
                profile_id=resolved_profile,
                asset_ref=asset_ref,
                filename=filename,
                mime_type=upload.mimetype or 'application/octet-stream',
                size_bytes=size_bytes,
                storage_path=str(target),
                status='uploaded',
                session=session,
            )
            records.append(row.to_dict())
        return records

    def attach_to_message(
        self,
        asset_refs: List[str],
        message_id: int,
        conversation_id: str,
        session: Optional[Session] = None,
    ) -> None:
        self.repository.attach_to_message(
            asset_refs=asset_refs,
            message_id=message_id,
            conversation_id=conversation_id,
            session=session,
        )

    def list_by_message_ids(
        self,
        message_ids: List[int],
        session: Optional[Session] = None,
    ) -> Dict[int, List[Dict]]:
        rows = self.repository.list_by_message_ids(message_ids, session=session)
        grouped: Dict[int, List[Dict]] = {}
        for row in rows:
            if row.message_id is None:
                continue
            grouped.setdefault(row.message_id, []).append(row.to_dict())
        return grouped

    def list_by_asset_refs(
        self,
        asset_refs: List[str],
        session: Optional[Session] = None,
    ) -> List[Dict]:
        rows = self.repository.list_by_asset_refs(asset_refs, session=session)
        return [row.to_dict() for row in rows]
