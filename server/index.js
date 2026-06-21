const express = require('express');
const cors = require('cors');

const roomsRouter = require('./routes/rooms');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:8081';

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/rooms', roomsRouter);

app.listen(PORT, () => {
  console.log(`Bingo Night server listening on port ${PORT}`);
});
