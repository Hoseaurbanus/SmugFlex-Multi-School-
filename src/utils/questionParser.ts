export interface ParsedQuestion {
  question_text: string;
  question_type: 'single_choice' | 'multi_select' | 'true_false' | 'fill_in_blank';
  options: string[];
  correct_answer: string | string[];
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  explanation: string;
  passage_text: string;
  section: string;
  section_instructions: string;
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00A0/g, ' ');
}

function stripLine(line: string): string {
  return line.trim().replace(/^["""""']|["""""']$/g, '').trim();
}

function detectSection(line: string): string | null {
  const _s = line.trim().toLowerCase();
  if (/^section\s+[a-d]\b/i.test(line.trim())) return line.trim();
  if (/^(part|instruction|passage)\s+\w/i.test(line.trim())) return line.trim();
  return null;
}

function detectSectionInstruction(line: string): string | null {
  const s = line.trim().toLowerCase();
  if (/^(answer|instruction|note)/i.test(s)) return line.trim();
  if (/answer\s+(all|any|every)/i.test(s)) return line.trim();
  return null;
}

function detectAnswerLine(line: string): { correct_answer: string | string[] } | null {
  const s = line.trim();
  const m = s.match(/^(?:answer|correct|ans|key)\s*[:.\-–—]\s*(.+)/i);
  if (!m) return null;
  const val = m[1].trim();

  if (/^[A-D](?:\s*,\s*[A-D])+$/i.test(val)) {
    const letters = val.split(/\s*,\s*/).map(x => x.trim().toUpperCase());
    return { correct_answer: letters };
  }
  if (/^[A-D]\.?\s*/i.test(val)) {
    const letter = val.replace(/^([A-D]).*/i, '$1').toUpperCase();
    return { correct_answer: letter };
  }
  if (/^(true|false)$/i.test(val)) {
    return { correct_answer: val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() };
  }
  return { correct_answer: val };
}

function detectOptions(lines: string[], startIdx: number): { options: string[]; endIdx: number } {
  const options: string[] = [];
  let i = startIdx;
  const primaryPatterns = [
    /^([A-Da-d])[.)\]]\s*(.+)/,
    /^\(([A-Da-d])\)\s*(.+)/,
    /^(?:[A-Da-d])\s{2,}(.+)/,
    /^(?:option\s+)?([A-D])\s*[:.\-]\s*(.+)/i,
  ];

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    if (/^\d+[.)\]]?\s/.test(line) || /^question\s+\d/i.test(line) ||
        /^(answer|correct|ans|key)\s*[:]/i.test(line) ||
        /^section\s+[a-d]/i.test(line) ||
        line.startsWith('---') || line.startsWith('===')) break;

    const multiResult = splitMultiOptionLine(line);
    if (multiResult) {
      options.push(...multiResult);
      i++;
      continue;
    }

    let matched = false;
    for (const p of primaryPatterns) {
      const m = line.match(p);
      if (m) {
        const text = m[2]?.trim() || '';
        if (text) {
          options.push(text);
          matched = true;
          break;
        }
      }
    }

    if (!matched && options.length > 0) {
      const fm = line.match(/^([A-Da-d])\s(.+)/);
      if (fm) {
        const text = fm[2]?.trim() || '';
        if (text && text.length < 60) {
          options.push(text);
          matched = true;
        }
      }
    }

    if (matched) { i++; continue; }

    if (options.length > 0 && line.length > 3 && !/^[A-D]/i.test(line)) {
      options[options.length - 1] += ' ' + line;
      i++;
      continue;
    }

    break;
  }

  return { options, endIdx: i };
}

function splitMultiOptionLine(line: string): string[] | null {
  const regex = /([A-Da-d])[.)\]\s]/g;
  const markers: number[] = [];
  let m;
  while ((m = regex.exec(line)) !== null) {
    markers.push(m.index);
  }
  if (markers.length < 3) return null;

  const parts: string[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i];
    const afterPrefix = line.substring(start).match(/^[A-Da-d][.)\]\s]+/);
    const contentStart = start + (afterPrefix ? afterPrefix[0].length : 0);
    const contentEnd = i + 1 < markers.length ? markers[i + 1] : line.length;
    const content = line.substring(contentStart, contentEnd).trim();
    if (content) parts.push(content);
  }

  return parts.length >= 3 ? parts : null;
}

function detectFillInBlank(text: string): boolean {
  return /_{3,}|\[blank\]|\(blank\)|\bblank\b/i.test(text);
}

function extractOptionsFromText(text: string): { questionText: string; options: string[] } | null {
  const optMarkerRegex = /(?:^|\s{2,})([A-Da-d])[.)\]](?:\s*)/g;
  const markers: { letter: string; index: number }[] = [];
  let m;
  while ((m = optMarkerRegex.exec(text)) !== null) {
    markers.push({ letter: m[1].toUpperCase(), index: m.index });
  }

  if (markers.length < 3) return null;

  const letters = markers.map(mr => mr.letter);
  const isValidSequence = letters.every((l, i) => {
    if (i === 0) return true;
    return l.charCodeAt(0) === letters[i - 1].charCodeAt(0) + 1;
  });
  if (!isValidSequence) return null;

  const questionText = text.substring(0, markers[0].index).trim();

  const options: string[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    let optSegment = text.substring(start, end).trim();
    const prefixMatch = optSegment.match(/^[A-Da-d][.)\]\s]+/);
    if (prefixMatch) {
      optSegment = optSegment.substring(prefixMatch[0].length).trim();
    }
    options.push(optSegment);
  }

  return { questionText, options: options.filter(Boolean) };
}

export function parseQuestions(rawText: string): ParsedQuestion[] {
  const text = normalizeText(rawText);
  const lines = text.split('\n').map(stripLine).filter(l => l !== null);
  const questions: ParsedQuestion[] = [];

  let currentSection = '';
  let currentSectionInstruction = '';
  let currentPassage = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line) { i++; continue; }

    const section = detectSection(line);
    if (section) {
      currentSection = section;
      currentSectionInstruction = '';
      currentPassage = '';
      if (i + 1 < lines.length) {
        const instr = detectSectionInstruction(lines[i + 1]);
        if (instr) {
          currentSectionInstruction = lines[i + 1];
          i += 2;
          continue;
        }
      }
      let passageLines: string[] = [];
      let pi = i + 1;
      while (pi < lines.length && !/^\d+[.)\]]?\s/.test(lines[pi]) &&
             !/^question\s+\d/i.test(lines[pi]) &&
             !detectSection(lines[pi])) {
        if (lines[pi] && !detectAnswerLine(lines[pi])) {
          passageLines.push(lines[pi]);
        }
        pi++;
      }
      if (passageLines.length > 0 && passageLines.length < 20) {
        currentPassage = passageLines.join(' ');
        i = pi;
        continue;
      }
      i++;
      continue;
    }

    let qText = '';
    let qNum = '';
    let matched = false;

    const qMatch = line.match(/^(?:Question\s+)?(\d+)[.)\]]?\s+(.+)/i);
    const qMatch2 = line.match(/^Q\.?\s*(\d+)[.)\]]?\s+(.+)/i);
    const match = qMatch || qMatch2;

    if (match) {
      qText = match[2]?.trim() || '';
      qNum = match[1];
      matched = true;
    } else {
      const numOnly = line.match(/^(\d+)[.)\]]?\s*$/);
      if (numOnly) {
        let ahead = i + 1;
        while (ahead < lines.length && !lines[ahead].trim()) ahead++;
        if (ahead < lines.length) {
          const nextLine = lines[ahead];
          let nextText = nextLine;
          const numPrefix = nextLine.match(/^\d+[.)\]]?\s+/);
          if (numPrefix) {
            nextText = nextLine.substring(numPrefix[0].length);
          }
          qText = nextText.trim();
          qNum = numOnly[1];
          matched = true;
          i = ahead;
        }
      }
    }

    if (matched) {
      i++;

      let options: string[] = [];
      let correctAnswer: string | string[] = '';
      let explanation = '';

      let inlineResult = extractOptionsFromText(qText);
      if (inlineResult) {
        qText = inlineResult.questionText;
        options = inlineResult.options;
      }

      const isTF = !inlineResult && (/^(true\s*\/?\s*false|true or false)/i.test(qText) ||
                   lines.slice(i, i + 3).some(l => /^(true|false)[\s.:)]/i.test(l)));
      const isFIB = !inlineResult && (detectFillInBlank(qText) || detectFillInBlank(lines.slice(i, i + 3).join(' ')));

      let questionType: ParsedQuestion['question_type'] = 'single_choice';

      if (isTF) {
        questionType = 'true_false';
        options = ['True', 'False'];
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          const ans = detectAnswerLine(lines[j]);
          if (ans) {
            correctAnswer = typeof ans.correct_answer === 'string' ? ans.correct_answer : ans.correct_answer[0];
            i = j;
            break;
          }
        }
        if (!correctAnswer) correctAnswer = 'True';
      } else if (isFIB) {
        questionType = 'fill_in_blank';
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          const ans = detectAnswerLine(lines[j]);
          if (ans) {
            correctAnswer = typeof ans.correct_answer === 'string' ? ans.correct_answer : ans.correct_answer.join(', ');
            i = j;
            break;
          }
        }
      } else {
        if (options.length === 0) {
          const result = detectOptions(lines, i);
          options = result.options;
          i = result.endIdx;
        }

        for (let j = i; j < Math.min(i + 3, lines.length); j++) {
          const ans = detectAnswerLine(lines[j]);
          if (ans) {
            correctAnswer = ans.correct_answer;
            if (typeof correctAnswer === 'string' && /^[A-D]$/i.test(correctAnswer)) {
              const idx = correctAnswer.toUpperCase().charCodeAt(0) - 65;
              if (options[idx]) {
                correctAnswer = options[idx];
              }
            } else if (Array.isArray(correctAnswer)) {
              correctAnswer = correctAnswer.map((letter: string) => {
                const idx = letter.charCodeAt(0) - 65;
                return options[idx] || letter;
              }).filter(Boolean);
            }
            i = j;
            break;
          }
        }

        if (i + 1 < lines.length && /^(explanation|reason|why)\s*[:.\-]/i.test(lines[i + 1])) {
          explanation = lines[i + 1].replace(/^(explanation|reason|why)\s*[:.\-]\s*/i, '');
          i += 2;
        }

        if (options.length === 0 && !correctAnswer) {
          let textLines: string[] = [];
          while (i < lines.length && lines[i].trim() &&
                 !/^\d+[.)\]]?\s/.test(lines[i]) &&
                 !/^question\s+\d/i.test(lines[i]) &&
                 !detectAnswerLine(lines[i]) &&
                 !detectSection(lines[i])) {
            textLines.push(lines[i].trim());
            i++;
          }
          if (textLines.length >= 2) {
            options = textLines;
            if (i < lines.length) {
              const ans = detectAnswerLine(lines[i]);
              if (ans) {
                correctAnswer = typeof ans.correct_answer === 'string' ? ans.correct_answer : ans.correct_answer[0];
              }
            }
          }
        }
      }

      qText = qText.replace(/^(true\s*\/?\s*false|true or false)[:\s]*/i, '').trim();

      questions.push({
        question_text: qText,
        question_type: questionType,
        options: questionType !== 'fill_in_blank' ? options : [],
        correct_answer: correctAnswer || 'True',
        marks: 1,
        difficulty: 'medium',
        topic: '',
        explanation,
        passage_text: currentPassage,
        section: currentSection,
        section_instructions: currentSectionInstruction,
      });

      continue;
    }

    i++;
  }

  if (questions.length === 0 && text.length > 20) {
    const firstSentence = text.split(/[.!?]/).filter(s => s.trim().length > 15)[0] || text.substring(0, 100);
    questions.push({
      question_text: `Based on the document, what is stated about: "${firstSentence.trim().substring(0, 80)}"?`,
      question_type: 'single_choice',
      options: [
        firstSentence.trim().substring(0, 60),
        'The opposite of what is stated',
        'Something not mentioned',
        'None of the above',
      ],
      correct_answer: firstSentence.trim().substring(0, 60),
      marks: 1,
      difficulty: 'medium',
      topic: '',
      explanation: '',
      passage_text: '',
      section: '',
      section_instructions: '',
    });
  }

  return questions;
}

export async function readFileContent(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'txt') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file, 'utf-8');
    });
  }

  if (ext === 'docx') {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  throw new Error('Unsupported file format. Use .txt or .docx files.');
}
