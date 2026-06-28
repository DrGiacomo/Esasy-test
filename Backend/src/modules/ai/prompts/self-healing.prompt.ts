import { AiMessage } from '../providers/ai-provider.interface';

export function buildSelfHealingPrompt(
  action: string,
  brokenSelector: string,
  pageHtml: string,
  withScreenshot = false,
): AiMessage[] {
  const visionNote = withScreenshot
    ? `\nA screenshot of the page at the moment of failure is attached. Use it to locate the intended element visually before choosing a selector.`
    : '';

  return [
    {
      role: 'system',
      content: `You are an expert at fixing broken Playwright selectors.
Given a broken CSS/XPath selector and the current page HTML${withScreenshot ? ' (plus a screenshot)' : ''}, propose a new, robust selector.
Prefer stable strategies in this order: data-testid, ARIA role + accessible name, visible text, id, then a short CSS path. Avoid brittle nth-child chains.
Respond with JSON only: { "selector": "...", "selectorType": "css|xpath|role|text|testId", "confidence": 0.0-1.0, "reasoning": "..." }`,
    },
    {
      role: 'user',
      content: `Action: ${action}
Broken selector: ${brokenSelector}${visionNote}
Page HTML (relevant excerpt):
${pageHtml.substring(0, 4000)}

Propose a new selector:`,
    },
  ];
}
