import { AiMessage } from '../providers/ai-provider.interface';

export function buildNlToFlowPrompt(naturalLanguage: string, baseUrl: string): AiMessage[] {
  return [
    {
      role: 'system',
      content: `You are an expert QA engineer. Convert a natural language test description into a structured semantic test model.
Output ONLY a JSON array of steps. Each step: { "action": "click|fill|navigate|assert|hover|wait|select", "target": "description of element", "value": "value if needed", "assertion": "expected value if assert" }
No explanations.`,
    },
    {
      role: 'user',
      content: `Base URL: ${baseUrl}
Test description: "${naturalLanguage}"

Generate the semantic test model:`,
    },
  ];
}
