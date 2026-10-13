const Joi = require('joi');

const createSchema = Joi.object({
  student: Joi.string().hex().length(24).required(),
  company: Joi.string().hex().length(24).required(),
  offerType: Joi.string().valid('I', 'F', 'I+F').required(),
  stipendAmount: Joi.when('offerType', {
    is: Joi.valid('I', 'I+F'),
    then: Joi.number().positive().required(),
    otherwise: Joi.number().optional(),
  }),
  stipendPeriod: Joi.string().max(50).optional(),
  ctcLPA: Joi.when('offerType', {
    is: Joi.valid('F', 'I+F'),
    then: Joi.number().positive().required(),
    otherwise: Joi.number().optional(),
  }),
  offerDate: Joi.date().iso().required(),
  acceptanceDeadline: Joi.date().iso().greater(Joi.ref('offerDate')).required(),
  isOffCampus: Joi.boolean().default(false),
  nocStatus: Joi.string().max(100).allow(null, '').optional(),
});

const overrideSchema = Joi.object({
  overrideNote: Joi.string().min(10).max(500).required(),
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

module.exports = {
  validateCreate: validate(createSchema),
  validateOverride: validate(overrideSchema),
};
