import { CiscoCommand, Lesson, PasteItemParsed } from '../types';

export function detectDuplicates(
  items: PasteItemParsed[],
  existingCommands: CiscoCommand[],
  existingLessons: Lesson[]
): PasteItemParsed[] {
  return items.map(item => {
    const textLower = item.rawContent.toLowerCase();

    // Check existing commands
    for (const cmd of existingCommands) {
      const cmdNameLower = cmd.command.toLowerCase();
      if (textLower.includes(cmdNameLower) || (item.classification === 'Command' && cmdNameLower === textLower)) {
        return {
          ...item,
          duplicateMatch: {
            type: 'command',
            existingId: cmd.id,
            existingTitle: `${cmd.command} (${cmd.title})`,
            confidence: 0.95
          },
          action: 'use-existing'
        };
      }
    }

    // Check existing lessons
    for (const lesson of existingLessons) {
      const lessonTitleLower = lesson.title.toLowerCase();
      if (item.title && item.title.toLowerCase() === lessonTitleLower) {
        return {
          ...item,
          duplicateMatch: {
            type: 'lesson',
            existingId: lesson.id,
            existingTitle: lesson.title,
            confidence: 0.85
          },
          action: 'merge'
        };
      }
    }

    return item;
  });
}
