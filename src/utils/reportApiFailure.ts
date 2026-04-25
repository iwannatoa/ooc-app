import {
  getApiErrorActionHint,
  isPersistFailedError,
} from '@/utils/apiErrorHints';

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string;

export interface ReportApiFailureOptions {
  t: TranslateFn;
  showError: (message: string) => void;
  showWarning?: (message: string) => void;
  /** i18n key for template with `{detail}` (e.g. storyErrors.generateFailedDetail). */
  detailKey: string;
  /**
   * Namespace for hint keys from getApiErrorActionHint (e.g. storyErrors.hint_network).
   * Omit to append no hint.
   */
  hintNamespace?: string;
}

/**
 * Maps API/network errors to a single toast; handles persist_failed as warning when requested.
 */
export function reportApiFailureToToast(
  error: unknown,
  ctx: ReportApiFailureOptions
): void {
  if (isPersistFailedError(error) && ctx.showWarning) {
    ctx.showWarning(ctx.t('storyErrors.persistStreamBodySavedNotHistory'));
    return;
  }

  const detail =
    error instanceof Error ? error.message : ctx.t('storyErrors.unknownDetail');
  const hintSuffix = getApiErrorActionHint(error);
  const hint =
    hintSuffix && ctx.hintNamespace
      ? ctx.t(`${ctx.hintNamespace}.${hintSuffix}`)
      : '';
  ctx.showError(
    ctx.t(ctx.detailKey, {
      detail: hint ? `${detail} ${hint}` : detail,
    })
  );
}
