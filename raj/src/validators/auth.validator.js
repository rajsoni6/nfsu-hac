const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string().trim().lowercase().min(3).max(50).required(),
  password: Joi.string().min(8).max(128).required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(8).max(128).required(),
  newPassword: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .message('Password must contain uppercase, lowercase, number, and special character')
    .required(),
});

const mfaVerifySchema = Joi.object({
  username: Joi.string().trim().lowercase().required(),
  token: Joi.string().length(6).pattern(/^\d+$/).required(),
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
  validateLogin: validate(loginSchema),
  validateChangePassword: validate(changePasswordSchema),
  validateMfaVerify: validate(mfaVerifySchema),
};
