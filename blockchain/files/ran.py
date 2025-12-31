import sqlite3
import time
import random

# Path to the SQLite file
db_path = "energy.sqlite"

def add_record(db_path):
    """
    Add a record to the energy table with a random mwh value and current timestamp.
    """
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Generate random mwh and current timestamp
        mwh = random.randint(50, 500)  # Random mwh value between 50 and 500
        current_time = int(time.time())  # Current Unix timestamp in seconds
        
        # Insert a new record
        cursor.execute("INSERT INTO energy (mwh, time) VALUES (?, ?)", (mwh, current_time))
        
        # Commit and close
        conn.commit()
        print(f"Added record: mwh={mwh}, time={current_time}")
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("Starting to add records every 10 seconds. Press Ctrl+C to stop.")
    try:
        while True:
            add_record(db_path)
            time.sleep(10)  # Wait for 10 seconds
    except KeyboardInterrupt:
        print("\nStopped adding records.")
