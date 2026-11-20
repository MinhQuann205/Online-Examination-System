'use strict';
const actions = {
  'Xuất bản': { title: 'Xuất bản đề thi?', confirm: 'Xuất bản đề thi' },
  'Tạo phiên bản mới': {
    title: 'Tạo bản nháp mới?',
    confirm: 'Tạo bản nháp mới',
  },
  'Giao bài': { title: 'Xác nhận giao bài?', confirm: 'Xác nhận giao bài' },
};
async function clickWebAction(page, label) {
  const action = actions[label];
  if (!action) throw new Error('Unknown web confirmation action');
  await page
    .getByRole('button', {
      name: label === 'Giao bài' ? 'Kiểm tra trước khi giao' : label,
      exact: true,
    })
    .click();
  const dialog = page.getByRole('dialog', { name: action.title, exact: true });
  await dialog.waitFor({ state: 'visible' });
  await dialog
    .getByRole('button', { name: action.confirm, exact: true })
    .click();
  await dialog.waitFor({ state: 'hidden' });
}
module.exports = { clickWebAction };
