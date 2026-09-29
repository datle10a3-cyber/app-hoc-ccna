import { isQualityCommandExplanation } from '../explained-command-index';

export interface StructuredCommandExplanation {
  commandPattern: string;
  explanation: string;
  category: string;
  configMode: string;
  relatedCommands: string[];
  confidence: number;
}

export function validateCommandExplanations(value: unknown, requestedPatterns: string[]): StructuredCommandExplanation[] {
  const root = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  if (!Array.isArray(root.explanations)) return [];
  const requested = new Set(requestedPatterns);
  const results: StructuredCommandExplanation[] = [];
  for (const raw of root.explanations) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const commandPattern = typeof item.commandPattern === 'string' ? item.commandPattern.trim() : '';
    const explanation = typeof item.explanation === 'string' ? item.explanation.trim() : '';
    const category = typeof item.category === 'string' ? item.category.trim().slice(0, 60) : '';
    const configMode = typeof item.configMode === 'string' ? item.configMode.trim().slice(0, 60) : '';
    const relatedCommands = Array.isArray(item.relatedCommands)
      ? item.relatedCommands.filter((command): command is string => typeof command === 'string' && command.trim().length > 0 && command.length <= 140).slice(0, 4)
      : [];
    const confidence = typeof item.confidence === 'number' && Number.isFinite(item.confidence) ? Math.max(0, Math.min(1, item.confidence)) : 0.5;
    if (!requested.has(commandPattern) || results.some(result => result.commandPattern === commandPattern) ||
        !category || !configMode || !isQualityCommandExplanation(explanation)) continue;
    results.push({ commandPattern, explanation, category, configMode, relatedCommands, confidence });
  }
  return results;
}
