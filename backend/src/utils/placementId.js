const Student = require('../models/Student.model');

const generate = (course, batch) => {
  const year = batch.slice(-2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${course}-${year}-${rand}`;
};

const generateUnique = async (course, batch) => {
  let id;
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    id = generate(course, batch);
    exists = await Student.exists({ placementId: id });
    attempts++;
  }
  if (exists) throw new Error('Could not generate unique Placement ID');
  return id;
};

module.exports = { generateUnique };
