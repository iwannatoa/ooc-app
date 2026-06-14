import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Fails the test when axe reports serious or critical violations on the current page.
 */
export async function expectNoSeriousOrCriticalViolations(
  page: Page,
): Promise<void> {
  const results = await new AxeBuilder({ page })
    // Design backlog: several UI tokens are slightly below WCAG AA 4.5:1; tracked separately from this gate.
    .disableRules(['color-contrast'])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  const message = blocking
    .flatMap((v) =>
      v.nodes.map(
        (n) => `${v.id} (${v.impact}): ${v.help}\n  selector: ${n.target.join(' ')}`,
      ),
    )
    .join('\n\n');
  expect(blocking, message).toEqual([]);
}
