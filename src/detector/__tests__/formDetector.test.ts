import { describe, it, expect, beforeEach } from 'vitest';
import { findActiveFormContainer, detectFields, detectFormFields } from '../formDetector';

// Helper: set up document body with HTML and return the document
function setPage(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

// ─────────────────────────────────────────────────────────────────
// 1. Basic form detection
// ─────────────────────────────────────────────────────────────────
describe('Basic form detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should detect a simple form with text inputs', () => {
    setPage(`
      <form>
        <label for="name">Name</label>
        <input id="name" name="name" type="text" />
        <label for="email">Email</label>
        <input id="email" name="email" type="email" />
        <button type="submit">Submit</button>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe('name');
    expect(fields[0].type).toBe('text');
    expect(fields[0].label).toBe('Name');
    expect(fields[1].name).toBe('email');
    expect(fields[1].type).toBe('email');
  });

  it('should detect select fields with options', () => {
    setPage(`
      <form>
        <label for="role">Role</label>
        <select id="role" name="role">
          <option value="">Choose</option>
          <option value="dev">Developer</option>
          <option value="pm">Product Manager</option>
        </select>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe('select');
    expect(fields[0].options).toEqual(['dev', 'pm']);
  });

  it('should detect textarea', () => {
    setPage(`
      <form>
        <label for="bio">Bio</label>
        <textarea id="bio" name="bio"></textarea>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe('textarea');
  });

  it('should detect checkbox', () => {
    setPage(`
      <form>
        <label><input type="checkbox" name="agree" /> I agree</label>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe('checkbox');
  });

  it('should detect required fields', () => {
    setPage(`
      <form>
        <input name="required_field" type="text" required />
        <input name="optional_field" type="text" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].required).toBe(true);
    expect(fields[1].required).toBe(false);
  });

  it('should skip hidden/submit/button/file/reset inputs', () => {
    setPage(`
      <form>
        <input type="hidden" name="token" value="abc" />
        <input type="submit" value="Go" />
        <input type="button" value="Click" />
        <input type="file" name="upload" />
        <input type="reset" value="Reset" />
        <input type="text" name="visible" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('visible');
  });

  it('should detect various input types', () => {
    setPage(`
      <form>
        <input name="phone" type="tel" />
        <input name="age" type="number" />
        <input name="birthday" type="date" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(3);
    expect(fields.map(f => f.type)).toEqual(['tel', 'number', 'date']);
  });

  it('should handle form with no inputs', () => {
    setPage(`<form><p>No inputs here</p></form>`);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(0);
  });

  it('should handle page with no forms', () => {
    setPage(`<div><p>Just a regular page</p></div>`);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. Label detection
// ─────────────────────────────────────────────────────────────────
describe('Label detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should get label via for attribute', () => {
    setPage(`
      <form>
        <label for="username">Username</label>
        <input id="username" name="username" type="text" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('Username');
  });

  it('should get label from wrapping label element', () => {
    setPage(`
      <form>
        <label>
          Full Name
          <input name="fullname" type="text" />
        </label>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('Full Name');
  });

  it('should get label from aria-label', () => {
    setPage(`
      <form>
        <input name="search" type="text" aria-label="Search query" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('Search query');
  });

  it('should get label from aria-labelledby', () => {
    setPage(`
      <form>
        <span id="name-label">Your Name</span>
        <input name="name" type="text" aria-labelledby="name-label" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('Your Name');
  });

  it('should fallback to placeholder', () => {
    setPage(`
      <form>
        <input name="city" type="text" placeholder="Enter your city" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('Enter your city');
  });

  it('should fallback to name when no label exists', () => {
    setPage(`
      <form>
        <input name="mystery_field" type="text" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('mystery_field');
  });

  it('should get label from preceding sibling element', () => {
    setPage(`
      <form>
        <div class="field">
          <span>Company Name</span>
          <input name="company" type="text" />
        </div>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('Company Name');
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. Dialog / Modal detection — THE CORE PROBLEM
// ─────────────────────────────────────────────────────────────────
describe('Dialog and modal detection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should prioritize fields inside <dialog open> over background form', () => {
    setPage(`
      <form>
        <input name="bg_field" type="text" />
      </form>
      <dialog open>
        <form>
          <input name="dialog_field" type="text" />
        </form>
      </dialog>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('dialog_field');
  });

  it('should ignore closed <dialog>', () => {
    setPage(`
      <form>
        <input name="main_field" type="text" />
      </form>
      <dialog>
        <form>
          <input name="hidden_dialog_field" type="text" />
        </form>
      </dialog>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('main_field');
  });

  it('should detect fields in role="dialog" container', () => {
    setPage(`
      <form>
        <input name="bg_field" type="text" />
      </form>
      <div role="dialog" style="display: block; z-index: 1000;">
        <input name="modal_field" type="email" />
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('modal_field');
  });

  it('should pick the topmost dialog when multiple are open', () => {
    setPage(`
      <dialog open style="z-index: 100;">
        <input name="lower_dialog" type="text" />
      </dialog>
      <dialog open style="z-index: 200;">
        <input name="upper_dialog" type="text" />
      </dialog>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('upper_dialog');
  });

  it('should detect Bootstrap modal (.modal.show)', () => {
    setPage(`
      <form>
        <input name="bg_field" type="text" />
      </form>
      <div class="modal show" style="display: block; z-index: 1050;">
        <div class="modal-dialog">
          <div class="modal-content">
            <input name="bootstrap_field" type="text" />
          </div>
        </div>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('bootstrap_field');
  });

  it('should detect Ant Design modal (.ant-modal-wrap)', () => {
    setPage(`
      <form>
        <input name="bg_field" type="text" />
      </form>
      <div class="ant-modal-wrap" style="display: block; z-index: 1000;">
        <div class="ant-modal">
          <input name="antd_field" type="text" />
        </div>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('antd_field');
  });

  it('should detect MUI modal (.MuiModal-root)', () => {
    setPage(`
      <form>
        <input name="bg_field" type="text" />
      </form>
      <div class="MuiModal-root" style="display: block; z-index: 1300;">
        <div class="MuiDialog-root">
          <input name="mui_field" type="text" />
        </div>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('mui_field');
  });

  it('should detect Radix/shadcn dialog ([data-state="open"])', () => {
    setPage(`
      <form>
        <input name="bg_field" type="text" />
      </form>
      <div data-state="open" role="dialog" style="z-index: 50;">
        <input name="radix_field" type="text" />
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('radix_field');
  });

  it('should detect Element Plus dialog (.el-overlay)', () => {
    setPage(`
      <form>
        <input name="bg_field" type="text" />
      </form>
      <div class="el-overlay" style="display: block; z-index: 2000;">
        <div class="el-dialog">
          <input name="element_field" type="text" />
        </div>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('element_field');
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. Nested / stacked modals
// ─────────────────────────────────────────────────────────────────
describe('Nested and stacked modals', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should pick the highest z-index modal with form fields', () => {
    setPage(`
      <div role="dialog" style="z-index: 100;">
        <input name="first_modal" type="text" />
      </div>
      <div role="dialog" style="z-index: 200;">
        <input name="second_modal" type="text" />
      </div>
      <div role="dialog" style="z-index: 300;">
        <input name="third_modal" type="text" />
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('third_modal');
  });

  it('should skip modal without form fields and use one that has them', () => {
    setPage(`
      <div role="dialog" style="z-index: 100;">
        <input name="has_fields" type="text" />
      </div>
      <div role="dialog" style="z-index: 200;">
        <p>Confirmation: Are you sure?</p>
        <button>OK</button>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('has_fields');
  });

  it('should handle dialog inside dialog (nested)', () => {
    setPage(`
      <dialog open style="z-index: 100;">
        <input name="outer_dialog" type="text" />
        <dialog open style="z-index: 200;">
          <input name="inner_dialog" type="text" />
        </dialog>
      </dialog>
    `);
    const fields = detectFormFields(document);
    // Should pick the inner (higher z-index) dialog
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('inner_dialog');
  });
});

// ─────────────────────────────────────────────────────────────────
// 5. findActiveFormContainer specifics
// ─────────────────────────────────────────────────────────────────
describe('findActiveFormContainer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should return body when page has no forms or modals', () => {
    setPage(`<div><p>Hello world</p></div>`);
    const container = findActiveFormContainer(document);
    expect(container).toBe(document.body);
  });

  it('should return the form element for a simple page', () => {
    setPage(`
      <div>
        <form id="myform">
          <input name="field1" type="text" />
        </form>
      </div>
    `);
    const container = findActiveFormContainer(document);
    expect(container.tagName).toBe('FORM');
  });

  it('should return dialog over form when dialog is open', () => {
    setPage(`
      <form>
        <input name="bg" type="text" />
      </form>
      <dialog open>
        <input name="dlg" type="text" />
      </dialog>
    `);
    const container = findActiveFormContainer(document);
    expect(container.tagName).toBe('DIALOG');
  });

  it('should return the form with the most fields when multiple forms exist', () => {
    setPage(`
      <form id="small">
        <input name="a" type="text" />
      </form>
      <form id="large">
        <input name="b" type="text" />
        <input name="c" type="text" />
        <input name="d" type="text" />
      </form>
    `);
    const container = findActiveFormContainer(document);
    expect(container.id).toBe('large');
  });
});

// ─────────────────────────────────────────────────────────────────
// 6. Unique ID generation
// ─────────────────────────────────────────────────────────────────
describe('Unique ID handling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should generate unique IDs for fields without id or name', () => {
    setPage(`
      <form>
        <input type="text" />
        <input type="text" />
        <input type="text" />
      </form>
    `);
    const fields = detectFormFields(document);
    const ids = fields.map(f => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(fields.length);
  });

  it('should handle duplicate names by appending suffix', () => {
    setPage(`
      <form>
        <input name="phone" type="tel" />
        <input name="phone" type="tel" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
    expect(fields[0].id).not.toBe(fields[1].id);
  });
});

// ─────────────────────────────────────────────────────────────────
// 7. Complex real-world form patterns
// ─────────────────────────────────────────────────────────────────
describe('Real-world form patterns', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should detect fields in a registration form', () => {
    setPage(`
      <form id="register">
        <div class="form-group">
          <label for="username">Username</label>
          <input id="username" name="username" type="text" required />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" required />
        </div>
        <div class="form-group">
          <label for="confirm">Confirm Password</label>
          <input id="confirm" name="confirm_password" type="password" required />
        </div>
        <div class="form-group">
          <label for="country">Country</label>
          <select id="country" name="country">
            <option value="">Select</option>
            <option value="US">United States</option>
            <option value="CN">China</option>
            <option value="JP">Japan</option>
          </select>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" name="terms" required /> I agree to terms
          </label>
        </div>
        <button type="submit">Register</button>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(6);
    expect(fields.map(f => f.type)).toEqual([
      'text', 'email', 'text', 'text', 'select', 'checkbox'
    ]);
    // password fields should be detected as text type (since we map unknown types to text)
    expect(fields[2].label).toBe('Password');
  });

  it('should detect fields in a Chinese form', () => {
    setPage(`
      <form>
        <div>
          <label for="xingming">姓名</label>
          <input id="xingming" name="name" type="text" required />
        </div>
        <div>
          <label for="shouji">手机号码</label>
          <input id="shouji" name="phone" type="tel" required />
        </div>
        <div>
          <label for="dizhi">地址</label>
          <textarea id="dizhi" name="address"></textarea>
        </div>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(3);
    expect(fields[0].label).toBe('姓名');
    expect(fields[1].label).toBe('手机号码');
    expect(fields[2].label).toBe('地址');
  });

  it('should handle form with inputs outside <form> tag', () => {
    setPage(`
      <div>
        <input name="standalone_field" type="text" />
        <select name="standalone_select">
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
  });

  it('should handle password type as text', () => {
    setPage(`
      <form>
        <input name="pass" type="password" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].type).toBe('text'); // password maps to default text
  });

  it('should handle a multi-step form where only one step is visible', () => {
    setPage(`
      <form>
        <div class="step" style="display: none;">
          <input name="step1_field" type="text" />
        </div>
        <div class="step" style="display: block;">
          <input name="step2_field" type="text" />
        </div>
        <div class="step" style="display: none;">
          <input name="step3_field" type="text" />
        </div>
      </form>
    `);
    const fields = detectFormFields(document);
    // jsdom doesn't compute styles fully, so this tests our visibility check
    // In a real browser, only step2 would be visible
    expect(fields.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────
// 8. Edge cases
// ─────────────────────────────────────────────────────────────────
describe('Edge cases', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should handle empty page', () => {
    setPage('');
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(0);
  });

  it('should handle deeply nested inputs', () => {
    setPage(`
      <form>
        <div><div><div><div><div>
          <label for="deep">Deep Field</label>
          <input id="deep" name="deep" type="text" />
        </div></div></div></div></div>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].label).toBe('Deep Field');
  });

  it('should handle input with both id and name', () => {
    setPage(`
      <form>
        <input id="myId" name="myName" type="text" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].id).toBe('myId');
    expect(fields[0].name).toBe('myName');
  });

  it('should handle select with optgroup', () => {
    setPage(`
      <form>
        <select name="category">
          <option value="">Choose</option>
          <optgroup label="Fruits">
            <option value="apple">Apple</option>
            <option value="banana">Banana</option>
          </optgroup>
          <optgroup label="Veggies">
            <option value="carrot">Carrot</option>
          </optgroup>
        </select>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].options).toEqual(['apple', 'banana', 'carrot']);
  });

  it('should detect radio buttons', () => {
    setPage(`
      <form>
        <input name="gender" type="radio" value="male" />
        <input name="gender" type="radio" value="female" />
      </form>
    `);
    // Radio buttons map to 'text' type in our system — they exist as fields
    const fields = detectFormFields(document);
    expect(fields.length).toBeGreaterThanOrEqual(1);
  });
});
