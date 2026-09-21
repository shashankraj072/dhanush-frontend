import os
import pickle
import pandas as pd
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import uuid
import random

try:
    import google.generativeai as genai
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
    else:
        genai = None
except ImportError:
    genai = None

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

@app.route('/api/debug', methods=['GET'])
def debug():
    import os
    index_path = os.path.join(app.static_folder, 'index.html')
    frontend_path = os.path.join(BASE_DIR, 'frontend')
    return jsonify({
        "static_folder": app.static_folder,
        "index_exists": os.path.exists(index_path),
        "root_contents": os.listdir(BASE_DIR),
        "frontend_exists": os.path.exists(frontend_path),
        "frontend_contents": os.listdir(frontend_path) if os.path.exists(frontend_path) else []
    })

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
    
    level_key = "Basic" if predicted_level == "Beginner" else predicted_level
    
    focus = "General Fitness"
    weekly_challenge = "3 workouts/week"
    exercises = []
    
    if goal == "weight_loss":
        if level_key == "Basic":
            focus = "Cardio + full body"
            weekly_challenge = "3 workouts/week"
            exercises = [
                {"id": "fl_b_1", "name": "Walking", "sets": 3, "reps": "20 mins", "notes": "Brisk pace"},
                {"id": "fl_b_2", "name": "Squats", "sets": 3, "reps": "15", "notes": "Bodyweight"},
                {"id": "fl_b_3", "name": "Push-ups", "sets": 3, "reps": "10", "notes": "Knee push-ups if needed"},
                {"id": "fl_b_4", "name": "Cycling", "sets": 1, "reps": "15 mins", "notes": "Moderate pace"}
            ]
        elif level_key == "Intermediate":
            focus = "Strength + cardio"
            weekly_challenge = "4 workouts/week"
            exercises = [
                {"id": "fl_i_1", "name": "Lunges", "sets": 4, "reps": "12/leg", "notes": "Keep chest up"},
                {"id": "fl_i_2", "name": "Rows", "sets": 4, "reps": "15", "notes": "Use dumbbells or bands"},
                {"id": "fl_i_3", "name": "Presses", "sets": 4, "reps": "12", "notes": "Overhead press"},
                {"id": "fl_i_4", "name": "Brisk walking", "sets": 1, "reps": "30 mins", "notes": "Maintain elevated heart rate"}
            ]
        else: # Advanced
            focus = "Strength + conditioning"
            weekly_challenge = "4–5 workouts/week"
            exercises = [
                {"id": "fl_a_1", "name": "Compound exercises", "sets": 5, "reps": "10", "notes": "Heavy squats/deadlifts"},
                {"id": "fl_a_2", "name": "Intervals", "sets": 8, "reps": "30s sprint / 30s rest", "notes": "High Intensity Interval Training"}
            ]
    elif goal == "muscle_gain":
        if level_key == "Basic":
            focus = "Full-body"
            weekly_challenge = "3 workouts/week"
            exercises = [
                {"id": "mg_b_1", "name": "Squats", "sets": 3, "reps": "12", "notes": "Focus on form"},
                {"id": "mg_b_2", "name": "Push-ups", "sets": 3, "reps": "10-15", "notes": "Full range of motion"},
                {"id": "mg_b_3", "name": "Lunges", "sets": 3, "reps": "10/leg", "notes": "Controlled descent"},
                {"id": "mg_b_4", "name": "Plank", "sets": 3, "reps": "45s", "notes": "Keep core tight"}
            ]
        elif level_key == "Intermediate":
            focus = "Upper/Lower body"
            weekly_challenge = "4 workouts/week"
            exercises = [
                {"id": "mg_i_1", "name": "Bench press", "sets": 4, "reps": "8-10", "notes": "Progressive overload"},
                {"id": "mg_i_2", "name": "Rows", "sets": 4, "reps": "10", "notes": "Squeeze back muscles"},
                {"id": "mg_i_3", "name": "Shoulder press", "sets": 4, "reps": "10", "notes": "Dumbbells or barbell"},
                {"id": "mg_i_4", "name": "Leg press", "sets": 4, "reps": "12", "notes": "Don't lock knees"}
            ]
        else: # Advanced
            focus = "Hypertrophy"
            weekly_challenge = "5 workouts/week"
            exercises = [
                {"id": "mg_a_1", "name": "Compound + isolation exercises", "sets": 5, "reps": "8-12", "notes": "Mix heavy lifts with high volume isolations"}
            ]
    else:
        focus = "General Fitness"
        weekly_challenge = "3 workouts/week"
        exercises = [
            {"id": "def_1", "name": "Push-ups", "sets": 3, "reps": "10", "notes": "Modify as needed"},
            {"id": "def_2", "name": "Squats", "sets": 3, "reps": "15", "notes": "Bodyweight"},
            {"id": "def_3", "name": "Plank", "sets": 3, "reps": "60s", "notes": "Hold steady"}
        ]
        
    plan = {
        "goal": goal,
        "level": level_key,
        "focus": focus,
        "weeklyChallenge": weekly_challenge,
        "estimatedCalories": 400 if level_key == 'Advanced' else (350 if level_key == 'Intermediate' else 300),
        "workoutMinutes": 45 if level_key == 'Advanced' else (30 if level_key == 'Intermediate' else 20),
        "exercises": exercises
    }
    if goal == "muscle_gain":
        meals = {
            "rules": [
                "Eat 1.6g to 2.2g of protein per kg of body weight",
                "Maintain a slight caloric surplus",
                "Drink at least 3L of water daily"
            ],
            "meals": [
                {"name": "Breakfast", "details": "4 Scrambled eggs with spinach and whole wheat toast"},
                {"name": "Lunch", "details": "Chicken breast (200g) with quinoa and broccoli"},
                {"name": "Dinner", "details": "Steak or tofu with sweet potato and asparagus"},
                {"name": "Snack", "details": "Whey protein shake and a banana"}
            ]
        }
    elif goal == "weight_loss":
        meals = {
            "rules": [
                "Maintain a caloric deficit (300-500 kcal)",
                "Focus on high-volume, low-calorie foods",
                "Drink a glass of water before every meal"
            ],
            "meals": [
                {"name": "Breakfast", "details": "Oatmeal with berries and a scoop of protein powder"},
                {"name": "Lunch", "details": "Large mixed greens salad with grilled chicken or chickpeas"},
                {"name": "Dinner", "details": "Baked salmon with steamed vegetables"},
                {"name": "Snack", "details": "Greek yogurt or carrot sticks with hummus"}
            ]
        }
    elif goal == "endurance":
        meals = {
            "rules": [
                "Focus on complex carbohydrates for sustained energy",
                "Stay hydrated before, during, and after workouts",
                "Replenish electrolytes"
            ],
            "meals": [
                {"name": "Breakfast", "details": "Whole grain pancakes with maple syrup and fruit"},
                {"name": "Lunch", "details": "Turkey wrap with veggies and a side of pasta salad"},
                {"name": "Dinner", "details": "Lean pork or tempeh with brown rice and bell peppers"},
                {"name": "Snack", "details": "Handful of almonds and an apple"}
            ]
        }
    else:
        meals = {
            "rules": [
                "Eat a balanced diet rich in vitamins and minerals",
                "Incorporate anti-inflammatory foods (omega-3s)",
                "Drink 2L of water daily"
            ],
            "meals": [
                {"name": "Breakfast", "details": "Smoothie bowl with spinach, banana, and chia seeds"},
                {"name": "Lunch", "details": "Lentil soup with a side of whole grain bread"},
                {"name": "Dinner", "details": "Grilled fish or tofu with mixed roasted veggies"},
                {"name": "Snack", "details": "Fresh fruit and mixed nuts"}
            ]
        }
        
    return jsonify({"ok": True, "plan": plan, "meals": meals})

import time
from datetime import datetime, date

@app.route('/api/workout/log', methods=['POST'])
def log_workout():
    data = request.json
    data['createdAtMs'] = int(time.time() * 1000)
    workouts.append(data)
    return jsonify({"ok": True})

@app.route('/api/water/log', methods=['POST'])
def log_water():
    data = request.json
    userId = data.get('userId')
    ml = data.get('ml', 0)
    if userId not in profiles:
        return jsonify({"ok": False, "error": "Profile not found"}), 404
    
    profile = profiles[userId]
    if 'water_logs' not in profile:
        profile['water_logs'] = []
    
    profile['water_logs'].append({
        'ml': ml,
        'timestamp': int(time.time() * 1000)
    })
    return jsonify({"ok": True})

@app.route('/api/weight/log', methods=['POST'])
def log_weight():
    data = request.json
    userId = data.get('userId')
    weight = data.get('weight')
    if userId not in profiles:
        return jsonify({"ok": False, "error": "Profile not found"}), 404
        
    profile = profiles[userId]
    if 'weight_history' not in profile:
        profile['weight_history'] = []
        
    profile['weight_history'].append({
        'weight': weight,
        'timestamp': int(time.time() * 1000)
    })
    return jsonify({"ok": True})

@app.route('/api/progress/<user_id>', methods=['GET'])
def get_progress(user_id):
    user_workouts = [w for w in workouts if w.get('userId') == user_id]
    
    # Calculate streak
    streak = 0
    if user_workouts:
        # Sort workouts by date
        sorted_workouts = sorted(user_workouts, key=lambda x: x.get('createdAtMs', 0), reverse=True)
        workout_dates = sorted(list(set([
            datetime.fromtimestamp(w.get('createdAtMs', 0) / 1000.0).date()
            for w in sorted_workouts if w.get('createdAtMs')
        ])), reverse=True)
        
        today = date.today()
        if workout_dates:
            # Check if there's a workout today or yesterday to start counting
            if workout_dates[0] == today or (today - workout_dates[0]).days == 1:
                streak = 1
                for i in range(1, len(workout_dates)):
                    if (workout_dates[i-1] - workout_dates[i]).days == 1:
                        streak += 1
                    else:
                        break

    # Calculate today's water
    today_water_ml = 0
    weight_history = []
    
    if user_id in profiles:
        profile = profiles[user_id]
        
        # Calculate water for today
        if 'water_logs' in profile:
            today_start = datetime.combine(date.today(), datetime.min.time()).timestamp() * 1000
            today_logs = [log for log in profile['water_logs'] if log['timestamp'] >= today_start]
            today_water_ml = sum(log['ml'] for log in today_logs)
            
        # Get weight history
        if 'weight_history' in profile:
            weight_history = profile['weight_history']
        elif 'weight' in profile:
            # Add initial weight if no history
            weight_history = [{'weight': profile['weight'], 'timestamp': int(time.time() * 1000)}]

    total_calories = sum(w.get('estimatedCalories', 0) for w in user_workouts if w.get('completed'))
    completed_workouts = len([w for w in user_workouts if w.get('completed')])
    total_logs = len(user_workouts)
    
    # Posture accuracy avg
    valid_accuracies = [w.get('postureAccuracy', 0) for w in user_workouts if 'postureAccuracy' in w]
    avg_posture = sum(valid_accuracies) / len(valid_accuracies) if valid_accuracies else 0

    progress = {
        "completedWorkouts": completed_workouts,
        "totalLogs": total_logs,
        "estimatedCaloriesBurned": total_calories,
        "avgPostureAccuracy": avg_posture,
        "streak": streak,
        "todayWaterMl": today_water_ml,
        "weightHistory": weight_history,
        "recentLogs": user_workouts[-10:]
    }
    
    return jsonify({
        "ok": True, 
        "stats": progress,
        "logs": sorted(user_workouts, key=lambda x: x.get('createdAtMs', 0), reverse=True)[:50]
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    messages = data.get('messages', [])
    user_id = data.get('userId')
    
    profile = profiles.get(user_id, {})
    goal = profile.get("goal", "general fitness")
    weight = profile.get("weight", "unknown")
    level = profile.get("fitness_level", "beginner")
    
    system_prompt = (
        f"You are the AdaptFit AI Personal Trainer. Your goal is to help the user achieve their fitness goals. "
        f"The user's goal is {goal}, they weight {weight}kg, and they are a {level}. "
        f"Keep your answers concise, motivating, and strictly related to fitness, health, and diet. "
        f"Use a friendly and encouraging tone."
    )
    
    if not genai:
        # Fallback simulated response
        return jsonify({
            "ok": True,
            "reply": "Hi there! I am the AdaptFit AI Trainer. (Note: Gemini API is not configured. Set GEMINI_API_KEY in backend environment to use the real AI). How can I help you with your fitness journey today?"
        })
        
    try:
        model = genai.GenerativeModel('gemini-1.5-flash-latest', system_instruction=system_prompt)
        # Format history for Gemini strictly alternating and starting with user
        history = []
        last_role = None
        for msg in messages[:-1]:  # Exclude the last message which is the current prompt
            role = "user" if msg['role'] == "user" else "model"
            if role == "model" and not history:
                continue # Skip leading model messages
            if role == last_role:
                # Merge consecutive messages from the same role
                history[-1]["parts"][0] += "\n\n" + msg['content']
            else:
                history.append({"role": role, "parts": [msg['content']]})
                last_role = role
            
        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(messages[-1]['content'])
        
        return jsonify({
            "ok": True,
            "reply": response.text
        })
    except Exception as e:
        print(f"Chatbot error: {e}")
        return jsonify({
            "ok": False,
            "error": f"I'm having trouble connecting to my brain right now. Error: {str(e)}"
        }), 500





if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
