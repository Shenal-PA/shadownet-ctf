#!/usr/bin/env python3

from flask import Flask, render_template, request, session, redirect, url_for, jsonify
from database import (
    init_db, seed_challenges, add_user, hash_password, 
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


