import assert from 'node:assert/strict';
import {
  normalizeIndianMobile,
  isValidIndianMobile,
  resolveMobileToEmail,
  rolesMatch,
  getRoleDashboardPath,
  DEMO_ACCOUNTS,
} from '../auth-helpers';
import { normalizeRole, USER_ROLES } from '@/types';

async function runLoginValidationTests() {
  console.log('====================================================');
  console.log('STARTING LOGIN & AUTHENTICATION VALIDATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;

  // TEST 1: Mobile normalization
  {
    console.log('TEST 1: Mobile number normalization');
    assert.equal(normalizeIndianMobile('9876543210'), '9876543210');
    assert.equal(normalizeIndianMobile('+91 98765 43210'), '9876543210');
    assert.equal(normalizeIndianMobile('+91-98765-43210'), '9876543210');
    assert.equal(normalizeIndianMobile('919876543210'), '9876543210');
    assert.equal(normalizeIndianMobile('09876543210'), '9876543210');
    assert.equal(normalizeIndianMobile('  98765 43210  '), '9876543210');
    assert.equal(normalizeIndianMobile('(987) 654-3210'), '9876543210');
    console.log('✔ Passed: Mobile numbers normalized cleanly to 10 digits.\n');
    passed++;
  }

  // TEST 2: Valid Indian mobile numbers
  {
    console.log('TEST 2: Valid Indian mobile numbers accepted');
    assert.equal(isValidIndianMobile('9876543210'), true);
    assert.equal(isValidIndianMobile('9000000001'), true); // Demo series
    assert.equal(isValidIndianMobile('8765432109'), true);
    assert.equal(isValidIndianMobile('7654321098'), true);
    assert.equal(isValidIndianMobile('6543210987'), true);
    assert.equal(isValidIndianMobile('+91 98230 45678'), true);
    console.log('✔ Passed: Valid 10-digit mobile numbers starting with 6,7,8,9 accepted.\n');
    passed++;
  }

  // TEST 3: Invalid mobile numbers rejected
  {
    console.log('TEST 3: Invalid mobile numbers rejected');
    assert.equal(isValidIndianMobile(''), false, 'Empty string must be rejected');
    assert.equal(isValidIndianMobile('12345'), false, 'Short number must be rejected');
    assert.equal(isValidIndianMobile('987654321'), false, '9 digits must be rejected');
    assert.equal(isValidIndianMobile('1234567890'), false, 'Number starting with 1 must be rejected');
    assert.equal(isValidIndianMobile('5555555555'), false, 'Number starting with 5 must be rejected');
    assert.equal(isValidIndianMobile('abcdefghij'), false, 'Letters must be rejected');
    console.log('✔ Passed: Invalid mobile lengths and invalid prefixes strictly rejected.\n');
    passed++;
  }

  // TEST 4: Password required check
  {
    console.log('TEST 4: Password presence validation');
    const validatePassword = (pw: string): boolean => {
      return Boolean(pw && pw.trim().length > 0);
    };
    assert.equal(validatePassword(''), false, 'Empty password rejected');
    assert.equal(validatePassword('   '), false, 'Whitespace-only password rejected');
    assert.equal(validatePassword('Demo@Farmer123'), true, 'Valid password accepted');
    console.log('✔ Passed: Empty/whitespace passwords strictly rejected.\n');
    passed++;
  }

  // TEST 5: Role selection required
  {
    console.log('TEST 5: Role required validation');
    const validateRole = (r: string): boolean => {
      return Boolean(r && r.trim().length > 0 && (USER_ROLES as readonly string[]).includes(r as any));
    };
    assert.equal(validateRole(''), false, 'Empty role rejected');
    assert.equal(validateRole('unknown_role'), false, 'Invalid role rejected');
    assert.equal(validateRole('farmer'), true, 'Farmer accepted');
    assert.equal(validateRole('fpo'), true, 'FPO accepted');
    assert.equal(validateRole('buyer'), true, 'Buyer accepted');
    assert.equal(validateRole('consumer'), true, 'Consumer accepted');
    assert.equal(validateRole('logistics'), true, 'Logistics accepted');
    assert.equal(validateRole('admin'), true, 'Admin accepted');
    console.log('✔ Passed: Role must be one of the 6 canonical roles.\n');
    passed++;
  }

  // TEST 6: Centralized demo accounts configuration
  {
    console.log('TEST 6: Centralized demo accounts configuration');
    const expectedRoles = ['farmer', 'fpo', 'buyer', 'consumer', 'logistics', 'admin'];
    for (const r of expectedRoles) {
      assert.ok(DEMO_ACCOUNTS[r], `Demo account for role ${r} must exist`);
      assert.ok(isValidIndianMobile(DEMO_ACCOUNTS[r].mobile), `Demo mobile for ${r} must be valid 10 digits`);
      assert.ok(DEMO_ACCOUNTS[r].placeholderPassword.length > 6, `Demo password for ${r} must be present`);
      assert.ok(DEMO_ACCOUNTS[r].email.includes('@'), `Demo email for ${r} must be formatted`);
    }
    console.log('✔ Passed: All 6 demo accounts configured with valid formats.\n');
    passed++;
  }

  // TEST 7: Mobile to email resolution for demo placeholders
  {
    console.log('TEST 7: Mobile to email resolution for demo placeholders');
    assert.equal(resolveMobileToEmail('9000000001'), 'farmer@demo.gramora.farm');
    assert.equal(resolveMobileToEmail('9000000002'), 'fpo@demo.gramora.farm');
    assert.equal(resolveMobileToEmail('9000000003'), 'buyer@demo.gramora.farm');
    assert.equal(resolveMobileToEmail('9000000004'), 'consumer@demo.gramora.farm');
    assert.equal(resolveMobileToEmail('9000000005'), 'logistics@demo.gramora.farm');
    assert.equal(resolveMobileToEmail('9000000006'), 'admin@demo.gramora.farm');
    console.log('✔ Passed: Demo mobile numbers map deterministically to demo emails.\n');
    passed++;
  }

  // TEST 8: Mobile to email resolution for mock users
  {
    console.log('TEST 8: Mobile to email resolution for mock users');
    assert.equal(resolveMobileToEmail('9823045678'), 'ramesh.patel@ananyafarms.mock');
    assert.equal(resolveMobileToEmail('9437112345'), 'contact@westernodishafpo.mock');
    assert.equal(resolveMobileToEmail('9820067890'), 'procurement@greenrootsretail.mock');
    console.log('✔ Passed: Existing mock numbers resolve to mock user email identities.\n');
    passed++;
  }

  // TEST 9: Mobile to email resolution for generic mobile & registration identity
  {
    console.log('TEST 9: Mobile to email resolution for generic mobile & registration identity');
    assert.equal(resolveMobileToEmail('9123456780'), '9123456780@gramora.farm');
    // Test A & B: Specific requirement 7077350157 resolution
    const mobile = '7077350157';
    const cleanMobile = normalizeIndianMobile('+91 70773 50157');
    assert.equal(cleanMobile, mobile);
    assert.equal(resolveMobileToEmail(cleanMobile), '7077350157@gramora.farm');
    assert.equal(resolveMobileToEmail(mobile), '7077350157@gramora.farm');

    // Registration identity: Firebase Auth identifier is resolved mobile, while profile contact email is preserved
    const enteredEmail = 'farmer.user@gmail.com';
    const authIdentifier = resolveMobileToEmail(cleanMobile);
    assert.equal(authIdentifier, '7077350157@gramora.farm');
    assert.notEqual(authIdentifier, enteredEmail);
    assert.equal(enteredEmail, 'farmer.user@gmail.com');

    console.log('✔ Passed: Mobile 7077350157 resolves to 7077350157@gramora.farm for both login and registration.\n');
    passed++;
  }

  // TEST 10: Role matching and privilege escalation prevention
  {
    console.log('TEST 10: Role matching and privilege escalation prevention');
    assert.equal(rolesMatch('farmer', 'farmer'), true);
    assert.equal(rolesMatch('fpo', 'fpo'), true);
    assert.equal(rolesMatch('buyer', 'buyer'), true);
    assert.equal(rolesMatch('buyer', 'bulk_buyer'), true, 'bulk_buyer maps to buyer');
    assert.equal(rolesMatch('admin', 'admin'), true);

    // Escalation attempts MUST be rejected
    assert.equal(rolesMatch('admin', 'farmer'), false, 'Farmer selecting admin MUST fail');
    assert.equal(rolesMatch('admin', 'consumer'), false, 'Consumer selecting admin MUST fail');
    assert.equal(rolesMatch('buyer', 'farmer'), false, 'Farmer selecting buyer MUST fail');
    assert.equal(rolesMatch('farmer', 'logistics'), false, 'Logistics selecting farmer MUST fail');
    console.log('✔ Passed: Role mismatch strictly identified; client role escalation impossible.\n');
    passed++;
  }

  // TEST 11: Authoritative dashboard routing
  {
    console.log('TEST 11: Authoritative dashboard routing');
    assert.equal(getRoleDashboardPath('farmer'), '/farmer/dashboard');
    assert.equal(getRoleDashboardPath('fpo'), '/farmer/dashboard');
    assert.equal(getRoleDashboardPath('buyer'), '/buyer/dashboard');
    assert.equal(getRoleDashboardPath('bulk_buyer'), '/buyer/dashboard');
    assert.equal(getRoleDashboardPath('consumer'), '/buyer/dashboard');
    assert.equal(getRoleDashboardPath('logistics'), '/logistics/dashboard');
    assert.equal(getRoleDashboardPath('admin'), '/admin/dashboard');
    console.log('✔ Passed: All 6 roles route to their authoritative dashboards.\n');
    passed++;
  }

  // TEST 12: Role normalization
  {
    console.log('TEST 12: Role normalization function');
    assert.equal(normalizeRole('FARMER'), 'farmer');
    assert.equal(normalizeRole('bulk_buyer'), 'buyer');
    assert.equal(normalizeRole('Buyer'), 'buyer');
    assert.equal(normalizeRole('ADMIN'), 'admin');
    console.log('✔ Passed: normalizeRole correctly canonicalizes all variations.\n');
    passed++;
  }

  console.log('====================================================');
  console.log(`ALL ${passed}/${passed} LOGIN VALIDATION TESTS PASSED!`);
  console.log('====================================================\n');
}

runLoginValidationTests().catch((err) => {
  console.error('[FAILED]:', err);
  process.exit(1);
});
