console.log('🚀 Test deployment working!');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ 
    message: 'Plundora Backend Test - Deployment Working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
});
