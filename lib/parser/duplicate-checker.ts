import { CiscoCommand } from '../types';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingCommand?: CiscoCommand;
}

export function checkDuplicateCommand(
  newCommandText: string,
  existingCommands: CiscoCommand[]
): DuplicateCheckResult {
  const normalizedNew = newCommandText.trim().toLowerCase();

  const match = existingCommands.find(
    c => c.command.trim().toLowerCase() === normalizedNew
  );

  if (match) {
    return {
      isDuplicate: true,
      existingCommand: match
    };
  }

  return { isDuplicate: false };
}
