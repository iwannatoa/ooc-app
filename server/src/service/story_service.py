"""
故事生成服务层
"""
from typing import Optional, Dict
from repository.story_progress_repository import StoryProgressRepository
from service.ai_service import AIService
from utils.logger import get_logger

logger = get_logger(__name__)


class StoryService:
    """故事生成服务类"""
    
    def __init__(
        self,
        story_progress_repository: StoryProgressRepository,
        ai_service: AIService
    ):
        """
        初始化服务
        
        Args:
            story_progress_repository: 故事进度仓库实例
            ai_service: AI 服务实例
        """
        self.repository = story_progress_repository
        self.ai_service = ai_service
    
    def get_progress(self, conversation_id: str) -> Optional[Dict]:
        """
        获取故事进度
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            进度字典，如果不存在则返回 None
        """
        progress = self.repository.get_progress(conversation_id)
        return progress.to_dict() if progress else None
    
    def mark_outline_confirmed(self, conversation_id: str) -> bool:
        """
        标记大纲已确认，可以开始生成故事
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            是否成功
        """
        return self.repository.mark_outline_confirmed(conversation_id)
    
    def update_progress(
        self,
        conversation_id: str,
        current_section: Optional[int] = None,
        total_sections: Optional[int] = None,
        last_generated_content: Optional[str] = None,
        last_generated_section: Optional[int] = None,
        status: Optional[str] = None,
        outline_confirmed: Optional[bool] = None
    ) -> Dict:
        """
        更新故事进度
        
        Args:
            conversation_id: 会话ID
            current_section: 当前章节编号
            total_sections: 总章节数
            last_generated_content: 最后生成的内容
            last_generated_section: 最后生成的部分编号
            status: 状态
            outline_confirmed: 大纲是否已确认
        
        Returns:
            更新后的进度字典
        """
        # Get existing progress
        existing = self.repository.get_progress(conversation_id)
        
        if existing:
            # Update existing progress
            progress = self.repository.create_or_update_progress(
                conversation_id=conversation_id,
                current_section=current_section if current_section is not None else existing.current_section,
                total_sections=total_sections if total_sections is not None else existing.total_sections,
                last_generated_content=last_generated_content if last_generated_content is not None else existing.last_generated_content,
                last_generated_section=last_generated_section if last_generated_section is not None else existing.last_generated_section,
                status=status if status is not None else existing.status,
                outline_confirmed=outline_confirmed if outline_confirmed is not None else (existing.outline_confirmed == 'true')
            )
        else:
            # Create new progress
            progress = self.repository.create_or_update_progress(
                conversation_id=conversation_id,
                current_section=current_section or 0,
                total_sections=total_sections,
                last_generated_content=last_generated_content,
                last_generated_section=last_generated_section,
                status=status or 'pending',
                outline_confirmed=outline_confirmed or False
            )
        
        return progress.to_dict()
    
    def delete_progress(self, conversation_id: str) -> bool:
        """
        删除故事进度
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            是否成功删除
        """
        return self.repository.delete_progress(conversation_id)
    
    def should_generate_next_section(self, conversation_id: str) -> bool:
        """
        判断是否应该生成下一部分
        
        Args:
            conversation_id: 会话ID
        
        Returns:
            是否应该生成下一部分
        """
        progress = self.repository.get_progress(conversation_id)
        if not progress:
            return False
        
        # Cannot generate if outline is not confirmed
        if progress.outline_confirmed != 'true':
            return False
        
        # Can generate next section if status is pending or completed
        return progress.status in ['pending', 'completed']

