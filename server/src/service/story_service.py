"""
Story generation service layer
"""
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session
from repository.story_progress_repository import StoryProgressRepository
from service.ai_service import AIService
from utils.logger import get_logger

logger = get_logger(__name__)

# Sentinel: omit ``total_sections`` when updating progress (keep DB value).
# ``None`` means explicitly clear total_sections (open-ended serialization).
_TOTAL_SECTIONS_OMIT = object()


class StoryService:
    """Story generation service class"""
    
    def __init__(
        self,
        story_progress_repository: StoryProgressRepository,
        ai_service: AIService
    ):
        """
        Initialize service
        
        Args:
            story_progress_repository: Story progress repository instance
            ai_service: AI service instance
        """
        self.repository = story_progress_repository
        self.ai_service = ai_service
    
    def get_progress(
        self, conversation_id: str, session: Optional[Session] = None
    ) -> Optional[Dict]:
        """
        Get story progress
        
        Args:
            conversation_id: Conversation ID
            session: Optional outer SQLAlchemy session (same transaction as writes)
        
        Returns:
            Progress dictionary, or None if not exists
        """
        progress = self.repository.get_progress(conversation_id, session=session)
        return progress.to_dict() if progress else None
    
    def mark_outline_confirmed(self, conversation_id: str) -> bool:
        """
        Mark outline as confirmed, can start generating story
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Whether successful
        """
        return self.repository.mark_outline_confirmed(conversation_id)
    
    def update_progress(
        self,
        conversation_id: str,
        current_section: Optional[int] = None,
        total_sections: Any = _TOTAL_SECTIONS_OMIT,
        last_generated_content: Optional[str] = None,
        last_generated_section: Optional[int] = None,
        status: Optional[str] = None,
        outline_confirmed: Optional[bool] = None,
        session: Optional[Session] = None,
    ) -> Dict:
        """
        Update story progress
        
        Args:
            conversation_id: Conversation ID
            current_section: Current section number
            total_sections: Total sections count, or ``None`` to clear (open-ended).
                Default internal sentinel means "do not change this field".
            last_generated_content: Last generated content
            last_generated_section: Last generated section number
            status: Status
            outline_confirmed: Whether outline is confirmed
        
        Returns:
            Updated progress dictionary
        """
        # Get existing progress
        existing = self.repository.get_progress(conversation_id, session=session)
        
        if existing:
            update_total = total_sections is not _TOTAL_SECTIONS_OMIT
            resolved_total = (
                total_sections if update_total else existing.total_sections
            )
            progress = self.repository.create_or_update_progress(
                conversation_id=conversation_id,
                current_section=current_section if current_section is not None else existing.current_section,
                total_sections=resolved_total,
                last_generated_content=last_generated_content if last_generated_content is not None else existing.last_generated_content,
                last_generated_section=last_generated_section if last_generated_section is not None else existing.last_generated_section,
                status=status if status is not None else existing.status,
                outline_confirmed=outline_confirmed if outline_confirmed is not None else (existing.outline_confirmed == 'true'),
                session=session,
                update_total_sections=update_total,
            )
        else:
            ts = None if total_sections is _TOTAL_SECTIONS_OMIT else total_sections
            progress = self.repository.create_or_update_progress(
                conversation_id=conversation_id,
                current_section=current_section or 0,
                total_sections=ts,
                last_generated_content=last_generated_content,
                last_generated_section=last_generated_section,
                status=status or 'pending',
                outline_confirmed=outline_confirmed or False,
                session=session,
                update_total_sections=True,
            )
        
        return progress.to_dict()
    
    def delete_progress(self, conversation_id: str) -> bool:
        """
        Delete story progress
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Whether deletion was successful
        """
        return self.repository.delete_progress(conversation_id)
    
    def should_generate_next_section(self, conversation_id: str) -> bool:
        """
        Determine if should generate next section
        
        Args:
            conversation_id: Conversation ID
        
        Returns:
            Whether should generate next section
        """
        progress = self.repository.get_progress(conversation_id)
        if not progress:
            return False
        
        # Cannot generate if outline is not confirmed
        if progress.outline_confirmed != 'true':
            return False
        
        # Can generate next section if status is pending or completed
        return progress.status in ['pending', 'completed']

