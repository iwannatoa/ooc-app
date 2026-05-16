import { expect, test } from '@playwright/test';
import { installMockStoryApi } from './helpers/mockStoryApi';
import {
  clickNewStory,
  gotoApp,
  installE2eTauriHooks,
  saveStorySettings,
} from './helpers/storyFlow';

test.describe('StoryActions stream + confirm', () => {
  test.beforeEach(async ({ page }) => {
    await installMockStoryApi(page);
    await installE2eTauriHooks(page);
  });

  test('generate first chapter then confirm next chapter finishes loading', async ({
    page,
  }) => {
    await gotoApp(page);

    await clickNewStory(page);
    await saveStorySettings(page, {
      background: 'E2E story-actions background.',
      outline: 'Act I · Act II · Act III',
    });

    const storyGenButton = page.getByRole('button', {
      name: /Generate First Chapter|生成第一章|Continue Current Chapter|续写当前章节/i,
    });
    await storyGenButton.click();
    await expect(page.getByText('E2E generated chapter prose.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(storyGenButton).toHaveText(
      /Continue Current Chapter|续写当前章节/i,
      { timeout: 15_000 }
    );
    await expect(
      page.getByRole('button', { name: /Generating|正在生成/i })
    ).toHaveCount(0);

    const nextChapter = page.getByRole('button', {
      name: /Next Chapter|下一章/i,
    });
    await expect(nextChapter).toBeVisible();
    await nextChapter.click();

    await expect(
      page.getByText(
        /Confirm and move to the next chapter|确定要定稿并进入下一章/i
      )
    ).toBeVisible();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /Next chapter|进入下一章/i })
      .click();

    await expect(
      page.getByText('E2E confirm: chapter advanced.')
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('button', { name: /Advancing|正在进入下一章/i })
    ).toHaveCount(0);
    await expect(nextChapter).toBeEnabled();
  });
});
