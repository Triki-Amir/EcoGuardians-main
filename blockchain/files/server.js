const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

// Path to the SQLite file
const dbPath = 'energy.sqlite';

// Main function to add records every 10 seconds
(async function main() {

})();

const express = require("express")
const app = express()


app.use(express.json())

app.post("/send",async (req, res) => {
	const data = req.body;
	console.log(data)
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    }
    console.log('Connected to the database.');
  });

  try {
      // Insert a new record
      const run = promisify(db.run.bind(db));
      await run('INSERT INTO energy (mwh, time) VALUES (?, ?)', [data.mwh, data.currentTime]);

      console.log(`Added record: mwh=${data.mwh}, time=${data.currentTime}`);
      res.json({msq: "sent successfully"});
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({msq: err.message});
  }

  // Graceful shutdown on Ctrl+C
  process.on('SIGINT', () => {
    console.log('\nStopping the script...');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  });
	
})


app.listen(3000)


