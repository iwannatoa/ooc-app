"""
Dependency injection module configuration
"""
from injector import Module, singleton, Binder, provider
from service.ai_service import AIService
from service.ai_service_streaming import AIServiceStreaming
from service.ollama_service import OllamaService
from service.deepseek_service import DeepSeekService
from service.chat_service import ChatService
from service.conversation_service import ConversationService
from service.summary_service import SummaryService
from service.story_service import StoryService
from service.story_generation_service import StoryGenerationService
from service.chat_orchestration_service import ChatOrchestrationService
from service.summary_orchestration_service import SummaryOrchestrationService
from service.ai_config_service import AIConfigService
from service.app_settings_service import AppSettingsService
from repository.chat_repository import ChatRepository
from repository.conversation_repository import ConversationRepository
from repository.summary_repository import SummaryRepository
from repository.story_progress_repository import StoryProgressRepository
from repository.ai_config_repository import AIConfigRepository
from repository.app_settings_repository import AppSettingsRepository
from repository.character_record_repository import CharacterRecordRepository
from service.character_service import CharacterService


class AppModule(Module):
    """Application dependency injection module"""
    
    def configure(self, binder: Binder):
        """
        Configure dependency injection bindings
        
        Args:
            binder: Injector binder
        """
        binder.bind(OllamaService, to=OllamaService, scope=singleton)
        binder.bind(DeepSeekService, to=DeepSeekService, scope=singleton)
        binder.bind(AIService, to=self._create_ai_service, scope=singleton)
        binder.bind(AIServiceStreaming, to=self._create_ai_service_streaming, scope=singleton)
        binder.bind(ChatRepository, to=self._create_chat_repository, scope=singleton)
        binder.bind(ConversationRepository, to=self._create_conversation_repository, scope=singleton)
        binder.bind(SummaryRepository, to=self._create_summary_repository, scope=singleton)
        binder.bind(StoryProgressRepository, to=self._create_story_progress_repository, scope=singleton)
        binder.bind(AIConfigRepository, to=self._create_ai_config_repository, scope=singleton)
        binder.bind(AppSettingsRepository, to=self._create_app_settings_repository, scope=singleton)
        binder.bind(CharacterRecordRepository, to=self._create_character_record_repository, scope=singleton)
        binder.bind(ChatService, to=self._create_chat_service, scope=singleton)
        binder.bind(AIConfigService, to=self._create_ai_config_service, scope=singleton)
        binder.bind(AppSettingsService, to=self._create_app_settings_service, scope=singleton)
        binder.bind(CharacterService, to=self._create_character_service, scope=singleton)
        binder.bind(ConversationService, to=self._create_conversation_service, scope=singleton)
        binder.bind(SummaryService, to=self._create_summary_service, scope=singleton)
        binder.bind(StoryService, to=self._create_story_service, scope=singleton)
        binder.bind(StoryGenerationService, to=self._create_story_generation_service, scope=singleton)
        binder.bind(ChatOrchestrationService, to=self._create_chat_orchestration_service, scope=singleton)
        binder.bind(SummaryOrchestrationService, to=self._create_summary_orchestration_service, scope=singleton)
    
    @provider
    def _create_chat_repository(self) -> ChatRepository:
        from infrastructure.database import get_sessionmaker

        return ChatRepository(session_factory=get_sessionmaker())
    
    @provider
    def _create_conversation_repository(self) -> ConversationRepository:
        from infrastructure.database import get_sessionmaker

        return ConversationRepository(session_factory=get_sessionmaker())
    
    @provider
    def _create_summary_repository(self) -> SummaryRepository:
        from infrastructure.database import get_sessionmaker

        return SummaryRepository(session_factory=get_sessionmaker())
    
    @provider
    def _create_story_progress_repository(self) -> StoryProgressRepository:
        from infrastructure.database import get_sessionmaker

        return StoryProgressRepository(session_factory=get_sessionmaker())
    
    @provider
    def _create_ai_config_repository(self) -> AIConfigRepository:
        from infrastructure.database import get_sessionmaker

        return AIConfigRepository(session_factory=get_sessionmaker())
    
    @provider
    def _create_app_settings_repository(self) -> AppSettingsRepository:
        from infrastructure.database import get_sessionmaker

        return AppSettingsRepository(session_factory=get_sessionmaker())
    
    @provider
    def _create_chat_service(
        self,
        chat_repository: ChatRepository
    ) -> ChatService:
        """
        Create chat service
        
        Returns:
            ChatService instance
        """
        return ChatService(chat_repository=chat_repository)
    
    @provider
    def _create_ai_config_service(
        self,
        ai_config_repository: AIConfigRepository
    ) -> AIConfigService:
        """
        Create AI config service
        
        Returns:
            AIConfigService instance
        """
        return AIConfigService(ai_config_repository=ai_config_repository)
    
    @provider
    def _create_app_settings_service(
        self,
        app_settings_repository: AppSettingsRepository
    ) -> AppSettingsService:
        """
        Create app settings service
        
        Returns:
            AppSettingsService instance
        """
        return AppSettingsService(app_settings_repository=app_settings_repository)
    
    @provider
    def _create_ai_service(
        self,
        ollama_service: OllamaService,
        deepseek_service: DeepSeekService
    ) -> AIService:
        """
        Create AI service
        
        Returns:
            AIService instance
        """
        return AIService(
            ollama_service=ollama_service,
            deepseek_service=deepseek_service
        )
    
    @provider
    def _create_ai_service_streaming(
        self,
        ollama_service: OllamaService,
        deepseek_service: DeepSeekService
    ) -> AIServiceStreaming:
        """
        Create streaming AI service
        
        Returns:
            AIServiceStreaming instance
        """
        return AIServiceStreaming(
            ollama_service=ollama_service,
            deepseek_service=deepseek_service
        )
    
    @provider
    def _create_summary_service(
        self,
        summary_repository: SummaryRepository,
        ai_service: AIService,
        app_settings_service: AppSettingsService
    ) -> SummaryService:
        """
        Create summary service
        
        Returns:
            SummaryService instance
        """
        return SummaryService(
            summary_repository=summary_repository,
            ai_service=ai_service,
            app_settings_service=app_settings_service
        )
    
    @provider
    def _create_story_service(
        self,
        story_progress_repository: StoryProgressRepository,
        ai_service: AIService
    ) -> StoryService:
        """
        Create story service
        
        Returns:
            StoryService instance
        """
        return StoryService(
            story_progress_repository=story_progress_repository,
            ai_service=ai_service
        )
    
    @provider
    def _create_conversation_service(
        self,
        conversation_repository: ConversationRepository,
        ai_service: AIService,
        ai_config_service: AIConfigService,
        ai_service_streaming: AIServiceStreaming
    ) -> ConversationService:
        """
        Create conversation service (needs AIConfigService injection)
        
        Returns:
            ConversationService instance
        """
        return ConversationService(
            conversation_repository=conversation_repository,
            ai_service=ai_service,
            ai_config_service=ai_config_service,
            ai_service_streaming=ai_service_streaming
        )
    
    @provider
    def _create_chat_orchestration_service(
        self,
        ai_service: AIService,
        chat_service: ChatService,
        ai_config_service: AIConfigService,
        conversation_service: ConversationService,
    ) -> ChatOrchestrationService:
        """
        Create chat orchestration service
        
        Returns:
            ChatOrchestrationService instance
        """
        return ChatOrchestrationService(
            ai_service=ai_service,
            chat_service=chat_service,
            ai_config_service=ai_config_service,
            conversation_service=conversation_service,
        )
    
    @provider
    def _create_summary_orchestration_service(
        self,
        summary_service: SummaryService,
        chat_service: ChatService,
        ai_config_service: AIConfigService
    ) -> SummaryOrchestrationService:
        """
        Create summary orchestration service
        
        Returns:
            SummaryOrchestrationService instance
        """
        return SummaryOrchestrationService(
            summary_service=summary_service,
            chat_service=chat_service,
            ai_config_service=ai_config_service
        )
    
    @provider
    def _create_character_record_repository(self) -> CharacterRecordRepository:
        from infrastructure.database import get_sessionmaker

        return CharacterRecordRepository(session_factory=get_sessionmaker())
    
    @provider
    def _create_character_service(
        self,
        character_repository: CharacterRecordRepository,
        chat_repository: ChatRepository,
        conversation_service: ConversationService,
        chat_service: ChatService,
        ai_service: AIService,
        ai_service_streaming: AIServiceStreaming,
        ai_config_service: AIConfigService,
        app_settings_service: AppSettingsService
    ) -> CharacterService:
        """
        Create character service
        
        Returns:
            CharacterService instance
        """
        return CharacterService(
            character_repository=character_repository,
            chat_repository=chat_repository,
            conversation_service=conversation_service,
            chat_service=chat_service,
            ai_service=ai_service,
            ai_service_streaming=ai_service_streaming,
            ai_config_service=ai_config_service,
            app_settings_service=app_settings_service
        )
    
    @provider
    def _create_story_generation_service(
        self,
        ai_service: AIService,
        ai_service_streaming: AIServiceStreaming,
        chat_service: ChatService,
        conversation_service: ConversationService,
        summary_service: SummaryService,
        story_service: StoryService,
        ai_config_service: AIConfigService,
        app_settings_service: AppSettingsService,
        character_service: CharacterService
    ) -> StoryGenerationService:
        """
        Create story generation service
        
        Returns:
            StoryGenerationService instance
        """
        return StoryGenerationService(
            ai_service=ai_service,
            ai_service_streaming=ai_service_streaming,
            chat_service=chat_service,
            conversation_service=conversation_service,
            summary_service=summary_service,
            story_service=story_service,
            ai_config_service=ai_config_service,
            app_settings_service=app_settings_service,
            character_service=character_service
        )

