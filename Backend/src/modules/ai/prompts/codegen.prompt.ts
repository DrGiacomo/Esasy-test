import { AiMessage } from '../providers/ai-provider.interface';

export function buildCodegenPrompt(testName: string, semanticModel: unknown): AiMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert Playwright test engineer.
Generate TypeScript Page Object Model (POM) code from a semantic test model.
Output ONLY valid TypeScript code. No explanations, no markdown fences.
Follow these rules:
- Use Playwright's page fixture
- Create a class per page
- Each method corresponds to one semantic action
- Use expect() for assertions
- Use data-testid selectors when available, fall back to role/text`,
    },
    {
      role: 'user',
      content: `Test name: "${testName}"
Semantic model: ${JSON.stringify(semanticModel, null, 2)}

Generate the TypeScript POM code:`,
    },
  ];
}
