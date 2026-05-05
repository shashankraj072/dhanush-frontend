from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import random

app = Flask(__name__)
CORS(app)

profiles = {}
workouts = []

@app.route('/', methods=['GET'])
def index():
    return "Backend is running perfectly! Please open the frontend at http://localhost:5173"

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"ok": True, "message": "Backend running"})

@app.route('/api/profile', methods=['POST'])
def save_profile():
    data = request.json
    userId = data.get('userId')
    if not userId:
        userId = str(uuid.uuid4())
        data['userId'] = userId
    profiles[userId] = data
    return jsonify({"ok": True, "profile": data})

@app.route('/api/recommendations/<user_id>', methods=['GET'])
def get_recommendations(user_id):
    profile = profiles.get(user_id, {"goal": "weight_loss"})
    
    plan = {
        "goal": profile.get("goal", "weight_loss"),
        "level": "Beginner",
        "estimatedCalories": 300,
        "workoutMinutes": 20,
        "exercises": [
            {"id": "ex1", "name": "Push-ups", "sets": 3, "reps": "10-15", "notes": "Keep back straight"},
            {"id": "ex2", "name": "Squats", "sets": 3, "reps": "15-20", "notes": "Go low"},
            {"id": "ex3", "name": "Plank", "sets": 3, "reps": "60s", "notes": "Hold steady"}
        ]
    }
    meals = {
        "rules": [
            "Eat protein with every meal",
            "Drink 2L of water",
            "Avoid processed sugar"
        ],
        "meals": [
            {"name": "Breakfast", "details": "Oatmeal with berries"},
            {"name": "Lunch", "details": "Grilled Chicken Salad"},
            {"name": "Dinner", "details": "Salmon with asparagus"},
            {"name": "Snack", "details": "Protein Shake"}
        ]
    }
    return jsonify({"ok": True, "plan": plan, "meals": meals})

@app.route('/api/workout/log', methods=['POST'])
def log_workout():
    data = request.json
    workouts.append(data)
    return jsonify({"ok": True})

@app.route('/api/progress/<user_id>', methods=['GET'])
def get_progress(user_id):
    user_workouts = [w for w in workouts if w.get('userId') == user_id]
    progress = {
        "completedWorkouts": len(user_workouts),
        "estimatedCalories": len(user_workouts) * 250,
        "recentLogs": user_workouts[-5:]
    }
    return jsonify({"ok": True, "progress": progress})

@app.route('/api/pose/analyze', methods=['POST'])
def analyze_pose():
    # Mock pose analysis
    return jsonify({
        "ok": True,
        "results": {
            "posture_accuracy": f"{random.randint(80, 100)}%",
            "feedback": "Keep your back straight.",
            "rep_counted": True
        }
    })

@app.route('/api/pose/status', methods=['GET'])
def pose_status():
    return jsonify({"ok": True, "pose_enabled": True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
