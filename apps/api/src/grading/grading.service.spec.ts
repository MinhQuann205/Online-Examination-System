import { GradingService, parseStudentAnswer } from './grading.service';

const questionId = '10000000-0000-4000-8000-000000000001';
const snapshot = {
  title: 'Grading test',
  description: null,
  durationMin: 30,
  questions: [
    {
      id: questionId,
      questionId,
      position: 0,
      points: 2.5,
      type: 'SINGLE_CHOICE' as const,
      content: 'Pick one',
      explanation: null,
      options: [
        {
          id: '20000000-0000-4000-8000-000000000001',
          content: 'A',
          isCorrect: true,
        },
        {
          id: '20000000-0000-4000-8000-000000000002',
          content: 'B',
          isCorrect: false,
        },
      ],
      matchingPairs: [],
    },
    {
      id: '30000000-0000-4000-8000-000000000001',
      questionId: '30000000-0000-4000-8000-000000000001',
      position: 1,
      points: 1.25,
      type: 'MULTIPLE_CHOICE' as const,
      content: 'Pick both',
      explanation: null,
      options: [
        {
          id: '40000000-0000-4000-8000-000000000001',
          content: 'A',
          isCorrect: true,
        },
        {
          id: '40000000-0000-4000-8000-000000000002',
          content: 'B',
          isCorrect: true,
        },
        {
          id: '40000000-0000-4000-8000-000000000003',
          content: 'C',
          isCorrect: false,
        },
      ],
      matchingPairs: [],
    },
    {
      id: '50000000-0000-4000-8000-000000000001',
      questionId: '50000000-0000-4000-8000-000000000001',
      position: 2,
      points: 3,
      type: 'MATCHING' as const,
      content: 'Match',
      explanation: null,
      options: [],
      matchingPairs: [
        {
          id: '60000000-0000-4000-8000-000000000001',
          rightId: '70000000-0000-4000-8000-000000000001',
          leftText: 'Left',
          rightText: 'Right',
        },
      ],
    },
  ],
};

describe('GradingService', () => {
  const service = new GradingService();

  it('grades exact single, multiple and matching answers with decimal points', () => {
    const result = service.grade(snapshot, [
      {
        questionId,
        answer: { optionId: '20000000-0000-4000-8000-000000000001' },
      },
      {
        questionId: '30000000-0000-4000-8000-000000000001',
        answer: {
          optionIds: [
            '40000000-0000-4000-8000-000000000001',
            '40000000-0000-4000-8000-000000000002',
          ],
        },
      },
      {
        questionId: '50000000-0000-4000-8000-000000000001',
        answer: {
          pairs: [
            {
              leftId: '60000000-0000-4000-8000-000000000001',
              rightId: '70000000-0000-4000-8000-000000000001',
            },
          ],
        },
      },
    ]);

    expect(result.score.toFixed(2)).toBe('6.75');
    expect(result.maxScore.toFixed(2)).toBe('6.75');
    expect(result.correctCount).toBe(3);
    expect(result.wrongCount).toBe(0);
    expect(result.unansweredCount).toBe(0);
  });

  it('awards zero for incomplete or extra multiple-choice selections', () => {
    const result = service.grade(snapshot, [
      {
        questionId: '30000000-0000-4000-8000-000000000001',
        answer: { optionIds: ['40000000-0000-4000-8000-000000000001'] },
      },
      {
        questionId: '50000000-0000-4000-8000-000000000001',
        answer: { pairs: [] },
      },
    ]);
    expect(result.score.toFixed(2)).toBe('0.00');
    expect(result.wrongCount).toBe(1);
    expect(result.unansweredCount).toBe(2);
  });

  it('rejects answer identifiers not found in the frozen question', () => {
    expect(() =>
      parseStudentAnswer(snapshot.questions[0], {
        optionId: '80000000-0000-4000-8000-000000000001',
      }),
    ).toThrow();
  });
});
