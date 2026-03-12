import { describe, it, expect, beforeEach } from 'vitest';
import { findActiveFormContainer, detectFields } from '../formDetector';

function setPage(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

// ─────────────────────────────────────────────────────────────────
// Ant Design Form Detection
// ─────────────────────────────────────────────────────────────────

describe('Ant Design form container detection', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should find .ant-form as form container', () => {
    setPage(`
      <div>
        <nav>Navigation</nav>
        <div class="ant-form ant-form-horizontal">
          <div class="ant-form-item">
            <div class="ant-form-item-label"><label>用户名</label></div>
            <div class="ant-form-item-control"><input id="username" type="text" /></div>
          </div>
        </div>
      </div>
    `);
    const container = findActiveFormContainer(document);
    expect(container.classList.contains('ant-form')).toBe(true);
  });

  it('should prefer ant-modal-wrap over ant-form on page', () => {
    setPage(`
      <div class="ant-form">
        <input type="text" name="bg" />
      </div>
      <div class="ant-modal-wrap" role="dialog">
        <div class="ant-modal">
          <input type="text" name="modal-input" />
        </div>
      </div>
    `);
    const container = findActiveFormContainer(document);
    expect(container.classList.contains('ant-modal-wrap')).toBe(true);
  });
});

describe('Ant Design native input detection with labels', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect inputs inside .ant-form-item and extract labels', () => {
    setPage(`
      <div class="ant-form">
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label for="name">姓名</label></div>
          <div class="ant-form-item-control">
            <input id="name" type="text" class="ant-input" />
          </div>
        </div>
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label for="email">邮箱</label></div>
          <div class="ant-form-item-control">
            <input id="email" type="email" class="ant-input" />
          </div>
        </div>
      </div>
    `);
    const container = findActiveFormContainer(document);
    const fields = detectFields(container);
    expect(fields.length).toBe(2);
    expect(fields[0].label).toBe('姓名');
    expect(fields[0].type).toBe('text');
    expect(fields[1].label).toBe('邮箱');
    expect(fields[1].type).toBe('email');
  });

  it('should detect required fields via .ant-form-item-required', () => {
    setPage(`
      <div class="ant-form">
        <div class="ant-form-item">
          <div class="ant-form-item-label">
            <label for="name" class="ant-form-item-required">姓名</label>
          </div>
          <div class="ant-form-item-control">
            <input id="name" type="text" />
          </div>
        </div>
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label for="bio">简介</label></div>
          <div class="ant-form-item-control">
            <textarea id="bio"></textarea>
          </div>
        </div>
      </div>
    `);
    const container = findActiveFormContainer(document);
    const fields = detectFields(container);
    expect(fields.length).toBe(2);
    expect(fields[0].required).toBe(true);
    expect(fields[1].required).toBe(false);
  });
});

describe('Ant Design custom component detection', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect .ant-select as select field', () => {
    setPage(`
      <div class="ant-form">
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label>城市</label></div>
          <div class="ant-form-item-control">
            <div class="ant-select" id="city">
              <div class="ant-select-selector">
                <span class="ant-select-selection-placeholder">请选择城市</span>
                <input class="ant-select-selection-search-input" type="search" />
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const container = findActiveFormContainer(document);
    const fields = detectFields(container);
    // Should detect the .ant-select, not the hidden search input
    const selectField = fields.find(f => f.type === 'select');
    expect(selectField).toBeDefined();
    expect(selectField!.label).toBe('城市');
  });

  it('should detect .ant-picker as date field', () => {
    setPage(`
      <div class="ant-form">
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label>出生日期</label></div>
          <div class="ant-form-item-control">
            <div class="ant-picker" id="birthday">
              <div class="ant-picker-input">
                <input type="text" placeholder="请选择日期" />
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const container = findActiveFormContainer(document);
    const fields = detectFields(container);
    const dateField = fields.find(f => f.type === 'date');
    expect(dateField).toBeDefined();
    expect(dateField!.label).toBe('出生日期');
  });

  it('should detect .ant-input-number as number field', () => {
    setPage(`
      <div class="ant-form">
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label>年龄</label></div>
          <div class="ant-form-item-control">
            <div class="ant-input-number" id="age">
              <input type="text" class="ant-input-number-input" />
            </div>
          </div>
        </div>
      </div>
    `);
    const container = findActiveFormContainer(document);
    const fields = detectFields(container);
    const numField = fields.find(f => f.type === 'number');
    expect(numField).toBeDefined();
    expect(numField!.label).toBe('年龄');
  });

  it('should detect .ant-switch as checkbox field', () => {
    setPage(`
      <div class="ant-form">
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label>启用通知</label></div>
          <div class="ant-form-item-control">
            <button class="ant-switch" role="switch" id="notify"></button>
          </div>
        </div>
      </div>
    `);
    const container = findActiveFormContainer(document);
    const fields = detectFields(container);
    const switchField = fields.find(f => f.label === '启用通知');
    expect(switchField).toBeDefined();
    expect(switchField!.type).toBe('checkbox');
  });

  it('should skip disabled .ant-select', () => {
    setPage(`
      <div class="ant-form">
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label>状态</label></div>
          <div class="ant-form-item-control">
            <div class="ant-select ant-select-disabled" id="status">
              <input class="ant-select-selection-search-input" type="search" />
            </div>
          </div>
        </div>
      </div>
    `);
    const container = findActiveFormContainer(document);
    const fields = detectFields(container);
    const selectField = fields.find(f => f.type === 'select');
    expect(selectField).toBeUndefined();
  });
});

describe('Ant Design mixed form (native + custom)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect both native inputs and custom components without duplicates', () => {
    setPage(`
      <div class="ant-form">
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label for="username">用户名</label></div>
          <div class="ant-form-item-control">
            <input id="username" type="text" class="ant-input" />
          </div>
        </div>
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label for="email">邮箱</label></div>
          <div class="ant-form-item-control">
            <input id="email" type="email" class="ant-input" />
          </div>
        </div>
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label>角色</label></div>
          <div class="ant-form-item-control">
            <div class="ant-select" id="role">
              <div class="ant-select-selector">
                <input class="ant-select-selection-search-input" type="search" />
              </div>
            </div>
          </div>
        </div>
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label>入职日期</label></div>
          <div class="ant-form-item-control">
            <div class="ant-picker" id="joinDate">
              <div class="ant-picker-input">
                <input type="text" />
              </div>
            </div>
          </div>
        </div>
        <div class="ant-form-item">
          <div class="ant-form-item-label"><label for="bio">简介</label></div>
          <div class="ant-form-item-control">
            <textarea id="bio" class="ant-input"></textarea>
          </div>
        </div>
      </div>
    `);
    const container = findActiveFormContainer(document);
    const fields = detectFields(container);

    // Should have 5 fields: username(text), email(email), role(select), joinDate(date), bio(textarea)
    expect(fields.length).toBe(5);

    const types = fields.map(f => f.type);
    expect(types).toContain('text');
    expect(types).toContain('email');
    expect(types).toContain('select');
    expect(types).toContain('date');
    expect(types).toContain('textarea');

    // No duplicates from search inputs inside custom components
    const ids = fields.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Element UI form detection', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should find .el-form as form container and extract labels', () => {
    setPage(`
      <div class="el-form">
        <div class="el-form-item">
          <label class="el-form-item__label">名称</label>
          <div class="el-form-item__content">
            <input type="text" id="name" class="el-input__inner" />
          </div>
        </div>
        <div class="el-form-item is-required">
          <label class="el-form-item__label">邮箱</label>
          <div class="el-form-item__content">
            <input type="email" id="email" class="el-input__inner" />
          </div>
        </div>
      </div>
    `);
    const container = findActiveFormContainer(document);
    expect(container.classList.contains('el-form')).toBe(true);

    const fields = detectFields(container);
    expect(fields.length).toBe(2);
    expect(fields[0].label).toBe('名称');
    expect(fields[1].label).toBe('邮箱');
    expect(fields[1].required).toBe(true);
  });
});
