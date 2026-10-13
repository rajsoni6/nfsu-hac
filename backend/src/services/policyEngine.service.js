const Offer = require('../models/Offer.model');

/**
 * Evaluates whether a student can receive a new offer based on NFSU placement policy.
 * @param {Object} student - Student document
 * @param {Object} company - Company document (new offer company)
 * @param {String} newOfferType - 'I' | 'F' | 'I+F'
 * @returns {Object} { allowed, reason, flags }
 */
const evaluate = async (student, company, newOfferType) => {
  const flags = [];

  // 1. Registration check
  if (student.registrationStatus !== 'registered') {
    return { allowed: false, reason: 'Student is not registered for placement.', flags: ['NOT_REGISTERED'] };
  }

  // 2. Eligibility check
  if (student.eligibilityStatus !== 'eligible') {
    return { allowed: false, reason: 'Student is not eligible for placement.', flags: ['NOT_ELIGIBLE'] };
  }

  // 3. Drive exclusion check
  if (student.isExcludedFromDrives) {
    return { allowed: false, reason: 'Student is excluded from drives due to absenteeism.', flags: ['ABSENTEEISM_EXCLUSION'] };
  }

  // 4. I+F already placed — no further participation
  if (student.placementStatus === 'internship_fte') {
    return { allowed: false, reason: 'Student has an I+F offer and cannot participate further.', flags: ['ALREADY_PLACED_IF'] };
  }

  // 5. Offer-type restriction
  if (student.placementStatus === 'internship_only' && newOfferType === 'I') {
    return { allowed: false, reason: 'Student already has an internship offer. Can only apply for F or I+F roles.', flags: ['OFFER_TYPE_VIOLATION'] };
  }
  if (student.placementStatus === 'fte_only' && newOfferType === 'F') {
    return { allowed: false, reason: 'Student already has an FTE offer. Can only apply for internship roles.', flags: ['OFFER_TYPE_VIOLATION'] };
  }

  // 6. Category switching rules
  const current = student.currentCategory;
  const newCat = company.category;
  const newPkg = company.minPackageLPA;

  if (current === 'A+') {
    return { allowed: false, reason: 'Student selected in A+ category. No further switching allowed.', flags: ['SWITCHING_VIOLATION'] };
  }

  if (current === 'A' && newCat !== 'A+') {
    return { allowed: false, reason: 'Student holds A-category offer. Switching only permitted to A+ companies.', flags: ['SWITCHING_VIOLATION'] };
  }

  if (current === 'B') {
    const required = student.currentPackageLPA * 1.5;
    if (newPkg < required) {
      return {
        allowed: false,
        reason: `Student holds B-category offer (${student.currentPackageLPA} LPA). New package must be ≥ ${required.toFixed(2)} LPA (1.5×).`,
        flags: ['SWITCHING_VIOLATION'],
      };
    }
  }

  // All checks passed
  return { allowed: true, reason: 'All policy checks passed.', flags };
};

module.exports = { evaluate };
