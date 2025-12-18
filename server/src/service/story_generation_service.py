"""
故事生成服务层（处理故事生成相关的业务逻辑）
"""
from typing import Optional, Dict, List
from src.service.ai_service import AIService
from src.service.chat_service import ChatService
from src.service.conversation_service import ConversationService
from src.service.summary_service import SummaryService
from src.service.story_service import StoryService
from src.service.ai_config_service import AIConfigService
from src.utils.system_prompt import build_system_prompt, build_feedback_prompt
from src.config import get_config
from src.utils.logger import get_logger

logger = get_logger(__name__)


class StoryGenerationService:
    """故事生成服务类（处理故事生成的核心业务逻辑）"""
    
    def __init__(
        self,
        ai_service: AIService,
        chat_service: ChatService,
        conversation_service: ConversationService,
        summary_service: SummaryService,
        story_service: StoryService,
        ai_config_service: AIConfigService
    ):
        """
        初始化服务
        
        Args:
            ai_service: AI 服务实例
            chat_service: 聊天记录服务实例
            conversation_service: 会话设置服务实例
            summary_service: 总结服务实例
            story_service: 故事服务实例
            ai_config_service: AI 配置服务实例
        """
        self.ai_service = ai_service
        self.chat_service = chat_service
        self.conversation_service = conversation_service
        self.summary_service = summary_service
        self.story_service = story_service
        self.ai_config_service = ai_config_service
        self.config = get_config()
    
    def generate_story_section(
        self,
        conversation_id: str,
        provider: str,
        model: Optional[str] = None
    ) -> Dict:
        """
        生成故事的一个部分
        
        Args:
            conversation_id: 会话ID
            provider: AI提供商
            model: 模型名称（可选）
            model: 模型名称（可选，如果不提供则使用全局配置的默认模型）
            
        注意：apiKey, baseUrl, maxTokens, temperature 等配置参数将从数据库中的全局配置自动获取
        
        Returns:
            生成结果字典
        """
        progress = self.story_service.get_progress(conversation_id)
        if not progress or not progress.get('outline_confirmed'):
            return {
                "success": False,
                "error": "请先确认故事大纲"
            }
        
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        self.story_service.update_progress(
            conversation_id=conversation_id,
            status='generating'
        )
        
        messages, system_prompt = self._prepare_generation_context(conversation_id)
        
        user_message = "请根据大纲生成当前部分的故事内容。"
        result = self.ai_service.chat(
            provider=api_config['provider'],
            message=user_message,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature'],
            system_prompt=system_prompt,
            messages=messages
        )
        
        if result.get('success'):
            response_content = result.get('response', '')
            
            self.chat_service.save_user_message(conversation_id, user_message)
            self.chat_service.save_assistant_message(
                conversation_id=conversation_id,
                content=response_content,
                model=result.get('model'),
                provider=api_config['provider']
            )
            
            current_section = progress.get('current_section') or 0
            self.story_service.update_progress(
                conversation_id=conversation_id,
                last_generated_content=response_content,
                last_generated_section=current_section,
                status='completed'
            )
            
            self._check_and_mark_summary_needed(conversation_id, result)
            
            updated_progress = self.story_service.get_progress(conversation_id)
            if updated_progress:
                result['story_progress'] = updated_progress
        
        return result
    
    def confirm_section(
        self,
        conversation_id: str,
        provider: str,
        model: Optional[str] = None
    ) -> Dict:
        """
        确认当前部分，生成下一部分
        
        Args:
            conversation_id: 会话ID
            provider: AI提供商
            model: 模型名称（可选）
            model: 模型名称（可选，如果不提供则使用全局配置的默认模型）
            
        注意：apiKey, baseUrl, maxTokens, temperature 等配置参数将从数据库中的全局配置自动获取
        
        Returns:
            生成结果字典
        """
        # 获取进度
        progress = self.story_service.get_progress(conversation_id)
        if not progress:
            return {
                "success": False,
                "error": "故事进度不存在"
            }
        
        new_section = (progress.get('current_section') or 0) + 1
        self.story_service.update_progress(
            conversation_id=conversation_id,
            current_section=new_section,
            status='generating'
        )
        
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        messages, system_prompt = self._prepare_generation_context(conversation_id, current_section=new_section)
        
        user_message = "请继续生成下一部分故事内容。"
        result = self.ai_service.chat(
            provider=api_config['provider'],
            message=user_message,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature'],
            system_prompt=system_prompt,
            messages=messages
        )
        
        if result.get('success'):
            response_content = result.get('response', '')
            
            self.chat_service.save_user_message(conversation_id, user_message)
            self.chat_service.save_assistant_message(
                conversation_id=conversation_id,
                content=response_content,
                model=result.get('model'),
                provider=api_config['provider']
            )
            
            self.story_service.update_progress(
                conversation_id=conversation_id,
                last_generated_content=response_content,
                last_generated_section=new_section,
                status='completed'
            )
            
            # 检查是否需要总结
            self._check_and_mark_summary_needed(conversation_id, result)
            
            # 添加进度信息
            updated_progress = self.story_service.get_progress(conversation_id)
            if updated_progress:
                result['story_progress'] = updated_progress
        
        return result
    
    def rewrite_section(
        self,
        conversation_id: str,
        feedback: str,
        provider: str,
        model: Optional[str] = None
    ) -> Dict:
        """
        重写当前部分
        
        Args:
            conversation_id: 会话ID
            feedback: 用户反馈/重写要求
            provider: AI提供商
            model: 模型名称（可选）
            model: 模型名称（可选，如果不提供则使用全局配置的默认模型）
            
        注意：apiKey, baseUrl, maxTokens, temperature 等配置参数将从数据库中的全局配置自动获取
        
        Returns:
            生成结果字典
        """
        # 获取进度和最后生成的内容
        progress = self.story_service.get_progress(conversation_id)
        if not progress:
            return {
                "success": False,
                "error": "故事进度不存在"
            }
        
        previous_content = progress.get('last_generated_content')
        if not previous_content:
            return {
                "success": False,
                "error": "没有可重写的内容"
            }
        
        # 从数据库获取 API 配置（只需要 provider 和 model）
        api_config = self.ai_config_service.get_config_for_api(
            provider=provider,
            model=model
        )
        
        # 构建消息和系统提示
        messages, system_prompt = self._prepare_generation_context(conversation_id)
        
        # 构建重写提示
        user_message = build_feedback_prompt(feedback, previous_content)
        
        result = self.ai_service.chat(
            provider=api_config['provider'],
            message=user_message,
            model=api_config['model'],
            api_key=api_config['api_key'],
            base_url=api_config['base_url'],
            max_tokens=api_config['max_tokens'],
            temperature=api_config['temperature'],
            system_prompt=system_prompt,
            messages=messages
        )
        
        if result.get('success'):
            response_content = result.get('response', '')
            
            # 保存消息
            self.chat_service.save_user_message(conversation_id, feedback)
            self.chat_service.save_assistant_message(
                conversation_id=conversation_id,
                content=response_content,
                model=result.get('model'),
                provider=api_config['provider']
            )
            
            # 更新进度
            current_section = progress.get('current_section') or 0
            self.story_service.update_progress(
                conversation_id=conversation_id,
                last_generated_content=response_content,
                status='completed'
            )
            
            # 检查是否需要总结
            self._check_and_mark_summary_needed(conversation_id, result)
            
            # 添加进度信息
            updated_progress = self.story_service.get_progress(conversation_id)
            if updated_progress:
                result['story_progress'] = updated_progress
        
        return result
    
    def modify_section(
        self,
        conversation_id: str,
        feedback: str,
        provider: str,
        model: Optional[str] = None
    ) -> Dict:
        """
        修改当前部分（与重写类似，但语义上更偏向调整）
        
        Args:
            conversation_id: 会话ID
            feedback: 用户反馈/修改要求
            provider: AI提供商（必需）
            model: 模型名称（可选，如果不提供则使用全局配置的默认模型）
        
        Returns:
            生成结果字典
        """
        # 重写和修改逻辑相同，只是语义不同
        return self.rewrite_section(
            conversation_id=conversation_id,
            feedback=feedback,
            provider=provider,
            model=model
        )
    
    def _prepare_generation_context(
        self,
        conversation_id: str,
        current_section: Optional[int] = None
    ) -> tuple[List[Dict], str]:
        """
        准备生成上下文（消息历史和系统提示）
        
        Args:
            conversation_id: 会话ID
            current_section: 当前部分编号（可选，如果不提供则从进度中获取）
        
        Returns:
            (消息列表, 系统提示)
        """
        # 获取会话设置
        settings = self.conversation_service.get_settings(conversation_id)
        
        # 获取进度
        progress = self.story_service.get_progress(conversation_id)
        if current_section is None:
            current_section = progress.get('current_section') if progress else None
        total_sections = progress.get('total_sections') if progress else None
        
        # 获取总结
        summary = self.summary_service.get_summary(conversation_id)
        summary_text = summary.get('summary') if summary else None
        
        # 构建系统提示
        system_prompt = build_system_prompt(
            background=settings.get('background') if settings else None,
            characters=settings.get('characters') if settings else None,
            character_personality=settings.get('character_personality') if settings else None,
            outline=settings.get('outline') if settings else None,
            summary=summary_text,
            current_section=current_section,
            total_sections=total_sections
        )
        
        # 获取消息历史
        all_messages = self.chat_service.get_conversation(conversation_id)
        
        # 估算系统提示的 token 数量
        estimated_system_tokens = self.summary_service.estimate_tokens(system_prompt)
        
        # 构建消息历史（考虑 token 限制）
        messages_for_ai = []
        if summary_text:
            # 如果有总结，只使用总结之后的消息
            recent_count = self.config.RECENT_MESSAGES_WITH_SUMMARY
            recent_messages = all_messages[-recent_count:] if len(all_messages) > recent_count else all_messages
            messages_for_ai = [
                {"role": msg.get('role', 'user'), "content": msg.get('content', '')}
                for msg in recent_messages
            ]
        else:
            # 没有总结，使用消息历史（但考虑 token 限制）
            max_history = self.config.MAX_MESSAGE_HISTORY
            max_tokens = self.config.MAX_CONTEXT_TOKENS
            
            # 从最新消息开始，累加 token 直到达到限制
            selected_messages = []
            current_tokens = estimated_system_tokens
            
            for msg in reversed(all_messages):
                msg_content = msg.get('content', '')
                msg_tokens = self.summary_service.estimate_tokens(msg_content)
                
                # 如果加上这条消息会超过限制，停止添加
                if current_tokens + msg_tokens > max_tokens and len(selected_messages) > 0:
                    break
                
                # 如果已经达到最大消息数，停止添加
                if len(selected_messages) >= max_history:
                    break
                
                selected_messages.insert(0, msg)
                current_tokens += msg_tokens
            
            messages_for_ai = [
                {"role": msg.get('role', 'user'), "content": msg.get('content', '')}
                for msg in selected_messages
            ]
        
        return messages_for_ai, system_prompt
    
    def _check_and_mark_summary_needed(self, conversation_id: str, result: Dict):
        """
        检查是否需要总结，并在结果中标记
        
        Args:
            conversation_id: 会话ID
            result: 结果字典（会被修改）
        """
        updated_messages = self.chat_service.get_conversation(conversation_id)
        message_count = len(updated_messages)
        
        should_summarize = self.summary_service.should_summarize(
            conversation_id=conversation_id,
            message_count=message_count,
            threshold=self.config.SUMMARY_THRESHOLD,
            estimated_tokens_per_message=self.config.ESTIMATED_TOKENS_PER_MESSAGE
        )
        
        if should_summarize:
            result['needs_summary'] = True
            result['message_count'] = message_count
        else:
            result['needs_summary'] = False

