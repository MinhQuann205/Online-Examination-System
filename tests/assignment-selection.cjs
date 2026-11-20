'use strict';
// Business interaction helper only: search the real bounded selector, select the exact UUID.
async function chooseAssignmentOption(page, kind, id, search) {
  const form = page.locator('form').filter({
    has: page.getByRole('button', {
      name: 'Kiểm tra trước khi giao',
      exact: true,
    }),
  });
  const group = form.getByRole('group', { name: kind, exact: true });
  await group
    .getByLabel('Tìm ' + kind.toLowerCase(), { exact: true })
    .fill(search);
  await group.locator('button[data-option-id="' + id + '"]').click();
  const selected = await group
    .locator('[data-selected-id]')
    .getAttribute('data-selected-id');
  require('node:assert/strict').equal(selected, id);
}
module.exports = { chooseAssignmentOption };
