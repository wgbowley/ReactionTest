from flask import Flask, render_template, request, jsonify, make_response
import uuid, sqlite3

app = Flask(__name__)
DB_FILE = "reaction.db"

def init_db():
    """Create tables if they don't exist."""
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        time INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(user_id)
    )
    """)
    conn.commit()
    conn.close()

def add_user(user_id):
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("INSERT OR IGNORE INTO users (user_id) VALUES (?)", (user_id,))
    conn.commit()
    conn.close()

def add_result(user_id, time):
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("INSERT INTO results (user_id, time) VALUES (?, ?)", (user_id, time))
    conn.commit()
    conn.close()

def get_stats(user_id):
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT AVG(time), COUNT(time), "
                "CASE WHEN COUNT(time) > 1 THEN "
                "   (AVG((time * 1.0 - (SELECT AVG(time) FROM results WHERE user_id=?)) * "
                "       (time * 1.0 - (SELECT AVG(time) FROM results WHERE user_id=?)))) "
                "ELSE 0 END "
                "FROM results WHERE user_id=?", (user_id, user_id, user_id))
    row = cur.fetchone()
    conn.close()
    if row and row[0] is not None:
        mean = row[0]
        count = row[1]
        variance = row[2] if row[2] else 0
        stdev = variance ** 0.5
        return {"mean": mean, "count": count, "stdev": stdev}
    else:
        return {"mean": 0, "count": 0, "stdev": 0}

@app.route("/")
def index():
    user_id = request.cookies.get("user_id")
    if not user_id:
        user_id = str(uuid.uuid4())
        add_user(user_id)

    resp = make_response(render_template("index.html"))
    resp.set_cookie("user_id", user_id)
    return resp

@app.route("/global_stats", methods=["GET"])
def get_global_stats():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT AVG(time), COUNT(time), "
                "CASE WHEN COUNT(time) > 1 THEN "
                "   (AVG((time * 1.0 - (SELECT AVG(time) FROM results)) * "
                "       (time * 1.0 - (SELECT AVG(time) FROM results)))) "
                "ELSE 0 END "
                "FROM results")
    row = cur.fetchone()
    conn.close()
    if row and row[0] is not None:
        mean = row[0]
        count = row[1]
        variance = row[2] if row[2] else 0
        stdev = variance ** 0.5
        return {"mean": mean, "count": count, "stdev": stdev}
    else:
        return {"mean": 0, "count": 0, "stdev": 0}

@app.route("/submit", methods=["POST"])
def submit():
    user_id = request.cookies.get("user_id")
    if not user_id:
        return jsonify({"error": "No user"}), 400

    reaction_time = request.json.get("time")
    if reaction_time is None:
        return jsonify({"error": "Invalid data"}), 400

    add_result(user_id, reaction_time)
    stats = get_stats(user_id)
    global_stats = get_global_stats()

    return jsonify({
        "mean": stats["mean"], 
        "stdev": stats["stdev"], 
        "count": stats["count"],
        "global_mean": global_stats["mean"],
        "global_stdev": global_stats["stdev"],
        "global_count": global_stats["count"]
    })

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
