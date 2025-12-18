"""
依赖注入模块配置（类似 Spring 的 @Configuration）
"""
import os
from pathlib import Path
from injector import Module, singleton, Binder, inject, provider
from src.service.ai_service import AIService
from src.service.ollama_service import OllamaService
from src.service.deepseek_service import DeepSeekService
from src.service.chat_service import ChatService
from src.service.conversation_service import ConversationService
from src.service.summary_service import SummaryService
from src.service.story_service import StoryService
from src.service.story_generation_service import StoryGenerationService
from src.service.chat_orchestration_service import ChatOrchestrationService
from src.service.summary_orchestration_service import SummaryOrchestrationService
from src.service.ai_config_service import AIConfigService
from src.repository.chat_repository import ChatRepository
from src.repository.conversation_repository import ConversationRepository
from src.repository.summary_repository import SummaryRepository
from src.repository.story_progress_repository import StoryProgressRepository
from src.repository.ai_config_repository import AIConfigRepository
from src.config import get_config


class AppModule(Module):
    """应用依赖注入模块"""
    
    def configure(self, binder: Binder):
        """
        配置依赖注入绑定（类似 Spring 的 @Bean）
        
        Args:
            binder: Injector 绑定器
        """
        # 注册服务为单例（类似 Spring 的 @Singleton）
        binder.bind(OllamaService, to=OllamaService, scope=singleton)
        binder.bind(DeepSeekService, to=DeepSeekService, scope=singleton)
        
        # 注册 AI 服务（通过构造函数注入依赖）
        # Injector 会自动解析构造函数参数
        binder.bind(AIService, to=AIService, scope=singleton)
        
        # 注册数据库相关服务
        binder.bind(ChatRepository, to=self._create_chat_repository, scope=singleton)
        binder.bind(ConversationRepository, to=self._create_conversation_repository, scope=singleton)
        binder.bind(SummaryRepository, to=self._create_summary_repository, scope=singleton)
        binder.bind(StoryProgressRepository, to=self._create_story_progress_repository, scope=singleton)
        binder.bind(AIConfigRepository, to=self._create_ai_config_repository, scope=singleton)
        binder.bind(ChatService, to=ChatService, scope=singleton)
        binder.bind(ConversationService, to=ConversationService, scope=singleton)
        binder.bind(SummaryService, to=SummaryService, scope=singleton)
        binder.bind(StoryService, to=StoryService, scope=singleton)
        binder.bind(StoryGenerationService, to=StoryGenerationService, scope=singleton)
        binder.bind(ChatOrchestrationService, to=ChatOrchestrationService, scope=singleton)
        binder.bind(SummaryOrchestrationService, to=SummaryOrchestrationService, scope=singleton)
        binder.bind(AIConfigService, to=AIConfigService, scope=singleton)
    
    @provider
    def _create_chat_repository(self) -> ChatRepository:
        """
        创建聊天记录仓库（提供数据库路径）
        
        Returns:
            ChatRepository 实例
        """
        from src.utils.db_path import get_database_path
        
        db_path = get_database_path()
        return ChatRepository(db_path=db_path)
    
    @provider
    def _create_conversation_repository(self) -> ConversationRepository:
        """
        创建会话设置仓库（提供数据库路径）
        
        Returns:
            ConversationRepository 实例
        """
        from src.utils.db_path import get_database_path
        
        db_path = get_database_path()
        return ConversationRepository(db_path=db_path)
    
    @provider
    def _create_summary_repository(self) -> SummaryRepository:
        """
        创建总结仓库（提供数据库路径）
        
        Returns:
            SummaryRepository 实例
        """
        from src.utils.db_path import get_database_path
        
        db_path = get_database_path()
        return SummaryRepository(db_path=db_path)
    
    @provider
    def _create_story_progress_repository(self) -> StoryProgressRepository:
        """
        创建故事进度仓库（提供数据库路径）
        
        Returns:
            StoryProgressRepository 实例
        """
        from src.utils.db_path import get_database_path
        
        db_path = get_database_path()
        return StoryProgressRepository(db_path=db_path)
    
    @provider
    def _create_ai_config_repository(self) -> AIConfigRepository:
        """
        创建 AI 配置仓库（提供数据库路径）
        
        Returns:
            AIConfigRepository 实例
        """
        from src.utils.db_path import get_database_path
        
        db_path = get_database_path()
        return AIConfigRepository(db_path=db_path)

