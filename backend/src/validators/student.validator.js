const Joi = require('joi');
const { COURSES } = require('../utils/constants');

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  mobile: Joi.string().trim().pattern(/^[6-9]\d{9}$/).message('Invalid Indian mobile number').required(),
  email: Joi.string().trim().email().lowercase().required(),
  course: Joi.string().valid(...COURSES).required(),
  batch: Joi.string().trim().min(4).max(20).required(),
  registrationStatus: Joi.string().valid('registered', 'deregistered', 'not_registered').default('not_registered'),
  eligibilityStatus: Joi.string().valid('eligible', 'ineligible', 'pending').default('pending'),
  remarks: Joi.string().max(500).allow('').optional(),
  password: Joi.string().min(8).max(128).required(),
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  mobile: Joi.string().trim().pattern(/^[6-9]\d{9}$/),
  email: Joi.string().trim().email().lowercase(),
  registrationStatus: Joi.string().valid('registered', 'deregistered', 'not_registered'),
  eligibilityStatus: Joi.string().valid('eligible', 'ineligible', 'pending'),
  remarks: Joi.string().max(500).allow(''),
}).min(1);

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

module.exports = {
  validateCreate: validate(createSchema),
  validateUpdate: validate(updateSchema),
};
