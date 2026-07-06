import { describe, it, expect } from 'vitest';
import { parseQuestions } from './questionParser';

describe('parseQuestions', () => {
  it('returns empty array for empty input', () => {
    expect(parseQuestions('')).toEqual([]);
  });

  it('parses single-choice question with labeled options', () => {
    const input = `1. What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
Answer: B`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].question_text).toContain('What is 2 + 2?');
    expect(questions[0].question_type).toBe('single_choice');
    expect(questions[0].options).toHaveLength(4);
    expect(questions[0].correct_answer).toBe('4');
  });

  it('parses true/false questions', () => {
    const input = `1. True or False: The Earth is flat.
Answer: False`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].question_type).toBe('true_false');
    expect(questions[0].options).toEqual(['True', 'False']);
    expect(questions[0].correct_answer).toBe('False');
  });

  it('parses fill-in-the-blank questions', () => {
    const input = `1. The capital of France is ___?
Answer: Paris`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].question_type).toBe('fill_in_blank');
    expect(questions[0].correct_answer).toBe('Paris');
  });

  it('parses multiple questions', () => {
    const input = `1. What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
Answer: B

2. What is 3 + 3?
A. 5
B. 6
C. 7
D. 8
Answer: B`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(2);
  });

  it('handles questions with "Question" prefix', () => {
    const input = `Question 1. What is the largest planet?
A. Earth
B. Mars
C. Jupiter
D. Venus
Answer: C`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].correct_answer).toBe('Jupiter');
  });

  it('handles questions with Q. prefix', () => {
    const input = `Q.1 What is H2O?
A. Oxygen
B. Water
C. Hydrogen
D. Carbon
Answer: B`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].correct_answer).toBe('Water');
  });

  it('handles sections', () => {
    const input = `Section A: Mathematics
Answer all questions

1. What is 5 x 5?
A. 20
B. 25
C. 30
D. 35
Answer: B`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].section).toBe('Section A: Mathematics');
  });

  it('handles multi-answer questions', () => {
    const input = `1. Which are prime numbers?
A. 2
B. 4
C. 7
D. 9
Answer: A, C`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].correct_answer).toEqual(['2', '7']);
  });

  it('handles questions with inline options', () => {
    const input = `1. What color is the sky?  A. Red  B. Blue  C. Green  D. Yellow
Answer: B`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].options).toHaveLength(4);
  });

  it('handles explanation lines', () => {
    const input = `1. What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
Answer: B
Explanation: 2 + 2 equals 4`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].explanation).toContain('2 + 2 equals 4');
  });

  it('handles multi-option lines (A. X B. Y C. Z D. W)', () => {
    const input = `1. What is 2 + 2?  A. 3  B. 4  C. 5  D. 6
Answer: B`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].options).toHaveLength(4);
  });

  it('generates a fallback question for long text without structure', () => {
    const longText = `This is a very long passage of text that describes something important about the topic at hand and continues for quite a while.`;
    const questions = parseQuestions(longText);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0].question_text).toContain('Based on the document');
  });

  it('handles Windows line endings', () => {
    const input = "1. What is 2 + 2?\r\nA. 3\r\nB. 4\r\nC. 5\r\nD. 6\r\nAnswer: B";
    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].options).toHaveLength(4);
  });

  it('handles passage/section context', () => {
    const input = `Section A: Science
Read the passage and answer the questions.

The sun is a star at the center of our solar system.

1. What is the sun?
A. A planet
B. A star
C. A moon
D. A comet
Answer: B`;

    const questions = parseQuestions(input);
    expect(questions).toHaveLength(1);
    expect(questions[0].section).toBe('Section A: Science');
    expect(questions[0].passage_text).toContain('sun is a star');
  });
});
