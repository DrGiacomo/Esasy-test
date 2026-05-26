import { AiMessage } from '../providers/ai-provider.interface';

export function buildSelfHealingPrompt(
  action: string,
  brokenSelector: string,
  pageHtml: string,
): AiMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert at fixing broken Playwright selectors.
Given a broken CSS/XPath selector and the current page HTML, propose a new selector.
Respond with JSON only: { "selector": "...", "selectorType": "css|xpath|role|text|testId", "confidence": 0.0-1.0, "reasoning": "..." }`,
    },
    {
      role: 'user',
      content: `Action: ${action}
Broken selector: ${brokenSelector}
Page HTML (relevant excerpt):
${pageHtml.substring(0, 4000)}

Propose a new selector:`,
    },
  ];
}
