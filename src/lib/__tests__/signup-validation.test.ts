import assert from 'node:assert/strict';
import {
  normalizeIndianMobile,
  isValidIndianMobile,
  getRoleDashboardPath,
} from '../auth-helpers';
import { USER_ROLES, UserRole } from '@/types';
import { OnboardingSchema, farmerProfileSchema } from '@/server/domain/user';
import { en } from '@/i18n/translations/en';
import { hi } from '@/i18n/translations/hi';
import { or } from '@/i18n/translations/or';
import { bn } from '@/i18n/translations/bn';
import { te } from '@/i18n/translations/te';

// Pure validation function reflecting client signup rules
interface SignupFormInput {
  mobile: string;
  password: string;
  email: string;
  role: string;
  landArea?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  cleanedData?: {
    mobile: string;
    email: string;
    role: UserRole;
    landArea?: number;
  };
}

function validateSignupForm(input: SignupFormInput): ValidationResult {
  // 1. Mobile validation
  const cleanMobile = normalizeIndianMobile(input.mobile);
  if (!isValidIndianMobile(cleanMobile)) {
    return { valid: false, error: 'invalidMobile' };
  }

  // 2. Password validation
  if (!input.password || input.password.trim().length === 0) {
    return { valid: false, error: 'passwordRequired' };
  }
  if (input.password.length < 6) {
    return { valid: false, error: 'passwordTooShort' };
  }

  // 3. Email validation
  const trimmedEmail = input.email.trim().toLowerCase();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { valid: false, error: 'invalidEmail' };
  }

  // 4. Role validation
  if (!input.role) {
    return { valid: false, error: 'roleRequired' };
  }

  if (!(USER_ROLES as readonly string[]).includes(input.role)) {
    return { valid: false, error: 'invalidRole' };
  }

  // Guard against Admin self-registration
  if (input.role === 'admin') {
    return { valid: false, error: 'adminSelfRegisterProhibited' };
  }

  // 5. Land Area validation (conditional: Farmer only)
  let parsedLandArea: number | undefined;
  if (input.role === 'farmer') {
    const num = Number(input.landArea);
    if (!input.landArea || isNaN(num) || num <= 0 || !isFinite(num)) {
      return { valid: false, error: 'invalidLandArea' };
    }
    parsedLandArea = num;
  }

  return {
    valid: true,
    cleanedData: {
      mobile: cleanMobile,
      email: trimmedEmail,
      role: input.role as UserRole,
      ...(parsedLandArea !== undefined ? { landArea: parsedLandArea } : {}),
    },
  };
}

async function runSignupValidationTests() {
  console.log('======================================================');
  console.log('STARTING GRAMORA SIGNUP VALIDATION TEST SUITE (18 TESTS)');
  console.log('======================================================\n');

  let passed = 0;

  // TEST 1: Valid Farmer signup (with land area)
  {
    console.log('TEST 1: Valid Farmer signup (with land area)');
    const res = validateSignupForm({
      mobile: '9876543210',
      password: 'StrongPassword123',
      email: 'farmer.ram@example.com',
      role: 'farmer',
      landArea: '5',
    });
    assert.equal(res.valid, true);
    assert.equal(res.cleanedData?.role, 'farmer');
    assert.equal(res.cleanedData?.landArea, 5);
    console.log('✔ Passed: Valid Farmer signup with positive land area accepted.\n');
    passed++;
  }

  // TEST 2: Valid Buyer signup (no land area required)
  {
    console.log('TEST 2: Valid Buyer signup (no land area required)');
    const res = validateSignupForm({
      mobile: '9876543211',
      password: 'StrongPassword123',
      email: 'buyer.anita@example.com',
      role: 'buyer',
    });
    assert.equal(res.valid, true);
    assert.equal(res.cleanedData?.role, 'buyer');
    assert.equal(res.cleanedData?.landArea, undefined);
    console.log('✔ Passed: Valid Buyer signup accepted without land area.\n');
    passed++;
  }

  // TEST 3: Valid Consumer signup (no land area required)
  {
    console.log('TEST 3: Valid Consumer signup (no land area required)');
    const res = validateSignupForm({
      mobile: '9876543212',
      password: 'StrongPassword123',
      email: 'consumer.rahul@example.com',
      role: 'consumer',
    });
    assert.equal(res.valid, true);
    assert.equal(res.cleanedData?.role, 'consumer');
    assert.equal(res.cleanedData?.landArea, undefined);
    console.log('✔ Passed: Valid Consumer signup accepted without land area.\n');
    passed++;
  }

  // TEST 4: Valid FPO signup (no land area required)
  {
    console.log('TEST 4: Valid FPO signup (no land area required)');
    const res = validateSignupForm({
      mobile: '9876543213',
      password: 'StrongPassword123',
      email: 'fpo.odisha@example.com',
      role: 'fpo',
    });
    assert.equal(res.valid, true);
    assert.equal(res.cleanedData?.role, 'fpo');
    assert.equal(res.cleanedData?.landArea, undefined);
    console.log('✔ Passed: Valid FPO signup accepted without land area.\n');
    passed++;
  }

  // TEST 5: Valid Logistics signup (no land area required)
  {
    console.log('TEST 5: Valid Logistics signup (no land area required)');
    const res = validateSignupForm({
      mobile: '9876543214',
      password: 'StrongPassword123',
      email: 'logistics.fleet@example.com',
      role: 'logistics',
    });
    assert.equal(res.valid, true);
    assert.equal(res.cleanedData?.role, 'logistics');
    assert.equal(res.cleanedData?.landArea, undefined);
    console.log('✔ Passed: Valid Logistics signup accepted without land area.\n');
    passed++;
  }

  // TEST 6: Admin signup rejection (security control preserved)
  {
    console.log('TEST 6: Admin signup rejection (security control preserved)');
    const res = validateSignupForm({
      mobile: '9876543215',
      password: 'StrongPassword123',
      email: 'admin.infiltrate@example.com',
      role: 'admin',
    });
    assert.equal(res.valid, false);
    assert.equal(res.error, 'adminSelfRegisterProhibited');
    console.log('✔ Passed: Admin self-registration strictly prevented at validation layer.\n');
    passed++;
  }

  // TEST 7: Invalid mobile numbers (short, bad prefix)
  {
    console.log('TEST 7: Invalid mobile numbers (short, bad prefix)');
    const shortMobile = validateSignupForm({
      mobile: '98765',
      password: 'StrongPassword123',
      email: 'test@example.com',
      role: 'buyer',
    });
    assert.equal(shortMobile.valid, false);
    assert.equal(shortMobile.error, 'invalidMobile');

    const badPrefix = validateSignupForm({
      mobile: '1234567890',
      password: 'StrongPassword123',
      email: 'test@example.com',
      role: 'buyer',
    });
    assert.equal(badPrefix.valid, false);
    assert.equal(badPrefix.error, 'invalidMobile');
    console.log('✔ Passed: Short mobiles and invalid prefixes rejected.\n');
    passed++;
  }

  // TEST 8: Invalid email format
  {
    console.log('TEST 8: Invalid email format');
    const invalidEmails = ['invalid-email', 'missing@domain', '@no-local.com', 'spaces in@email.com'];
    for (const em of invalidEmails) {
      const res = validateSignupForm({
        mobile: '9876543210',
        password: 'StrongPassword123',
        email: em,
        role: 'buyer',
      });
      assert.equal(res.valid, false, `Email "${em}" should be rejected`);
      assert.equal(res.error, 'invalidEmail');
    }
    console.log('✔ Passed: Malformed email addresses strictly rejected.\n');
    passed++;
  }

  // TEST 9: Missing password
  {
    console.log('TEST 9: Missing password');
    const emptyPassword = validateSignupForm({
      mobile: '9876543210',
      password: '',
      email: 'test@example.com',
      role: 'buyer',
    });
    assert.equal(emptyPassword.valid, false);
    assert.equal(emptyPassword.error, 'passwordRequired');

    const whitespacePassword = validateSignupForm({
      mobile: '9876543210',
      password: '   ',
      email: 'test@example.com',
      role: 'buyer',
    });
    assert.equal(whitespacePassword.valid, false);
    assert.equal(whitespacePassword.error, 'passwordRequired');
    console.log('✔ Passed: Empty and whitespace passwords rejected.\n');
    passed++;
  }

  // TEST 10: Password too short (< 6 chars)
  {
    console.log('TEST 10: Password too short (< 6 chars)');
    const shortPassword = validateSignupForm({
      mobile: '9876543210',
      password: '12345',
      email: 'test@example.com',
      role: 'buyer',
    });
    assert.equal(shortPassword.valid, false);
    assert.equal(shortPassword.error, 'passwordTooShort');
    console.log('✔ Passed: Passwords with fewer than 6 characters rejected.\n');
    passed++;
  }

  // TEST 11: Missing role
  {
    console.log('TEST 11: Missing role');
    const missingRole = validateSignupForm({
      mobile: '9876543210',
      password: 'StrongPassword123',
      email: 'test@example.com',
      role: '',
    });
    assert.equal(missingRole.valid, false);
    assert.equal(missingRole.error, 'roleRequired');
    console.log('✔ Passed: Missing role selection rejected.\n');
    passed++;
  }

  // TEST 12: Farmer missing land area
  {
    console.log('TEST 12: Farmer missing land area');
    const missingLandArea = validateSignupForm({
      mobile: '9876543210',
      password: 'StrongPassword123',
      email: 'farmer@example.com',
      role: 'farmer',
      landArea: '',
    });
    assert.equal(missingLandArea.valid, false);
    assert.equal(missingLandArea.error, 'invalidLandArea');
    console.log('✔ Passed: Farmer without land area rejected.\n');
    passed++;
  }

  // TEST 13: Farmer zero land area
  {
    console.log('TEST 13: Farmer zero land area');
    const zeroLandArea = validateSignupForm({
      mobile: '9876543210',
      password: 'StrongPassword123',
      email: 'farmer@example.com',
      role: 'farmer',
      landArea: '0',
    });
    assert.equal(zeroLandArea.valid, false);
    assert.equal(zeroLandArea.error, 'invalidLandArea');
    console.log('✔ Passed: Farmer with 0 land area rejected.\n');
    passed++;
  }

  // TEST 14: Farmer negative land area
  {
    console.log('TEST 14: Farmer negative land area');
    const negLandArea = validateSignupForm({
      mobile: '9876543210',
      password: 'StrongPassword123',
      email: 'farmer@example.com',
      role: 'farmer',
      landArea: '-3.5',
    });
    assert.equal(negLandArea.valid, false);
    assert.equal(negLandArea.error, 'invalidLandArea');
    console.log('✔ Passed: Farmer with negative land area rejected.\n');
    passed++;
  }

  // TEST 15: Farmer decimal land area (e.g. 2.5)
  {
    console.log('TEST 15: Farmer decimal land area (e.g. 2.5)');
    const decimalLandArea = validateSignupForm({
      mobile: '9876543210',
      password: 'StrongPassword123',
      email: 'farmer@example.com',
      role: 'farmer',
      landArea: '2.5',
    });
    assert.equal(decimalLandArea.valid, true);
    assert.equal(decimalLandArea.cleanedData?.landArea, 2.5);
    console.log('✔ Passed: Farmer with decimal land area 2.5 correctly parsed and accepted.\n');
    passed++;
  }

  // TEST 16: Non-farmer does not require land area
  {
    console.log('TEST 16: Non-farmer does not require land area');
    const nonFarmerRoles = ['buyer', 'consumer', 'fpo', 'logistics'] as const;
    for (const r of nonFarmerRoles) {
      const res = validateSignupForm({
        mobile: '9876543210',
        password: 'StrongPassword123',
        email: `${r}@example.com`,
        role: r,
      });
      assert.equal(res.valid, true, `Role ${r} must be valid without land area`);
      assert.equal(res.cleanedData?.landArea, undefined);
    }
    console.log('✔ Passed: All non-farmer roles successfully bypass land area requirement.\n');
    passed++;
  }

  // TEST 17: Translation parity count check (250/250 across all 5 languages)
  {
    console.log('TEST 17: Translation parity count check across en, hi, or, bn, te');
    const countKeys = (obj: any): number => {
      let count = 0;
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          count += countKeys(obj[key]);
        } else {
          count++;
        }
      }
      return count;
    };

    const enCount = countKeys(en);
    const hiCount = countKeys(hi);
    const orCount = countKeys(or);
    const bnCount = countKeys(bn);
    const teCount = countKeys(te);

    console.log(`Key counts: EN=${enCount}, HI=${hiCount}, OR=${orCount}, BN=${bnCount}, TE=${teCount}`);
    assert.equal(enCount, 250, 'English dictionary must have exactly 250 keys');
    assert.equal(hiCount, 250, 'Hindi dictionary must have exactly 250 keys');
    assert.equal(orCount, 250, 'Odia dictionary must have exactly 250 keys');
    assert.equal(bnCount, 250, 'Bengali dictionary must have exactly 250 keys');
    assert.equal(teCount, 250, 'Telugu dictionary must have exactly 250 keys');

    // Verify all 10 new auth keys are present and non-empty in every language
    const newKeys = [
      'emailPlaceholder',
      'landAreaLabel',
      'landAreaPlaceholder',
      'acresUnit',
      'invalidLandArea',
      'createAccount',
      'invalidEmail',
      'passwordTooShort',
      'emailAlreadyInUse',
      'adminSelfRegisterProhibited',
    ] as const;

    const dicts = { en, hi, or, bn, te };
    for (const [lang, dict] of Object.entries(dicts)) {
      for (const k of newKeys) {
        assert.ok(
          (dict as any).auth[k],
          `Key auth.${k} must exist and not be empty in ${lang}`
        );
      }
    }
    console.log('✔ Passed: 100% key parity (250 keys) and all 10 new signup keys verified in 5 languages.\n');
    passed++;
  }

  // TEST 18: Onboarding schema validation (Server domain schema check)
  {
    console.log('TEST 18: Server OnboardingSchema & farmerProfileSchema validation');

    // Valid Farmer onboarding payload
    const farmerOnboard = OnboardingSchema.safeParse({
      role: 'farmer',
      phone: '+91 9876543210',
      farmerProfile: {
        landHoldingAcres: 3.5,
      },
    });
    assert.equal(farmerOnboard.success, true, 'Valid Farmer payload must pass server schema');

    // Admin onboarding MUST be rejected by OnboardingSchema
    const adminOnboard = OnboardingSchema.safeParse({
      role: 'admin',
      phone: '+91 9876543210',
    });
    assert.equal(adminOnboard.success, false, 'Admin onboarding must be rejected by server schema');

    // Farmer with landArea alias
    const farmerAlias = farmerProfileSchema.safeParse({
      landArea: 10,
    });
    assert.equal(farmerAlias.success, true, 'landArea alias must be accepted by farmerProfileSchema');

    // Farmer with 0 land area must be rejected
    const farmerZero = farmerProfileSchema.safeParse({
      landHoldingAcres: 0,
    });
    assert.equal(farmerZero.success, false, '0 acres must fail server validation');

    console.log('✔ Passed: Server domain schemas enforce safety, reject admin, and validate land area.\n');
    passed++;
  }

  console.log('======================================================');
  console.log(`ALL ${passed}/${passed} SIGNUP VALIDATION TESTS PASSED!`);
  console.log('======================================================\n');
}

runSignupValidationTests().catch((err) => {
  console.error('[FAILED]:', err);
  process.exit(1);
});
