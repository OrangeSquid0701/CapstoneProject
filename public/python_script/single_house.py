import pandas as pd
import numpy as np

# --- Configuration ---
START_DATE = "2020-01-01"
END_DATE = "2025-01-01"
OUTPUT_FILENAME = "single_household_weekly_data.xlsx"

def generate_weekly_data():
    # 1. Create a date range with weekly frequency ('W' means Weekly)
    weeks = pd.date_range(start=START_DATE, end=END_DATE, freq='W-MON')
    
    data = []
    
    # Base weekly load (approx 70-100 kWh per week is typical for a medium house)
    base_load_weekly = 85 
    
    print(f"Generating weekly data from {START_DATE} to {END_DATE}...")

    for date in weeks:
        # Get the week number (1-52) to simulate seasons
        week_num = date.isocalendar().week
        
        # --- 1. Simulate Seasonality ---
        # Using sine wave based on week number. 
        # Peaks in mid-year (Summer) and year-end (Winter) depending on region.
        # This formula creates a double peak (Winter + Summer).
        seasonal_effect = np.sin((week_num / 52) * 2 * np.pi) 
        
        # --- 2. Add Randomness (Noise) ---
        # Random fluctuations (e.g., guests over, holiday usage)
        noise = np.random.normal(0, 10) # Standard deviation of 10 kWh
        
        # --- 3. Calculate kWh ---
        # Base + (Base * 0.3 * Seasonality) + Noise
        kwh_consumption = base_load_weekly + (base_load_weekly * 0.35 * seasonal_effect) + noise
        
        # Constraint: Consumption cannot be negative. Minimum set to 30 kWh/week.
        kwh_consumption = max(30, kwh_consumption)

        # --- 4. Simulate Power Factor ---
        # Randomly varies between 0.85 and 0.98
        power_factor = np.random.uniform(0.85, 0.98)

        # --- 5. Calculate Real Power (kW) ---
        # Formula: Average Power (kW) = Energy (kWh) / Time (Hours)
        # A week has exactly 168 hours (24 * 7)
        hours_in_week = 168
        avg_real_power_kw = kwh_consumption / hours_in_week

        # Construct the data row
        row = {
            "Date": date.strftime("%Y-%m-%d"),
            "Week_Number": week_num,
            "Month": date.month,
            "Year": date.year,
            "kWh_Consumption": round(kwh_consumption, 2),
            "Avg_Real_Power_kW": round(avg_real_power_kw, 4),
            "Power_Factor": round(power_factor, 3)
        }
        data.append(row)

    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Save to Excel
    df.to_excel(OUTPUT_FILENAME, index=False)
    print(f"Success! Generated {len(df)} weeks of data in '{OUTPUT_FILENAME}'.")

if __name__ == "__main__":
    generate_weekly_data()