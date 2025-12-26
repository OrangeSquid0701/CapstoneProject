import pandas as pd
import numpy as np
import random
import calendar

# --- Configuration ---
NUM_HOUSEHOLDS = 50      # Number of unique people/houses to simulate
START_YEAR = 2021
YEARS_TO_SIMULATE = 3    # Total duration
OUTPUT_FILENAME = "household_energy_dataset.xlsx"

def generate_dataset():
    data = []
    
    print(f"Generating data for {NUM_HOUSEHOLDS} households over {YEARS_TO_SIMULATE} years...")

    for house_id in range(1, NUM_HOUSEHOLDS + 1):
        # Assign a 'base' usage profile for this household (some use more, some less)
        # Base usage between 200 and 500 kWh/month
        base_load = np.random.uniform(200, 500) 
        
        # Assign a volatility factor (how much their usage changes)
        volatility = np.random.uniform(0.05, 0.2)

        for year in range(START_YEAR, START_YEAR + YEARS_TO_SIMULATE):
            for month in range(1, 13):
                
                # 1. Simulate kWh Consumption with Seasonality
                # Using a sine wave to simulate higher usage in Summer (months 6-8) and Winter (months 12-2)
                # This assumes a 4-season climate.
                seasonal_effect = np.sin((month - 1) * (2 * np.pi / 12)) 
                
                # Add random noise (human behavior)
                noise = np.random.normal(0, base_load * volatility)
                
                # Calculate final kWh (Base + Seasonality + Noise)
                # We boost the seasonal effect to make it noticeable (e.g., +/- 30% swing)
                kwh = base_load + (base_load * 0.3 * seasonal_effect) + noise
                kwh = max(50, kwh) # Ensure usage never drops below 50 kWh
                
                # 2. Simulate Power Factor (PF)
                # Residential PF is typically between 0.85 and 0.99
                pf = np.random.normal(0.92, 0.03) 
                pf = min(1.0, max(0.8, pf)) # Clip between 0.8 and 1.0

                # 3. Calculate Average Real Power (kW)
                # Formula: Power (kW) = Energy (kWh) / Time (Hours)
                # We assume 30 days * 24 hours = 720 hours per month for simplicity
                hours_in_month = 24 * calendar.monthrange(year, month)[1]
                avg_real_power_kw = kwh / hours_in_month

                # Optional: Simulate Peak Power (often useful for training)
                # Peak is usually 2x to 5x the average
                peak_power_kw = avg_real_power_kw * np.random.uniform(1.5, 4.0)

                # Append to list
                row = {
                    "Household_ID": f"H{house_id:03d}",
                    "Year": year,
                    "Month": month,
                    "Date": f"{year}-{month:02d}-01",
                    "kWh_Consumption": round(kwh, 2),
                    "Avg_Real_Power_kW": round(avg_real_power_kw, 4),
                    "Peak_Real_Power_kW": round(peak_power_kw, 4),
                    "Power_Factor": round(pf, 3)
                }
                data.append(row)

    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Save to Excel
    df.to_excel(OUTPUT_FILENAME, index=False)
    print(f"Success! Dataset saved as '{OUTPUT_FILENAME}' with {len(df)} rows.")

if __name__ == "__main__":
    # Ensure dependencies are installed:
    # pip install pandas openpyxl numpy
    generate_dataset()