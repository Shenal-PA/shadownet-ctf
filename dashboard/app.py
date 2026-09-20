#!/usr/bin/env python3

import re

from flask import Flask, render_template, request, session, redirect, url_for, jsonify
from database import (
    DATABASE, init_db, seed_challenges, add_user, hash_password, 
    record_submission, get_leaderboard, get_user_progress, verify_flag
)
import sqlite3
import os

app = Flask(__name__)
app.secret_key = os.urandom(24)

def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

#authentication
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('challenges'))
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        email = request.form.get('email', '')
        team_name = request.form.get('team_name', '')

        if not username or not password:
            return render_template('register.html', error="Username and password are required.")

        if add_user(username, password, email, team_name):
            return redirect(url_for('login'))
        else:
            return render_template('register.html', error="Username already exists.")

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        db.close()

        if user and user['password_hash'] == hash_password(password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['is_admin'] = user['is_admin']
            return redirect(url_for('challenges'))
        else:
            return render_template('login.html', error="Invalid credentials")
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


#challenges
@app.route('/challenges')
def challenges():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    db = get_db()
    cursor = db.cursor()

    #all challenges
    cursor.execute('''
        SELECT * FROM challenges 
        WHERE is_active = 1
        ORDER BY stage_number
    ''')
    challenges = cursor.fetchall()

    #solved challenges
    cursor.execute('''
SELECT DISTINCT challenge_id FROM submissions 
        WHERE user_id = ? AND is_correct = 1
    ''', (session['user_id'],))
    solved = {row[0] for row in cursor.fetchall()}

    db.close()
    return render_template('challenges.html', challenges=challenges, solved=solved)

@app.route('/challenge/<int:challenge_id>')
def challenge_detail(challenge_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    db = get_db()
    cursor = db.cursor()
    
    #get challenge
    cursor.execute('SELECT * FROM challenges WHERE id = ?', (challenge_id,))
    challenge = cursor.fetchone()
    
    if not challenge:
        return "Challenge not found", 404
    
    #get hints
    cursor.execute('''
        SELECT * FROM hints WHERE challenge_id = ?
        ORDER BY hint_level
    ''', (challenge_id,))
    hints = cursor.fetchall()
    
    #check if solved
    cursor.execute('''
        SELECT * FROM submissions 
        WHERE user_id = ? AND challenge_id = ? AND is_correct = 1
    ''', (session['user_id'], challenge_id))
    solved = cursor.fetchone() is not None
    
    db.close()
    
    return render_template('challenge_detail.html',
                          challenge=challenge,
                          hints=hints,
                          solved=solved)

@app.route('/api/submit_flag', methods=['POST'])
def submit_flag():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401

    data = request.get_json()
    challenge_id  = data.get('challenge_id')
    flag = data.get('flag')

    if not challenge_id or not flag:
        return jsonify({'error': 'Missing challenge_id or flag'}), 400
    
    #check if already solved
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        SELECT * FROM submissions 
        WHERE user_id = ? AND challenge_id = ? AND is_correct = 1
    ''', (session['user_id'], challenge_id))
    
    if cursor.fetchone():
        db.close()
        return jsonify({'error': 'Challenge already solved', 'correct': False}), 200
    
    db.close()
    
    #record submission
    is_correct = record_submission(session['user_id'], challenge_id, flag)
    
    if is_correct:
        return jsonify({
            'correct': True,
            'message': 'Flag accepted! Great job!',
            'points': 100  # TODO: Get actual points from database
        })
    else:
        return jsonify({
            'correct': False,
            'message': 'Incorrect flag. Try again!'
        })

#leaderboard
@app.route('/leaderboard')
def leaderboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    leaderboard_data = get_leaderboard()
    return render_template('leaderboard.html', leaderboard=leaderboard_data)

@app.route('/api/leaderboard')
def api_leaderboard():
    leaderboard_data = get_leaderboard()

    return jsonify([dict(row) if hasattr(row, 'keys') else row for row in leaderboard_data])

#user progress
@app.route('/progress')
def progress():
    if 'user_id' not in session:
        return redirect(url_for('login'))

    progress_data = get_user_progress(session['user_id'])
    return render_template('progress.html', progress=progress_data)

@app.route('/api/progress')
def api_progress():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401

    progress_data = get_user_progress(session['user_id'])
    return jsonify([dict(row) if hasattr(row, 'keys') else row for row in progress_data])

#admin
@app.route('/admin')
def admin():
    if 'user_id' not in session or not session.get('is_admin'):
        return "Access denied", 403

    db = get_db()
    cursor = db.cursor()

    cursor.execute('SELECT COUNT(*) FROM users')
    total_users = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM submissions WHERE is_correct = 1')
    total_submissions = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM challenges')
    total_challenges = cursor.fetchone()[0]

    db.close()

    return render_template('admin.html',
                           total_users=total_users,
                           total_submissions=total_submissions,
                           total_challenges=total_challenges)

@app.route('/admin/reset_all', methods=['POST'])
def admin_reset_all():
    if 'user_id' not in session or not session.get('is_admin'):
        return jsonify({'error': 'Access denied'}), 403
    
    db = get_db()
    cursor = db.cursor()
    
    cursor.execute('DELETE FROM submissions')
    cursor.execute('UPDATE scores SET total_points = 0, challenges_solved = 0')
    
    db.commit()
    db.close()
    
    return jsonify({'message': 'All scores reset'})

#error handlers
@app.errorhandler(404)
def page_not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        init_db()
        seed_challenges()
    
    app.run(host='0.0.0.0', port=5000, debug=False)