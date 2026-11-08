import type { StepSection } from './types';

export function parseStepsText(text: string): StepSection[] {
  const sections: StepSection[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (line.trimStart().startsWith('## ')) {
      sections.push({ section: line.trim().slice(3).trim(), steps: [] });
    } else {
      if (!sections.length) sections.push({ section: '', steps: [] });
      sections[sections.length - 1].steps.push(line);
    }
  }
  return sections;
}

export function stepsToText(sections: StepSection[]): string {
  return sections
    .flatMap(({ section, steps }) => [...(section ? [`## ${section}`] : []), ...steps])
    .join('\n');
}
