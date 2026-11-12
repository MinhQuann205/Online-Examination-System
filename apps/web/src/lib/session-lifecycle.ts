// A response from a previous account must never enter the current query cache.
export class SessionLifecycle {
  private generation = 0;
  private changing = false;
  invalidate() {
    this.generation++;
  }
  capture() {
    return this.generation;
  }
  available() {
    return !this.changing;
  }
  begin() {
    if (this.changing)
      throw new Error('Một thao tác tài khoản đang được xử lý.');
    this.changing = true;
    this.generation++;
  }
  finish() {
    this.generation++;
    this.changing = false;
  }
  assertCurrent(generation: number) {
    if (generation !== this.generation || this.changing)
      throw new Error('Phản hồi của phiên trước đã bị bỏ qua.');
  }
}
export const sessionLifecycle = new SessionLifecycle();

// Shared by client modules in this document; never used as an auth credential.
export const sessionDocumentId = crypto.randomUUID();
