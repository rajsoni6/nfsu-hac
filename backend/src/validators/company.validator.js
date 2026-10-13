const Joi = require('joi');
const { COURSES } = require('../utils/constants');

const companySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  category: Joi.string().valid('A+', 'A', 'B', 'C').required(),
  minPackageLPA: Joi.number().positive().required(),
  maxPackageLPA: Joi.number().positive().greater(Joi.ref('minPackageLPA')).required(),
  eligibilityCriteria: Joi.object({
    minCGPA: Joi.number().min(0).max(10).allow(null).optional(),
    allowedCourses: Joi.array().items(Joi.string().valid(...COURSES)).optional(),
    noActiveBacklog: Joi.boolean().optional(),
  }).optional(),
  isActive: Joi.boolean().optional(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(d => ({ field: d.path[0], message: d.message })),
    });
  }
  next();
};

module.exports = { validateCompany: validate(companySchema) };
