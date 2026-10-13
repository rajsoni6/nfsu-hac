const { evaluate } = require('../services/policyEngine.service');

const baseStudent = {
  registrationStatus: 'registered',
  eligibilityStatus: 'eligible',
  isExcludedFromDrives: false,
  placementStatus: 'unplaced',
  currentCategory: null,
  currentPackageLPA: 0,
};

const company = (category, minPackageLPA) => ({ category, minPackageLPA });

describe('Registration & Eligibility', () => {
  it('blocks unregistered student', async () => {
    const r = await evaluate({ ...baseStudent, registrationStatus: 'not_registered' }, company('A', 12), 'F');
    expect(r.allowed).toBe(false);
    expect(r.flags).toContain('NOT_REGISTERED');
  });

  it('blocks ineligible student', async () => {
    const r = await evaluate({ ...baseStudent, eligibilityStatus: 'ineligible' }, company('A', 12), 'F');
    expect(r.allowed).toBe(false);
    expect(r.flags).toContain('NOT_ELIGIBLE');
  });

  it('blocks excluded student', async () => {
    const r = await evaluate({ ...baseStudent, isExcludedFromDrives: true }, company('A', 12), 'F');
    expect(r.allowed).toBe(false);
    expect(r.flags).toContain('ABSENTEEISM_EXCLUSION');
  });
});

describe('Offer-type restrictions', () => {
  it('I+F placed student cannot participate further', async () => {
    const r = await evaluate({ ...baseStudent, placementStatus: 'internship_fte' }, company('A+', 20), 'F');
    expect(r.allowed).toBe(false);
    expect(r.flags).toContain('ALREADY_PLACED_IF');
  });

  it('internship_only student cannot apply for another I', async () => {
    const r = await evaluate({ ...baseStudent, placementStatus: 'internship_only' }, company('B', 7), 'I');
    expect(r.allowed).toBe(false);
    expect(r.flags).toContain('OFFER_TYPE_VIOLATION');
  });

  it('fte_only student cannot apply for another F', async () => {
    const r = await evaluate({ ...baseStudent, placementStatus: 'fte_only' }, company('B', 7), 'F');
    expect(r.allowed).toBe(false);
    expect(r.flags).toContain('OFFER_TYPE_VIOLATION');
  });

  it('internship_only student can apply for F', async () => {
    const r = await evaluate({ ...baseStudent, placementStatus: 'internship_only' }, company('B', 7), 'F');
    expect(r.allowed).toBe(true);
  });
});

describe('Category switching rules', () => {
  it('A+ student cannot switch', async () => {
    const r = await evaluate({ ...baseStudent, currentCategory: 'A+', currentPackageLPA: 18 }, company('A+', 20), 'F');
    expect(r.allowed).toBe(false);
    expect(r.flags).toContain('SWITCHING_VIOLATION');
  });

  it('A student can only switch to A+', async () => {
    const r = await evaluate({ ...baseStudent, currentCategory: 'A', currentPackageLPA: 12 }, company('B', 8), 'F');
    expect(r.allowed).toBe(false);
    expect(r.flags).toContain('SWITCHING_VIOLATION');
  });

  it('A student allowed to switch to A+', async () => {
    const r = await evaluate({ ...baseStudent, currentCategory: 'A', currentPackageLPA: 12 }, company('A+', 18), 'F');
    expect(r.allowed).toBe(true);
  });

  it('B student blocked if new package < 1.5x current', async () => {
    const r = await evaluate({ ...baseStudent, currentCategory: 'B', currentPackageLPA: 8 }, company('A', 11), 'F');
    expect(r.allowed).toBe(false);
    expect(r.flags).toContain('SWITCHING_VIOLATION');
  });

  it('B student allowed if new package >= 1.5x current', async () => {
    const r = await evaluate({ ...baseStudent, currentCategory: 'B', currentPackageLPA: 8 }, company('A', 12), 'F');
    expect(r.allowed).toBe(true);
  });

  it('C student can apply to higher category', async () => {
    const r = await evaluate({ ...baseStudent, currentCategory: 'C', currentPackageLPA: 4 }, company('B', 7), 'F');
    expect(r.allowed).toBe(true);
  });

  it('unplaced student passes all checks', async () => {
    const r = await evaluate(baseStudent, company('A', 12), 'F');
    expect(r.allowed).toBe(true);
  });
});
