import pandas as pd
import numpy as np
import random
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import pickle
import os

def generate_dataset(num_rows=1000):
    goals = ['weight_loss', 'muscle_gain', 'endurance', 'flexibility']
    levels = ['Beginner', 'Intermediate', 'Advanced']
    
    data = []
    for _ in range(num_rows):
        age = random.randint(18, 65)
        weight = random.uniform(50.0, 120.0) # kg
        height = random.uniform(150.0, 200.0) # cm
        bmi = weight / ((height/100)**2)
        goal = random.choice(goals)
        
        # Determine appropriate difficulty level based on BMI and Age (simplified logic)
        if bmi > 30 or age > 50:
            level = 'Beginner'
        elif bmi < 20 and goal == 'muscle_gain':
            level = 'Beginner'
        elif 20 <= bmi <= 25 and age < 40:
            level = random.choice(['Intermediate', 'Advanced'])
        else:
            level = random.choice(levels)
            
        data.append([age, weight, height, bmi, goal, level])
        
    df = pd.DataFrame(data, columns=['Age', 'Weight', 'Height', 'BMI', 'Goal', 'Recommended_Level'])
    os.makedirs('frontend/api', exist_ok=True)
    df.to_csv('frontend/api/fitness_dataset.csv', index=False)
    print("Dataset generated at frontend/api/fitness_dataset.csv")
    return df

def train_model(df):
    # Prepare data
    X = df[['Age', 'Weight', 'Height', 'BMI', 'Goal']]
    y = df['Recommended_Level']
    
    # Encode categorical features
    le_goal = LabelEncoder()
    X['Goal'] = le_goal.fit_transform(X['Goal'])
    
    le_level = LabelEncoder()
    y_encoded = le_level.fit_transform(y)
    
    # Train Random Forest
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y_encoded)
    
    # Save model and encoders
    os.makedirs('frontend/api/ml_models', exist_ok=True)
    with open('frontend/api/ml_models/rf_model.pkl', 'wb') as f:
        pickle.dump(clf, f)
    with open('frontend/api/ml_models/le_goal.pkl', 'wb') as f:
        pickle.dump(le_goal, f)
    with open('frontend/api/ml_models/le_level.pkl', 'wb') as f:
        pickle.dump(le_level, f)
        
    print("Model and encoders trained and saved to frontend/api/ml_models/")

if __name__ == "__main__":
    import warnings
    warnings.filterwarnings('ignore') # ignore SettingWithCopyWarning for simplicity
    df = generate_dataset(2000)
    train_model(df)
