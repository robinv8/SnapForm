import { describe, it, expect, beforeEach } from 'vitest';
import { findActiveFormContainer, detectFields, detectFormFields, isElementVisible } from '../formDetector';

function setPage(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

// ─────────────────────────────────────────────────────────────────
// 1. Radio button groups
// ─────────────────────────────────────────────────────────────────
describe('Radio button groups', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect all radio buttons in a group', () => {
    setPage(`
      <form>
        <fieldset>
          <legend>Gender</legend>
          <label><input type="radio" name="gender" value="male" /> Male</label>
          <label><input type="radio" name="gender" value="female" /> Female</label>
          <label><input type="radio" name="gender" value="other" /> Other</label>
        </fieldset>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields.length).toBeGreaterThanOrEqual(1);
    // All radio buttons should have the same name
    const radios = fields.filter(f => f.name.startsWith('gender'));
    expect(radios.length).toBeGreaterThanOrEqual(1);
  });

  it('should extract labels from wrapping labels on radio buttons', () => {
    setPage(`
      <form>
        <label><input type="radio" name="plan" value="free" /> Free Plan</label>
        <label><input type="radio" name="plan" value="pro" /> Pro Plan</label>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('Free Plan');
    expect(fields[1].label).toBe('Pro Plan');
  });

  it('should handle radio buttons without wrapping labels', () => {
    setPage(`
      <form>
        <input type="radio" name="color" value="red" /> Red
        <input type="radio" name="color" value="blue" /> Blue
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. Fieldset and legend
// ─────────────────────────────────────────────────────────────────
describe('Fieldset and legend', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect fields inside fieldset', () => {
    setPage(`
      <form>
        <fieldset>
          <legend>Personal Info</legend>
          <label for="fn">First Name</label>
          <input id="fn" name="first_name" type="text" />
          <label for="ln">Last Name</label>
          <input id="ln" name="last_name" type="text" />
        </fieldset>
        <fieldset>
          <legend>Account</legend>
          <label for="usr">Username</label>
          <input id="usr" name="username" type="text" />
          <label for="pwd">Password</label>
          <input id="pwd" name="password" type="password" />
        </fieldset>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(4);
    expect(fields[0].label).toBe('First Name');
    expect(fields[2].label).toBe('Username');
  });

  it('should handle disabled fieldset', () => {
    setPage(`
      <form>
        <fieldset disabled>
          <input name="disabled_field" type="text" />
        </fieldset>
        <fieldset>
          <input name="enabled_field" type="text" />
        </fieldset>
      </form>
    `);
    const fields = detectFormFields(document);
    // Both should be detected — disabled is still visible/fillable
    expect(fields).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. Disabled and readonly fields
// ─────────────────────────────────────────────────────────────────
describe('Disabled and readonly fields', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect disabled inputs (they are still visible)', () => {
    setPage(`
      <form>
        <input name="active" type="text" />
        <input name="inactive" type="text" disabled />
      </form>
    `);
    const fields = detectFormFields(document);
    // Disabled fields are visible, AI should be able to see them
    expect(fields).toHaveLength(2);
  });

  it('should detect readonly inputs', () => {
    setPage(`
      <form>
        <input name="editable" type="text" />
        <input name="readonly_field" type="text" readonly value="locked" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. Additional input types
// ─────────────────────────────────────────────────────────────────
describe('Additional input types', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect url input', () => {
    setPage(`
      <form>
        <input name="website" type="url" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('website');
  });

  it('should detect color input', () => {
    setPage(`
      <form>
        <input name="favorite_color" type="color" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
  });

  it('should detect range input', () => {
    setPage(`
      <form>
        <input name="volume" type="range" min="0" max="100" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
  });

  it('should detect time input', () => {
    setPage(`
      <form>
        <input name="meeting_time" type="time" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
  });

  it('should detect datetime-local input', () => {
    setPage(`
      <form>
        <input name="appointment" type="datetime-local" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
  });

  it('should detect month and week inputs', () => {
    setPage(`
      <form>
        <input name="birth_month" type="month" />
        <input name="work_week" type="week" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
  });

  it('should detect search type input', () => {
    setPage(`
      <form>
        <input name="q" type="search" placeholder="Search..." />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].label).toBe('Search...');
  });
});

// ─────────────────────────────────────────────────────────────────
// 5. Datalist inputs
// ─────────────────────────────────────────────────────────────────
describe('Datalist inputs', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect input with datalist', () => {
    setPage(`
      <form>
        <label for="browser">Browser</label>
        <input id="browser" name="browser" list="browsers" type="text" />
        <datalist id="browsers">
          <option value="Chrome" />
          <option value="Firefox" />
          <option value="Safari" />
        </datalist>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].label).toBe('Browser');
    expect(fields[0].type).toBe('text');
  });
});

// ─────────────────────────────────────────────────────────────────
// 6. Multiple select
// ─────────────────────────────────────────────────────────────────
describe('Multiple select', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect multi-select dropdown', () => {
    setPage(`
      <form>
        <label for="skills">Skills</label>
        <select id="skills" name="skills" multiple>
          <option value="js">JavaScript</option>
          <option value="ts">TypeScript</option>
          <option value="py">Python</option>
          <option value="go">Go</option>
        </select>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe('select');
    expect(fields[0].options).toEqual(['js', 'ts', 'py', 'go']);
  });
});

// ─────────────────────────────────────────────────────────────────
// 7. Floating label patterns (Material Design style)
// ─────────────────────────────────────────────────────────────────
describe('Floating label patterns', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect label in MUI-style floating label (label after input)', () => {
    setPage(`
      <form>
        <div class="MuiFormControl-root">
          <input id="mui-name" name="name" type="text" />
          <label for="mui-name">Name</label>
        </div>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].label).toBe('Name');
  });

  it('should detect label in Bootstrap floating label pattern', () => {
    setPage(`
      <form>
        <div class="form-floating">
          <input id="float-email" name="email" type="email" placeholder="name@example.com" />
          <label for="float-email">Email address</label>
        </div>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].label).toBe('Email address');
  });

  it('should handle placeholder-only fields (no label element)', () => {
    setPage(`
      <form>
        <div class="input-group">
          <input name="search" type="text" placeholder="Type to search..." />
        </div>
        <div class="input-group">
          <input name="location" type="text" placeholder="City, State, or ZIP" />
        </div>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
    expect(fields[0].label).toBe('Type to search...');
    expect(fields[1].label).toBe('City, State, or ZIP');
  });
});

// ─────────────────────────────────────────────────────────────────
// 8. Multiple labels edge cases
// ─────────────────────────────────────────────────────────────────
describe('Multiple label edge cases', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should handle input referenced by multiple labels (use first)', () => {
    setPage(`
      <form>
        <label for="f1">Primary Label</label>
        <label for="f1">Secondary Label</label>
        <input id="f1" name="field" type="text" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    // Should use the first matching label
    expect(fields[0].label).toBe('Primary Label');
  });

  it('should handle label with nested span for required indicator', () => {
    setPage(`
      <form>
        <label for="req">
          Email <span class="required">*</span>
        </label>
        <input id="req" name="email" type="email" required />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toContain('Email');
    expect(fields[0].label).toContain('*');
  });

  it('should handle label with help text tooltip icon', () => {
    setPage(`
      <form>
        <label for="ssn">
          SSN
          <span class="tooltip-icon" aria-hidden="true">(?)</span>
        </label>
        <input id="ssn" name="ssn" type="text" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toContain('SSN');
  });
});

// ─────────────────────────────────────────────────────────────────
// 9. Conditional / dependent fields
// ─────────────────────────────────────────────────────────────────
describe('Conditional / dependent fields', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect visible conditional fields and skip hidden ones', () => {
    setPage(`
      <form>
        <label for="has_company">
          <input id="has_company" type="checkbox" name="has_company" /> I have a company
        </label>
        <!-- This section shown when checkbox is checked -->
        <div id="company-details" style="display: block;">
          <label for="company">Company Name</label>
          <input id="company" name="company_name" type="text" />
        </div>
        <!-- This section hidden by default -->
        <div id="freelance-details" style="display: none;">
          <label for="rate">Hourly Rate</label>
          <input id="rate" name="hourly_rate" type="number" />
        </div>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2); // checkbox + company name
    expect(fields.find(f => f.name === 'hourly_rate')).toBeUndefined();
    expect(fields.find(f => f.name === 'company_name')).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// 10. Forms with autocomplete attributes
// ─────────────────────────────────────────────────────────────────
describe('Autocomplete attributes', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect fields with autocomplete hints', () => {
    setPage(`
      <form>
        <input name="name" type="text" autocomplete="name" />
        <input name="email" type="email" autocomplete="email" />
        <input name="cc" type="text" autocomplete="cc-number" />
        <input name="exp" type="text" autocomplete="cc-exp" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(4);
  });

  it('should detect field with autocomplete="off"', () => {
    setPage(`
      <form autocomplete="off">
        <input name="secret" type="text" autocomplete="off" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────
// 11. Large forms (stress test)
// ─────────────────────────────────────────────────────────────────
describe('Large forms', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should handle a form with 50 fields', () => {
    const inputs = Array.from({ length: 50 }, (_, i) =>
      `<label for="f${i}">Field ${i}</label><input id="f${i}" name="field_${i}" type="text" />`
    ).join('\n');
    setPage(`<form>${inputs}</form>`);

    const fields = detectFormFields(document);
    expect(fields).toHaveLength(50);
    expect(fields[0].label).toBe('Field 0');
    expect(fields[49].label).toBe('Field 49');
  });

  it('should handle a form with 100 fields efficiently', () => {
    const inputs = Array.from({ length: 100 }, (_, i) =>
      `<input name="f${i}" type="text" placeholder="Field ${i}" />`
    ).join('\n');
    setPage(`<form>${inputs}</form>`);

    const start = Date.now();
    const fields = detectFormFields(document);
    const elapsed = Date.now() - start;

    expect(fields).toHaveLength(100);
    expect(elapsed).toBeLessThan(1000); // Should be fast
  });
});

// ─────────────────────────────────────────────────────────────────
// 12. Login/signup common patterns
// ─────────────────────────────────────────────────────────────────
describe('Login and signup patterns', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect a typical login form', () => {
    setPage(`
      <form action="/login" method="POST">
        <input type="hidden" name="_csrf" value="token123" />
        <div>
          <label for="email">Email</label>
          <input id="email" name="email" type="email" required autocomplete="email" />
        </div>
        <div>
          <label for="password">Password</label>
          <input id="password" name="password" type="password" required autocomplete="current-password" />
        </div>
        <div>
          <label><input type="checkbox" name="remember" /> Remember me</label>
        </div>
        <button type="submit">Log In</button>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(3); // email, password, remember
    expect(fields[0].type).toBe('email');
    expect(fields[1].label).toBe('Password');
    expect(fields[2].type).toBe('checkbox');
  });

  it('should detect a typical signup form with password confirmation', () => {
    setPage(`
      <form>
        <label for="name">Full Name</label>
        <input id="name" name="name" type="text" required />

        <label for="email">Email</label>
        <input id="email" name="email" type="email" required />

        <label for="pass">Password</label>
        <input id="pass" name="password" type="password" required />

        <label for="pass2">Confirm Password</label>
        <input id="pass2" name="password_confirm" type="password" required />

        <label for="dob">Date of Birth</label>
        <input id="dob" name="dob" type="date" />

        <label for="country">Country</label>
        <select id="country" name="country">
          <option value="">Select country</option>
          <option value="US">United States</option>
          <option value="UK">United Kingdom</option>
          <option value="CN">China</option>
        </select>

        <label>
          <input type="checkbox" name="tos" required />
          I accept the Terms of Service
        </label>

        <button type="submit">Create Account</button>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(7);
    expect(fields[4].type).toBe('date');
    expect(fields[5].type).toBe('select');
    expect(fields[6].type).toBe('checkbox');
    expect(fields[6].label).toBe('I accept the Terms of Service');
  });

  it('should detect OAuth login page with email/password behind toggle', () => {
    setPage(`
      <div class="auth-page">
        <button class="oauth-btn">Continue with Google</button>
        <button class="oauth-btn">Continue with GitHub</button>
        <hr />
        <form id="email-login">
          <label for="login-email">Email</label>
          <input id="login-email" name="email" type="email" />
          <label for="login-pass">Password</label>
          <input id="login-pass" name="password" type="password" />
          <button type="submit">Sign In</button>
        </form>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(2);
    expect(fields[0].label).toBe('Email');
    expect(fields[1].label).toBe('Password');
  });
});

// ─────────────────────────────────────────────────────────────────
// 13. Payment / checkout form patterns
// ─────────────────────────────────────────────────────────────────
describe('Payment and checkout patterns', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect a checkout form with billing info', () => {
    setPage(`
      <form id="checkout">
        <fieldset>
          <legend>Billing Information</legend>
          <label for="card_name">Cardholder Name</label>
          <input id="card_name" name="card_name" type="text" autocomplete="cc-name" />

          <label for="card_number">Card Number</label>
          <input id="card_number" name="card_number" type="text" autocomplete="cc-number" />

          <label for="expiry">Expiry</label>
          <input id="expiry" name="expiry" type="text" autocomplete="cc-exp" placeholder="MM/YY" />

          <label for="cvv">CVV</label>
          <input id="cvv" name="cvv" type="text" autocomplete="cc-csc" />
        </fieldset>

        <fieldset>
          <legend>Billing Address</legend>
          <label for="bill_addr">Address</label>
          <input id="bill_addr" name="billing_address" type="text" />

          <label for="bill_city">City</label>
          <input id="bill_city" name="billing_city" type="text" />

          <label for="bill_zip">ZIP</label>
          <input id="bill_zip" name="billing_zip" type="text" />
        </fieldset>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(7);
    expect(fields[0].label).toBe('Cardholder Name');
    expect(fields[1].label).toBe('Card Number');
    expect(fields[2].label).toBe('Expiry');
  });
});

// ─────────────────────────────────────────────────────────────────
// 14. Form-associated elements outside form tag
// ─────────────────────────────────────────────────────────────────
describe('Form-associated elements outside form', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect inputs with form attribute pointing to a form', () => {
    setPage(`
      <form id="myform">
        <input name="inside" type="text" />
      </form>
      <input name="outside" type="text" form="myform" />
    `);
    // Our detector works on container children, so the outside input
    // won't be in the form container — it falls back to body
    const container = findActiveFormContainer(document);
    expect(container.tagName).toBe('FORM');
    const fields = detectFields(container);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('inside');
  });
});

// ─────────────────────────────────────────────────────────────────
// 15. isElementVisible edge cases
// ─────────────────────────────────────────────────────────────────
describe('isElementVisible edge cases', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should handle element with opacity: 0 (still considered visible)', () => {
    setPage(`
      <form>
        <input name="transparent" type="text" style="opacity: 0;" />
      </form>
    `);
    // opacity: 0 makes element invisible visually but it's still in layout
    // Our current implementation doesn't check opacity, which is fine
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
  });

  it('should handle nested hidden elements', () => {
    setPage(`
      <form>
        <div style="display: none;">
          <div style="display: block;">
            <input name="nested_hidden" type="text" />
          </div>
        </div>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(0);
  });

  it('should handle visibility:hidden on grandparent', () => {
    setPage(`
      <form>
        <div style="visibility: hidden;">
          <div>
            <input name="grandparent_hidden" type="text" />
          </div>
        </div>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(0);
  });

  it('should handle element with aria-hidden (still detected — screen readers ignore, but fillable)', () => {
    setPage(`
      <form>
        <input name="aria_hidden" type="text" aria-hidden="true" />
      </form>
    `);
    // aria-hidden doesn't affect DOM visibility, just AT
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────
// 16. Korean / Arabic / Cyrillic label detection
// ─────────────────────────────────────────────────────────────────
describe('International label detection', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should detect Korean labels', () => {
    setPage(`
      <form>
        <label for="name">이름</label>
        <input id="name" name="name" type="text" />
        <label for="email">이메일</label>
        <input id="email" name="email" type="email" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('이름');
    expect(fields[1].label).toBe('이메일');
  });

  it('should detect Arabic labels (RTL)', () => {
    setPage(`
      <form dir="rtl">
        <label for="name">الاسم</label>
        <input id="name" name="name" type="text" />
        <label for="email">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('الاسم');
    expect(fields[1].label).toBe('البريد الإلكتروني');
  });

  it('should detect Cyrillic labels', () => {
    setPage(`
      <form>
        <label for="name">Имя</label>
        <input id="name" name="name" type="text" />
        <label for="pass">Пароль</label>
        <input id="pass" name="password" type="password" />
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields[0].label).toBe('Имя');
    expect(fields[1].label).toBe('Пароль');
  });
});

// ─────────────────────────────────────────────────────────────────
// 17. Edge case: empty and whitespace-only labels
// ─────────────────────────────────────────────────────────────────
describe('Empty and whitespace labels', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should fallback when label element is empty', () => {
    setPage(`
      <form>
        <label for="f1"></label>
        <input id="f1" name="username" type="text" placeholder="Enter username" />
      </form>
    `);
    const fields = detectFormFields(document);
    // Empty label text → fallback to placeholder
    expect(fields[0].label).toBe('Enter username');
  });

  it('should fallback when label is whitespace only', () => {
    setPage(`
      <form>
        <label for="f1">   </label>
        <input id="f1" name="email" type="email" aria-label="Your email" />
      </form>
    `);
    const fields = detectFormFields(document);
    // Whitespace-only label → fallback chain
    expect(fields[0].label).toBe('Your email');
  });
});

// ─────────────────────────────────────────────────────────────────
// 18. Modal with form inside form (malformed but common)
// ─────────────────────────────────────────────────────────────────
describe('Malformed HTML patterns', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should handle inputs without closing tags (self-closing)', () => {
    setPage(`
      <form>
        <input name="f1" type="text">
        <input name="f2" type="email">
        <textarea name="f3"></textarea>
      </form>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(3);
  });

  it('should handle multiple forms with same field names', () => {
    setPage(`
      <form id="login">
        <input name="email" type="email" />
        <input name="password" type="password" />
      </form>
      <form id="register">
        <input name="email" type="email" />
        <input name="password" type="password" />
        <input name="name" type="text" />
      </form>
    `);
    // Should pick the larger form
    const container = findActiveFormContainer(document);
    expect(container.id).toBe('register');
    const fields = detectFields(container);
    expect(fields).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────
// 19. Toast/notification overlays (should NOT interfere)
// ─────────────────────────────────────────────────────────────────
describe('Non-interfering overlays', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('should ignore toast notifications and detect background form', () => {
    setPage(`
      <form>
        <input name="main_field" type="text" />
        <input name="main_email" type="email" />
      </form>
      <div class="toast-container" style="z-index: 9999; position: fixed;">
        <div class="toast">Success! Your profile was saved.</div>
      </div>
    `);
    const fields = detectFormFields(document);
    // Toast has no form fields, should fall through to form
    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe('main_field');
  });

  it('should ignore cookie consent banner and detect form', () => {
    setPage(`
      <form>
        <input name="search_query" type="text" />
      </form>
      <div class="cookie-banner" style="z-index: 10000; position: fixed; bottom: 0;">
        <p>We use cookies</p>
        <button>Accept</button>
        <button>Decline</button>
      </div>
    `);
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('search_query');
  });
});
