const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ecoguardians',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Main function to add records every 10 seconds
(async function main() {

})();

const express = require("express")
const app = express()


app.use(express.json())

app.post("/send",async (req, res) => {
	const data = req.body;
	console.log(data)

  try {
      // Insert a new record
      await pool.query('INSERT INTO energy (mwh, time) VALUES ($1, $2)', [data.mwh, data.currentTime]);

      console.log(`Added record: mwh=${data.mwh}, time=${data.currentTime}`);
      res.json({msq: "sent successfully"});
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({msq: err.message});
  }
	
})


app.listen(3000)


