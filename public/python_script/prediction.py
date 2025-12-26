import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# --- Configuration ---
INPUT_FILE = "single_household_weekly_data.xlsx"

def train_and_predict():
    # 1. Load the Dataset
    print("Loading data...")
    df = pd.read_excel(INPUT_FILE)
    
    # Sort by date to ensure correct order (Crucial for Time Series!)
    df = df.sort_values(by="Date")

    # --- 2. Feature Engineering (Creating inputs for the AI) ---
    # The model needs 'past context' to predict the future.
    
    # Feature A: Lag_1 -> What was the consumption last week?
    df['Last_Week_Usage'] = df['kWh_Consumption'].shift(1)
    
    # Feature B: Rolling_Avg -> What was the average usage over the last month (4 weeks)?
    df['Avg_Usage_Last_Month'] = df['kWh_Consumption'].rolling(window=4).mean()
    
    # Target: What we want to predict? -> Next Week's Consumption
    df['Target_Next_Week_kWh'] = df['kWh_Consumption'].shift(-1)

    # Drop rows with NaN values (created by shifting/rolling)
    df_clean = df.dropna().copy()

    # Define the columns we will use to make the prediction
    features = [
        'Week_Number',           # Captures seasonality (Winter vs Summer)
        'Month',                 # Captures seasonality
        'Last_Week_Usage',       # Recent behavior
        'Avg_Usage_Last_Month',  # Recent trend
        'Power_Factor',          # Electrical characteristic
        'Avg_Real_Power_kW'      # Power intensity
    ]
    
    X = df_clean[features]
    y = df_clean['Target_Next_Week_kWh']

    # --- 3. Split Data into Training and Testing ---
    # We don't shuffle because order matters in time-series.
    # We train on the first 80% of history, test on the recent 20%.
    train_size = int(len(df_clean) * 0.8)
    X_train, X_test = X.iloc[:train_size], X.iloc[train_size:]
    y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]

    print(f"Training on {len(X_train)} weeks, Testing on {len(X_test)} weeks...")

    # --- 4. Train the Model (Random Forest) ---
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # --- 5. Evaluate Performance ---
    predictions = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print("\n--- Model Performance ---")
    print(f"Mean Absolute Error (MAE): {mae:.2f} kWh")
    print(f"R2 Score (Accuracy): {r2:.2f} (1.0 is perfect)")

    # --- 6. Visualize the Result ---
    plt.figure(figsize=(12, 6))
    plt.plot(y_test.values, label='Actual Consumption', color='blue', alpha=0.7)
    plt.plot(predictions, label='AI Predicted Consumption', color='orange', linestyle='--')
    plt.title("Actual vs Predicted Electricity Usage (Test Set)")
    plt.xlabel("Weeks (Test Period)")
    plt.ylabel("kWh Consumption")
    plt.legend()
    plt.grid(True)
    plt.savefig("prediction_chart.png") # Save chart
    print("\nChart saved as 'prediction_chart.png'.")

    # --- 7. Forecast the Future ---
    # To predict the REAL next week (which is not in the dataset yet),
    # we take the very last known data point from our file.
    last_known_data = df_clean.iloc[-1][features].to_frame().T
    future_prediction = model.predict(last_known_data)[0]
    
    print("\n--- Future Forecast ---")
    print(f"Predicted usage for the upcoming week: {future_prediction:.2f} kWh")
    print(f"Estimated usage for the next month (~4 weeks): {future_prediction * 4:.2f} kWh")

if __name__ == "__main__":
    # Requires: pip install pandas numpy scikit-learn matplotlib openpyxl
    train_and_predict()