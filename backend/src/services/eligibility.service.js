/**
 * Checks if a student meets registration and academic eligibility for a company.
 * @param {Object} student - Student document
 * @param {Object} company - Company document
 * @returns {{ eligible: boolean, reason: string }}
 */
const check = (student, company) => {
  if (student.registrationStatus !== 'registered') {
    return { eligible: false, reason: 'Student is not registered for placement.' };
  }

  if (student.eligibilityStatus !== 'eligible') {
    return { eligible: false, reason: 'Student is not academically eligible.' };
  }

  const criteria = company.eligibilityCriteria || {};

  if (criteria.allowedCourses?.length && !criteria.allowedCourses.includes(student.course)) {
    return { eligible: false, reason: `Student course (${student.course}) not eligible for this company.` };
  }

  return { eligible: true, reason: 'Eligibility checks passed.' };
};

module.exports = { check };
