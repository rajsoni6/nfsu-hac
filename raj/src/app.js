require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmetConfig = require('./config/helmet.config');
const { apiLimiter } = require('./config/rateLimit.config');
const sanitizeInput = require('./middleware/sanitizeInput');
const routes = require('./routes/index');

const app = express();

app.use(helmetConfig);
app.use(cors({ origin: process.env.ALLOWED_ORIGINS, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(...sanitizeInput);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  },
}));

app.use('/api', apiLimiter, routes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
