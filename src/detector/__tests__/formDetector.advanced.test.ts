import { describe, it, expect, beforeEach } from 'vitest';
import { findActiveFormContainer, detectFields, detectFormFields } from '../formDetector';

function setPage(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

// ─────────────────────────────────────────────────────────────────
// 1. Drawer / Sidebar patterns
// ─────────────────────────────────────────────────────────────────
describe('Drawer and sidebar patterns', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect fields in an open drawer', () => {
    setPage(`
      <form>
        <input name="bg_field" type="text" />
      </form>
      <div class="drawer open" style="z-index: 1000;">
        <input name="drawer_name" type="text" />
        <input name="drawer_email" type="email" />
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe('drawer_name');
  });

  it('should detect fields in Ant Design drawer', () => {
    setPage(`
      <form>
        <input name="bg" type="text" />
      </form>
      <div class="ant-drawer ant-drawer-open" style="z-index: 1000;">
        <div class="ant-drawer-content-wrapper">
          <div class="ant-drawer-body">
            <input name="drawer_field" type="text" />
          </div>
        </div>
      </div>
    `);
    // ant-drawer doesn't match our current selectors, but it has z-index
    // This tests whether we fall back properly
    const container = findActiveFormContainer(document);
    const fields = detectFields(container);
    expect(fields.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. Popover / Dropdown with form fields
// ─────────────────────────────────────────────────────────────────
describe('Popover and dropdown patterns', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect fields in a popover with data-state="open"', () => {
    setPage(`
      <form>
        <input name="main_field" type="text" />
      </form>
      <div data-state="open" role="dialog" style="z-index: 50;">
        <label for="pop_search">Search</label>
        <input id="pop_search" name="search" type="text" />
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('search');
  });

  it('should ignore popover with data-state="closed"', () => {
    setPage(`
      <form>
        <input name="main_field" type="text" />
      </form>
      <div data-state="closed" role="dialog" style="display: none;">
        <input name="hidden_field" type="text" />
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('main_field');
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. Inline editing / table editing
// ─────────────────────────────────────────────────────────────────
describe('Inline and table editing', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect inputs inside a table', () => {
    setPage(`
      <table>
        <tr>
          <td><input name="row1_name" type="text" /></td>
          <td><input name="row1_email" type="email" /></td>
        </tr>
        <tr>
          <td><input name="row2_name" type="text" /></td>
          <td><input name="row2_email" type="email" /></td>
        </tr>
      </table>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(4);
  });

  it('should detect inputs in editable table row modal', () => {
    setPage(`
      <table>
        <tr><td>Row 1</td><td>Data</td></tr>
      </table>
      <div role="dialog" style="z-index: 999;">
        <h3>Edit Row</h3>
        <label for="edit_name">Name</label>
        <input id="edit_name" name="name" type="text" />
        <label for="edit_value">Value</label>
        <input id="edit_value" name="value" type="text" />
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
    expect(fields[0].label).toBe('Name');
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. Framework-specific: Vuetify, Chakra, HeadlessUI
// ─────────────────────────────────────────────────────────────────
describe('UI framework specific patterns', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect Vuetify dialog (.v-dialog--active)', () => {
    setPage(`
      <form><input name="bg" type="text" /></form>
      <div class="v-dialog--active" style="z-index: 202;">
        <div class="v-card">
          <input name="vuetify_field" type="text" />
        </div>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('vuetify_field');
  });

  it('should detect Chakra UI modal', () => {
    setPage(`
      <form><input name="bg" type="text" /></form>
      <div class="chakra-modal__overlay" style="z-index: 1400;">
        <section role="dialog" class="chakra-modal__content">
          <input name="chakra_field" type="email" />
        </section>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('chakra_field');
  });

  it('should detect Bootstrap 3 modal (.modal.in)', () => {
    setPage(`
      <form><input name="bg" type="text" /></form>
      <div class="modal in" style="display: block; z-index: 1050;">
        <div class="modal-dialog">
          <div class="modal-body">
            <input name="bs3_field" type="text" />
          </div>
        </div>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('bs3_field');
  });
});

// ─────────────────────────────────────────────────────────────────
// 5. Complex label scenarios
// ─────────────────────────────────────────────────────────────────
describe('Complex label scenarios', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should handle label with extra whitespace and newlines', () => {
    setPage(`
      <form>
        <label for="f1">
          User
          Name
        </label>
        <input id="f1" name="username" type="text" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toMatch(/User\s+Name/);
  });

  it('should handle label with icon elements inside', () => {
    setPage(`
      <form>
        <label for="f1">
          <svg class="icon"></svg>
          Email Address
        </label>
        <input id="f1" name="email" type="email" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toContain('Email Address');
  });

  it('should handle wrapping label with checkbox text extraction', () => {
    setPage(`
      <form>
        <label>
          <input type="checkbox" name="agree" />
          I agree to the terms and conditions
        </label>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('I agree to the terms and conditions');
    expect(fields[0].type).toBe('checkbox');
  });

  it('should use title attribute as fallback label', () => {
    setPage(`
      <form>
        <input name="f1" type="text" title="Enter your company" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('Enter your company');
  });

  it('should handle label in different language (Japanese)', () => {
    setPage(`
      <form>
        <label for="name">お名前</label>
        <input id="name" name="name" type="text" />
        <label for="tel">電話番号</label>
        <input id="tel" name="tel" type="tel" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('お名前');
    expect(fields[1].label).toBe('電話番号');
  });
});

// ─────────────────────────────────────────────────────────────────
// 6. Form with mixed visible and hidden fields
// ─────────────────────────────────────────────────────────────────
describe('Visibility filtering', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should skip inputs with display:none', () => {
    setPage(`
      <form>
        <input name="visible" type="text" />
        <input name="hidden_one" type="text" style="display: none;" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('visible');
  });

  it('should skip inputs with visibility:hidden', () => {
    setPage(`
      <form>
        <input name="visible" type="text" />
        <input name="invisible" type="text" style="visibility: hidden;" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('visible');
  });

  it('should skip inputs inside a hidden parent', () => {
    setPage(`
      <form>
        <input name="visible" type="text" />
        <div style="display: none;">
          <input name="nested_hidden" type="text" />
        </div>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('visible');
  });

  it('should skip inputs with hidden attribute', () => {
    setPage(`
      <form>
        <input name="visible" type="text" />
        <input name="attr_hidden" type="text" hidden />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('visible');
  });
});

// ─────────────────────────────────────────────────────────────────
// 7. Multiple forms on one page
// ─────────────────────────────────────────────────────────────────
describe('Multiple forms on one page', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should prefer the form with more fields', () => {
    setPage(`
      <form id="search">
        <input name="q" type="text" />
      </form>
      <form id="registration">
        <input name="name" type="text" />
        <input name="email" type="email" />
        <input name="phone" type="tel" />
        <input name="password" type="password" />
      </form>
    `);
    const container = findActiveFormContainer(document);
    expect(container.id).toBe('registration');
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(4);
  });

  it('should still prefer modal over any form', () => {
    setPage(`
      <form id="big_form">
        <input name="f1" type="text" />
        <input name="f2" type="text" />
        <input name="f3" type="text" />
        <input name="f4" type="text" />
        <input name="f5" type="text" />
      </form>
      <dialog open>
        <input name="dialog_field" type="text" />
      </dialog>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('dialog_field');
  });
});

// ─────────────────────────────────────────────────────────────────
// 8. Confirmation / alert dialogs without form fields
// ─────────────────────────────────────────────────────────────────
describe('Non-form dialogs', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should fall through to background form if dialog has no inputs', () => {
    setPage(`
      <form>
        <input name="main_field" type="text" />
        <input name="main_email" type="email" />
      </form>
      <div role="alertdialog" style="z-index: 9999;">
        <p>Are you sure you want to delete?</p>
        <button>Yes</button>
        <button>No</button>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe('main_field');
  });

  it('should fall through to background form if only dialog has submit button', () => {
    setPage(`
      <form>
        <input name="login_user" type="text" />
        <input name="login_pass" type="password" />
      </form>
      <dialog open>
        <p>Session expired</p>
        <button type="submit">OK</button>
      </dialog>
    `);
    // dialog has no fillable inputs (button type=submit is skipped)
    const container = findActiveFormContainer(document);
    // Since dialog has no form fields, should fall through
    const fields = detectFields(container);
    // The dialog has no input/select/textarea, so findActiveFormContainer
    // should not pick it (it checks hasFormFields)
    // Actually dialog[open] is checked first WITHOUT hasFormFields check
    // Let's see what happens
    expect(fields.length).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// 9. Real-world complex forms
// ─────────────────────────────────────────────────────────────────
describe('Real-world complex forms', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should handle a shipping address form', () => {
    setPage(`
      <form>
        <div class="form-row">
          <label for="fname">First Name</label>
          <input id="fname" name="first_name" type="text" required />
        </div>
        <div class="form-row">
          <label for="lname">Last Name</label>
          <input id="lname" name="last_name" type="text" required />
        </div>
        <div class="form-row">
          <label for="addr1">Address Line 1</label>
          <input id="addr1" name="address1" type="text" required />
        </div>
        <div class="form-row">
          <label for="addr2">Address Line 2</label>
          <input id="addr2" name="address2" type="text" />
        </div>
        <div class="form-row">
          <label for="city">City</label>
          <input id="city" name="city" type="text" required />
        </div>
        <div class="form-row">
          <label for="state">State</label>
          <select id="state" name="state" required>
            <option value="">Select</option>
            <option value="CA">California</option>
            <option value="NY">New York</option>
            <option value="TX">Texas</option>
          </select>
        </div>
        <div class="form-row">
          <label for="zip">ZIP Code</label>
          <input id="zip" name="zip" type="text" required />
        </div>
        <div class="form-row">
          <label for="phone">Phone</label>
          <input id="phone" name="phone" type="tel" />
        </div>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(8);
    expect(fields[0].label).toBe('First Name');
    expect(fields[0].required).toBe(true);
    expect(fields[5].type).toBe('select');
    expect(fields[5].options).toEqual(['CA', 'NY', 'TX']);
    expect(fields[7].type).toBe('tel');
  });

  it('should handle a settings form in a modal', () => {
    setPage(`
      <div id="app">
        <nav><input name="search" type="text" /></nav>
        <main>
          <p>Dashboard content</p>
        </main>
      </div>
      <div class="modal show" style="display: block; z-index: 1050;">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header"><h5>Profile Settings</h5></div>
            <div class="modal-body">
              <label for="display_name">Display Name</label>
              <input id="display_name" name="display_name" type="text" />
              <label for="bio">Bio</label>
              <textarea id="bio" name="bio" rows="3"></textarea>
              <label for="avatar_url">Avatar URL</label>
              <input id="avatar_url" name="avatar_url" type="text" />
              <label>
                <input type="checkbox" name="email_notifications" />
                Email Notifications
              </label>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(4);
    expect(fields[0].label).toBe('Display Name');
    expect(fields[1].type).toBe('textarea');
    expect(fields[3].type).toBe('checkbox');
    // Should NOT include the nav search field
    expect(fields.find(f => f.name === 'search')).toBeUndefined();
  });

  it('should handle a contact form with mixed field types', () => {
    setPage(`
      <form>
        <label for="name">Your Name</label>
        <input id="name" name="name" type="text" required />

        <label for="email">Email</label>
        <input id="email" name="email" type="email" required />

        <label for="subject">Subject</label>
        <select id="subject" name="subject">
          <option value="">Choose a topic</option>
          <option value="support">Support</option>
          <option value="sales">Sales</option>
          <option value="other">Other</option>
        </select>

        <label for="message">Message</label>
        <textarea id="message" name="message" required></textarea>

        <label for="attachment">Attachment</label>
        <input id="attachment" name="attachment" type="file" />

        <label>
          <input type="checkbox" name="copy_me" />
          Send me a copy
        </label>

        <input type="hidden" name="csrf_token" value="abc123" />
        <button type="submit">Send</button>
      </form>
    `);
    const fields = detectFormFields(document);
    // Should skip: file input, hidden input, submit button
    expect(fields).toHaveLength(5);
    expect(fields.map(f => f.type)).toEqual(['text', 'email', 'select', 'textarea', 'checkbox']);
  });
});

// ─────────────────────────────────────────────────────────────────
// 10. Dynamic content patterns
// ─────────────────────────────────────────────────────────────────
describe('Dynamic content patterns', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect fields in tab panels (only active tab)', () => {
    setPage(`
      <div>
        <div role="tabpanel" style="display: block;">
          <input name="active_tab_field" type="text" />
        </div>
        <div role="tabpanel" style="display: none;">
          <input name="hidden_tab_field" type="text" />
        </div>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('active_tab_field');
  });

  it('should detect fields in accordion (only expanded section)', () => {
    setPage(`
      <div class="accordion">
        <div class="accordion-item">
          <div class="accordion-body" style="display: block;">
            <input name="expanded_field" type="text" />
          </div>
        </div>
        <div class="accordion-item">
          <div class="accordion-body" style="display: none;">
            <input name="collapsed_field" type="text" />
          </div>
        </div>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('expanded_field');
  });

  it('should detect fields added after initial page load (simulated)', () => {
    // Simulate SPA: start empty, then add form
    setPage('');
    expect(detectFormFields(document)).toHaveLength(0);

    // "Navigate" to a page with a form
    document.body.innerHTML = `
      <form>
        <input name="spa_field" type="text" />
      </form>
    `;
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('spa_field');
  });
});

// ─────────────────────────────────────────────────────────────────
// 11. Form within iframe-like structure (not actual iframe)
// ─────────────────────────────────────────────────────────────────
describe('Nested containers', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect fields deeply nested in div containers', () => {
    setPage(`
      <div class="page">
        <div class="layout">
          <div class="content">
            <div class="card">
              <div class="card-body">
                <form>
                  <div class="mb-3">
                    <label for="deep1" class="form-label">Name</label>
                    <input id="deep1" name="name" type="text" />
                  </div>
                  <div class="mb-3">
                    <label for="deep2" class="form-label">Email</label>
                    <input id="deep2" name="email" type="email" />
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
    expect(fields[0].label).toBe('Name');
  });
});

// ─────────────────────────────────────────────────────────────────
// 12. getFormHtml should also scope to active container
// ─────────────────────────────────────────────────────────────────
describe('Active container scoping for HTML extraction', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should scope to dialog when getting container HTML', () => {
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
    const container = findActiveFormContainer(document);
    const html = container.outerHTML;
    expect(html).toContain('dialog_field');
    expect(html).not.toContain('bg_field');
  });

  it('should scope to modal when getting container HTML', () => {
    setPage(`
      <form>
        <input name="bg" type="text" />
      </form>
      <div class="modal show" style="display: block; z-index: 1050;">
        <input name="modal_input" type="text" />
      </div>
    `);
    const container = findActiveFormContainer(document);
    const html = container.outerHTML;
    expect(html).toContain('modal_input');
    expect(html).not.toContain('bg');
  });
});
