import { historicalExamMetadata } from './exam-metadata';
describe('Historical exam metadata', () => {
  it('projects immutable title/duration without the private answer key', () => {
    expect(
      historicalExamMetadata({
        title: 'Published v1',
        durationMin: 30,
        questions: [{ isCorrect: true }],
      }),
    ).toEqual({
      title: 'Published v1',
      durationMin: 30,
      metadataAvailable: true,
    });
  });
  it('marks missing legacy metadata explicitly instead of taking the mutable parent title', () => {
    for (const snapshot of [null, {}, { title: 'Incomplete' }])
      expect(historicalExamMetadata(snapshot)).toEqual({
        title: 'Thông tin phiên bản không khả dụng',
        durationMin: null,
        metadataAvailable: false,
      });
  });
});
