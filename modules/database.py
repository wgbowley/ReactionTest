"""
File: database.py
Author: William Bowley
Version: 0.1
Date: 2024 - 09 - 04

Description:
    Manages the database and adds or gets results
    for individual users.

    Set environment variable:
    (Windows - CMD)      | set DB_FILE_PATH=(location_path)
    (Debian - Terminal):
        - nano ~/.bashrc
        - export DB_FILE_PATH=(location_path)
        - source ~/.bashrc
"""

import sqlite3
import os

from typing import Dict

# Gets the database file path from an environment variable
DB_FILE = os.getenv('DB_FILE_PATH', os.path.join(os.getcwd(), 'reaction.db'))


def initialize_database() -> None:
    """
    Creates database file and tables if they
    don't exist yet. If they do, it just ignores them.
    """
    database = sqlite3.connect(DB_FILE)
    cursor = database.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            time INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
        """
    )
    database.commit()
    database.close()


def add_user(user_id: str) -> None:
    """
    Add a new user to the database if they
    don't exist.

    Args:
        user_id: cookie stored within their browser
    """
    database = sqlite3.connect(DB_FILE)
    cursor = database.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO users (user_id) VALUES (?)", (user_id,)
    )
    database.commit()
    database.close()


def add_result(
    user_id: str,
    time: float
) -> None:
    """
    Adds a new reaction time result for a user

    Args:
        user_id: cookie stored within their browser
        time: Users reaction time
    """
    database = sqlite3.connect(DB_FILE)
    cursor = database.cursor()
    cursor.execute(
        "INSERT INTO results (user_id, time) VALUES (?, ?)", (user_id, time)
    )
    database.commit()
    database.close()


def get_stats(user_id: str) -> Dict[str, float]:
    """
    Get the mean, count, and standard deviation for a
    single user

    Args:
        user_id: cookie stored within their browser
    """
    database = sqlite3.connect(DB_FILE)
    cursor = database.cursor()
    cursor.execute(
        "SELECT AVG(time), COUNT(time), "
        "CASE WHEN COUNT(time) > 1 THEN "
        "   (AVG((time * 1.0 - (SELECT AVG(time) FROM results WHERE user_id=?)) * "
        "        (time * 1.0 - (SELECT AVG(time) FROM results WHERE user_id=?)))) "
        "ELSE 0 END "
        "FROM results WHERE user_id=?", (user_id, user_id, user_id)
    )
    row = cursor.fetchone()
    database.close()

    if row and row[0] is not None:
        mean = row[0]
        count = row[1]
        variance = row[2] if row[2] else 0
        stdev = variance ** 0.5
        return {"mean": mean, "count": count, "stdev": stdev}
    else:
        return {"mean": 0, "count": 0, "stdev": 0}


def get_global_stats() -> Dict[str, float]:
    """
    Get the global mean, standard deviation, and total user count.
    """
    database = sqlite3.connect(DB_FILE)
    cursor = database.cursor()

    # Computes mean per user
    cursor.execute("SELECT AVG(time) FROM results GROUP BY user_id")
    user_means = [row[0] for row in cursor.fetchall()]
    database.close()

    total_users = len(user_means)
    if user_means:
        mean = sum(user_means) / total_users
        variance = sum((x - mean) ** 2 for x in user_means) / total_users
        stdev = variance ** 0.5
        count = len(user_means)
        return {
            "mean": mean,
            "stdev": stdev,
            "count": count,
            "total_users": total_users
        }
    else:
        return {"mean": 0, "stdev": 0, "count": 0, "total_users": total_users}
