import os
import pickle
import pandas as pd
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import uuid
import random

# Load ML Models
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'ml_models')
rf_model, le_goal, le_level = None, None, None

try:
    with open(os.path.join(MODEL_DIR, 'rf_model.pkl'), 'rb') as f:
        rf_model = pickle.load(f)
    with open(os.path.join(MODEL_DIR, 'le_goal.pkl'), 'rb') as f:
        le_goal = pickle.load(f)
    with open(os.path.join(MODEL_DIR, 'le_level.pkl'), 'rb') as f:
        le_level = pickle.load(f)
except Exception as e:
    print(f"Warning: Could not load ML models: {e}")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(BASE_DIR, 'frontend', 'dist')

# Configure Flask to serve React build folder
app = Flask(__name__, static_folder=static_dir, static_url_path='/')
CORS(app)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # If the user is requesting an API route that doesn't exist, return 404 JSON
    if path.startswith('api/'):
        return jsonify({"error": f"API endpoint not found: /{path}", "ok": False}), 404
    
    # If the file exists in the React build folder (like .js or .css), serve it
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    
    # Otherwise, return the React index.html (Client-side routing)
    return send_from_directory(app.static_folder, 'index.html')

profiles = {}
workouts = []



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
    profile = profiles.get(user_id, {})
    goal = profile.get("goal", "weight_loss")
    
    predicted_level = "Beginner"
    try:
        # Simple defaults if profile is incomplete
        age = float(profile.get("age", 30))
        weight = float(profile.get("weight", 70))
        height = float(profile.get("height", 170))
        bmi = weight / ((height/100)**2)
        
        if rf_model and le_goal and le_level:
            # Prepare input data for ML model
            goal_encoded = le_goal.transform([goal])[0]
            input_df = pd.DataFrame([[age, weight, height, bmi, goal_encoded]], 
                                    columns=['Age', 'Weight', 'Height', 'BMI', 'Goal'])
            pred_encoded = rf_model.predict(input_df)[0]
            predicted_level = le_level.inverse_transform([pred_encoded])[0]
    except Exception as e:
        print(f"ML Prediction Error: {e}")
        pass # fallback to Beginner
    
    plan = {
        "goal": goal,
        "level": predicted_level,
        "estimatedCalories": 400 if predicted_level == 'Advanced' else (350 if predicted_level == 'Intermediate' else 300),
        "workoutMinutes": 45 if predicted_level == 'Advanced' else (30 if predicted_level == 'Intermediate' else 20),
        "exercises": [
            {"id": "ex1", "name": "Push-ups", "sets": 4 if predicted_level == 'Advanced' else 3, "reps": "15-20" if predicted_level == 'Advanced' else "10-15", "notes": "Keep back straight"},
            {"id": "ex2", "name": "Squats", "sets": 4 if predicted_level == 'Advanced' else 3, "reps": "20-25" if predicted_level == 'Advanced' else "15-20", "notes": "Go low"},
            {"id": "ex3", "name": "Plank", "sets": 3, "reps": "90s" if predicted_level == 'Advanced' else "60s", "notes": "Hold steady"}
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





if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
