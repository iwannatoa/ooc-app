"""Multi-table writes under one Session roll back together."""
import pytest

from infrastructure.database import unit_of_work
from repository.chat_repository import ChatRepository
from repository.conversation_repository import ConversationRepository


@pytest.fixture
def repos(injector):
    return {
        'chat': injector.get(ChatRepository),
        'conversation': injector.get(ConversationRepository),
    }


def test_uow_rollback_reverts_chat_and_settings(repos):
    cid = 'uow_conv_1'
    repos['conversation'].create_or_update_settings(
        conversation_id=cid,
        title='SeedTitle',
        background='bg',
    )

    with pytest.raises(RuntimeError, match='abort'):
        with unit_of_work() as session:
            repos['chat'].save_message(
                conversation_id=cid,
                role='user',
                content='hello',
                session=session,
            )
            repos['conversation'].create_or_update_settings(
                conversation_id=cid,
                title='ShouldNotCommit',
                session=session,
            )
            raise RuntimeError('abort')

    assert repos['chat'].get_conversation_messages(cid) == []
    settings = repos['conversation'].get_settings(cid)
    assert settings is not None
    assert settings.title == 'SeedTitle'


def test_uow_commit_persists_both_tables(repos):
    cid = 'uow_conv_2'
    repos['conversation'].create_or_update_settings(
        conversation_id=cid,
        title='T0',
        background='bg',
    )

    with unit_of_work() as session:
        repos['chat'].save_message(
            conversation_id=cid,
            role='user',
            content='m1',
            session=session,
        )
        repos['conversation'].create_or_update_settings(
            conversation_id=cid,
            title='T1',
            session=session,
        )

    msgs = repos['chat'].get_conversation_messages(cid)
    assert len(msgs) == 1
    assert msgs[0].content == 'm1'
    settings = repos['conversation'].get_settings(cid)
    assert settings.title == 'T1'

