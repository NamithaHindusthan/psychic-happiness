import {
  firstError,
  normalizeEmail,
  normalizeOtp,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validateLoginPassword,
  validateOtp,
  validatePassword,
} from '@/lib/validation';

describe('validateEmail', () => {
  it.each(['a@b.co', 'first.last+tag@sub.example.com', '  Mixed@Case.IO  '])('accepts %s', (v) => {
    expect(validateEmail(v)).toBeNull();
  });
  it.each(['', '   ', 'plain', 'a@b', 'a@@b.com', 'a b@c.com', '@x.com', 'x@.com'])('rejects "%s"', (v) => {
    expect(validateEmail(v)).not.toBeNull();
  });
  it('normalises case and whitespace', () => {
    expect(normalizeEmail('  Hi@Example.COM ')).toBe('hi@example.com');
  });
});

describe('validatePassword', () => {
  it('accepts a normal password', () => expect(validatePassword('tasknest42')).toBeNull());
  it('rejects empty, short, letters-only, numbers-only and over-long', () => {
    expect(validatePassword('')).not.toBeNull();
    expect(validatePassword('abc123')).toMatch(/at least 8/);
    expect(validatePassword('abcdefghij')).toMatch(/letter and one number/);
    expect(validatePassword('1234567890')).toMatch(/letter and one number/);
    expect(validatePassword('a1'.repeat(40))).toMatch(/72/);
  });
  it('login only requires something to be typed', () => {
    expect(validateLoginPassword('')).not.toBeNull();
    expect(validateLoginPassword('x')).toBeNull();
  });
});

describe('confirm / name / otp', () => {
  it('checks passwords match', () => {
    expect(validateConfirmPassword('a1b2c3d4', '')).not.toBeNull();
    expect(validateConfirmPassword('a1b2c3d4', 'different1')).toMatch(/do not match/);
    expect(validateConfirmPassword('a1b2c3d4', 'a1b2c3d4')).toBeNull();
  });
  it('validates names', () => {
    expect(validateFullName(' A ')).not.toBeNull();
    expect(validateFullName('Al')).toBeNull();
    expect(validateFullName('x'.repeat(61))).not.toBeNull();
  });
  it('validates codes of 6-10 digits and strips non-digits', () => {
    expect(normalizeOtp('12 34-56')).toBe('123456');
    expect(validateOtp('')).not.toBeNull();
    expect(validateOtp('12345')).not.toBeNull();
    expect(validateOtp('123 456')).toBeNull();
    expect(validateOtp('12345678')).toBeNull();
    expect(validateOtp('12345678901')).not.toBeNull();
  });
  it('firstError returns the first non-null', () => {
    expect(firstError(null, 'b', 'c')).toBe('b');
    expect(firstError(null, null)).toBeNull();
  });
});
