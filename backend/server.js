require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'AgroSphere backend running' });
});

// Uncomment each route as you build it:
app.use('/api/chatbot', require('./routes/chatbot'));
// app.use('/api/farm', require('./routes/farmIntel'));
// app.use('/api/market', require('./routes/market'));
// app.use('/api/disease', require('./routes/disease'));
// app.use('/api/drone', require('./routes/drone'));
// app.use('/api/irrigation', require('./routes/irrigation'));
app.use('/api/storage', require('./routes/storage'));
app.use('/api/schemes', require('./routes/schemes'));
app.use('/api/trace', require('./routes/trace'));
// app.use('/api/dashboard', require('./routes/dashboard'));

const PORT = Number(process.env.PORT) || 5000;
const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n[AgroSphere] Port ${PORT} is already in use.\n` +
        '  • Stop the other server (close old terminals, or end the Node process).\n' +
        `  • Or use another port: set PORT=5001 in backend/.env and restart.\n` +
        '  • Windows: netstat -ano | findstr :5000  then taskkill /PID <pid> /F\n'
    );
    process.exit(1);
  }
  throw err;
});