const guards = new Set<() => string>();
export function hasLocalExamGuard() {
  return guards.size > 0;
}
const channelName = 'examspace-exam-guard-v1';
type Probe = { type: 'probe'; id: string };
type Reply = { type: 'busy'; id: string };
export function registerExamGuard(describe: () => string) {
  guards.add(describe);
  const channel =
    typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel(channelName);
  if (channel)
    channel.onmessage = (event: MessageEvent<Probe>) => {
      if (event.data?.type === 'probe' && typeof event.data.id === 'string')
        channel.postMessage({
          type: 'busy',
          id: event.data.id,
        } satisfies Reply);
    };
  return () => {
    guards.delete(describe);
    channel?.close();
  };
}
export async function checkExamBeforeLogout(): Promise<string | null> {
  if (guards.size) return [...guards][0]();
  if (typeof BroadcastChannel === 'undefined')
    return 'Trình duyệt không hỗ trợ kiểm tra bài thi ở tab khác. Hãy đóng các tab phòng thi rồi dùng trình duyệt hỗ trợ để đăng xuất an toàn.';
  const channel = new BroadcastChannel(channelName);
  const id = crypto.randomUUID();
  return new Promise((resolve) => {
    let busy = false;
    channel.onmessage = (event: MessageEvent<Reply>) => {
      if (event.data?.type === 'busy' && event.data.id === id) busy = true;
    };
    channel.postMessage({ type: 'probe', id } satisfies Probe);
    setTimeout(() => {
      channel.close();
      resolve(
        busy
          ? 'Một phòng thi đang mở ở tab khác. Hãy quay lại phòng thi, kiểm tra trạng thái lưu và rời hoặc đóng phòng thi trước khi đăng xuất. Hệ thống chưa gửi yêu cầu đăng xuất.'
          : null,
      );
    }, 350);
  });
}
