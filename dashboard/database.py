#!/usr/bin/env python3

import sqlite3
import os
from datetime import datetime
import hashlib

DATABASE = 'scores.db'

def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    cursor = db.cursor()

    #users
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT,
            team_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_admin BOOLEAN DEFAULT 0
        )
    ''')

    #challenges
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS challenges (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            domain TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            description TEXT NOT NULL,
            flag_hash TEXT NOT NULL,
            points INTEGER DEFAULT 100,
            delivery_method TEXT,
            stage_number INTEGER,
            is_active BOOLEAN DEFAULT 1
        )
    ''')

    #submissions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            challenge_id INTEGER NOT NULL,
            submitted_flag TEXT NOT NULL,
            is_correct BOOLEAN NOT NULL,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (challenge_id) REFERENCES challenges(id)
        )
    ''')

    #score table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_points INTEGER DEFAULT 0,
            challenges_solved INTEGER DEFAULT 0,
            last_submission_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    #hints
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            challenge_id INTEGER NOT NULL,
            hint_level INTEGER NOT NULL,
            hint_text TEXT NOT NULL,
            point_penalty INTEGER DEFAULT 10,
            FOREIGN KEY (challenge_id) REFERENCES challenges(id)
            )
    ''')

    db.commit()
    db.close()
    print("Database initialized successfully.")

def seed_challenges():
    db = get_db()
    cursor = db.cursor()

    challenges_data = [
        (1, 'First Contact', 'OSINT', 'Easy', 'Find hidden codename in image metadata', 
         'a8f4c9d2e1b5f6a3c7d9e1b5f6a3c7d9', 100, 'static_files', 1),
        
        (2, 'Frequency', 'Steganography', 'Easy-Moderate', 'Extract hidden message from audio spectrogram',
         'b9e5d0e3f2c6g7b4d8e0f2c6g7b4d8e0', 120, 'static_files', 2),
        
        (3, 'Broken Cipher', 'Cryptography', 'Moderate', 'Exploit weak Vigenère cipher via oracle',
         'c0f6e1f4g3d7h8c5e9f1g3d7h8c5e9f1', 150, 'docker', 3),
        
        (4, 'Front Door', 'Web Security', 'Moderate', 'Bypass login with SQL injection',
         'd1g7f2g5h4e8i9d6f0g2h4e8i9d6f0g2', 150, 'docker', 4),
        
        (5, 'Automate It', 'Programming', 'Moderate', 'Predict pseudo-random token sequence',
         'e2h8g3h6i5f9j0e7g1h3i5f9j0e7g1h3', 150, 'docker', 5),
        
        (6, 'Decompiled', 'Reverse Engineering', 'Moderate-Hard', 'Extract flag from binary analysis',
         'f3i9h4i7j6g0k1f8h2i4j6g0k1f8h2i4', 200, 'vm', 6),
        
        (7, 'Under the Hood', 'Linux Security', 'Moderate-Hard', 'Privilege escalation to root',
         'g4j0i5j8k7h1l2g9i3j5k7h1l2g9i3j5', 200, 'vm', 7),
        
        (8, 'Full Breach', 'Networking', 'Hard', 'Network pivoting and capstone challenge',
         'h5k1j6k9l8i2m3h0j4k6l8i2m3h0j4k6', 300, 'vm_cluster', 8),
    ]

    try:
        cursor.executemany('''
            INSERT OR REPLACE INTO challenges 
            (id, name, domain, difficulty, description, flag_hash, points, delivery_method, stage_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', challenges_data)

        db.commit()
        print(f"Inserted {len(challenges_data)} challenges into the database.")
    except Exception as e:
        print(f"Error inserting challenges: {e}")
    finally:
        db.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def hash_flag(flag):
    return hashlib.sha256(flag.encode()).hexdigest()

def add_user(username, password , email='' , team_name=''):
    db = get_db()
    cursor = db.cursor()

    try:
        password_hash = hash_password(password)
        cursor.execute('''
            INSERT INTO users (username, password_hash, email, team_name)
            VALUES (?, ?, ?, ?)
        ''', (username, password_hash, email, team_name))

        user_id = cursor.lastrowid

        cursor.execute('''
            INSERT INTO scores (user_id)
            VALUES (?)
        ''', (user_id,))

        db.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        db.close()

def verify_flag(challenge_id, submitted_flag):
    db = get_db()
    cursor = db.cursor()

    submitted_hash = hash_flag(submitted_flag)

    cursor.execute('''
        SELECT flag_hash FROM challenges WHERE id = ?
    ''', (challenge_id,))

    result = cursor.fetchone()
    db.close()

    if result and result[0] == submitted_hash:
        return True
    return False

def record_submission(user_id, challenge_id, submitted_flag, is_correct):
    db = get_db()
    cursor = db.cursor()

    is_correct = verify_flag(challenge_id, submitted_flag)

    cursor.execute('''
        INSERT INTO submissions (user_id, challenge_id, submitted_flag, is_correct)
        VALUES (?, ?, ?, ?)
    ''', (user_id, challenge_id, submitted_flag, is_correct))

    if is_correct:
        cursor.execute('SELECT points FROM challenges WHERE id = ?', (challenge_id,))
        challenge = cursor.fetchone()
        points = challenge[0] if challenge else 0

        cursor.execute('''
            UPDATE scores 
            SET total_points = total_points + ?,
                challenges_solved = challenges_solved + 1,
                last_submission_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        ''', (points, user_id))
    
    db.commit()
    db.close()

    return is_correct

def get_leaderboard():
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('''
        SELECT u.username, u.team_name, s.total_points, s.challenges_solved, s.last_submission_at
        FROM scores s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.total_points DESC, s.last_submission_at ASC
        LIMIT 10
    ''')
    
    results = cursor.fetchall()
    db.close()
    
    return results

def get_user_progress(user_id):
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('''
        SELECT c.id, c.name, c.domain, c.points, 
               CASE WHEN s.is_correct THEN 1 ELSE 0 END as solved
        FROM challenges c
        LEFT JOIN submissions s ON c.id = s.challenge_id AND s.user_id = ?
        ORDER BY c.stage_number
    ''', (user_id,))
    
    results = cursor.fetchall()
    db.close()
    
    return results

if __name__ == '__main__':
    init_db()
    seed_challenges()
    print("db setup complete.")