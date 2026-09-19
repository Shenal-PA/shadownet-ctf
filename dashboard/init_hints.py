import sqlite3

DATABASE = 'scores.db'

def add_hints():
    db = sqlite3.connect(DATABASE)
    cursor = db.cursor()

    hints_data = [
        #stage3 - crypto
        (3, 1, "Mathak karala hint tika add krnna", 10),
        (3, 2, "Mathak karala hint tika add krnna", 20),
        (3, 3, "Mathak karala hint tika add krnna", 30),

        #stage4 - web sec
        #stage5 - scripting
        #stage6 - rev eng
        #stage7 - Linuc sec
        #stage8 - Networking
    ]

    try:
        cursor.executemany('''
            INSERT INTO hints (challenge_id, hint_level, hint_text, point_penalty)
            VALUES (?, ?, ?, ?)
        ''', hints_data)

        db.commit()
        print(f"added {len(hints_data)} hints to the database.")
    except Exception as e:
        print(f"Error adding hints: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_hints()