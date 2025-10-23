"""
File: routes.py
Author: William Bowley
Version: 0.1
Date: 2024 - 09 - 04

Description:
    Manages routes and connects the modules,
    template and static scripts together.
"""


import uuid
from flask import Blueprint, render_template, request, jsonify, make_response
from modules import database, stats_utils


bp = Blueprint('routes', __name__)


@bp.route("/")
def index():
    """
    Renders the template "index.html" and gives
    the user their cookie
    """
    user_id = request.cookies.get("user_id")
    if not user_id:
        user_id = str(uuid.uuid4())
        database.add_user(user_id)

    resp = make_response(render_template("index.html"))
    resp.set_cookie("user_id", user_id)
    return resp


@bp.route("/global_stats", methods=["GET"])
def get_global_stats():
    """
    Gets the global mean, standard deviation and total user
    count and returns it to the frontend
    """
    global_stats = database.get_global_stats()
    return jsonify(global_stats)


@bp.route("/submit", methods=["POST"])
def submit():
    """
    Gets global stats and user stats data and
    returns it to the frontend
    """
    user_id = request.cookies.get("user_id")
    if not user_id:
        return jsonify({"error": "No user"}), 400

    reaction_time = request.json.get("time")
    if reaction_time is None:
        return jsonify({"error": "Invalid data"}), 400

    database.add_result(user_id, reaction_time)
    user_stats = database.get_stats(user_id)

    # Get user-level means for all users to calculate global stats
    global_stats = database.get_global_stats()
    global_mean = global_stats["mean"]
    global_stdev = global_stats["stdev"]
    total_users = global_stats["total_users"]

    percentile = stats_utils.calculate_percentile(
        user_stats["mean"],
        global_mean,
        global_stdev
    )

    return jsonify({
        "mean": user_stats["mean"],
        "stdev": user_stats["stdev"],
        "count": user_stats["count"],
        "global_mean": global_mean,
        "global_stdev": global_stdev,
        "total_users": total_users,
        "percentile": percentile
    })
