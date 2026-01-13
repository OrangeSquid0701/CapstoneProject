import requests
import pandas as pd

def extract_firebase_to_excel():
    # 1. The URL from your screenshot + the path to the node + .json for the REST API
    url = "https://p2g08-project-default-rtdb.asia-southeast1.firebasedatabase.app/energy_monitor/energy_hourly.json"

    print(f"Fetching data from: {url} ...")
    
    # 2. Get the data
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"Error: Failed to fetch data. Status Code: {response.status_code}")
        return

    data = response.json()

    if not data:
        print("No data returned. Check your database rules (read permissions) or if the path is empty.")
        return

    # 3. Process the data
    extracted_rows = []
    
    # The 'data' is a dictionary where keys are the timestamps (e.g., "2025121709")
    for key, content in data.items():
        # Ensure the content is valid and has the 'kwh' key
        if isinstance(content, dict) and 'kwh' in content:
            row = {
                'Timestamp_ID': key,  # This captures "2025121709"
                'kWh': content['kwh'] # This captures the value, e.g., 0.009
                # We intentionally ignore 'status' here
            }
            extracted_rows.append(row)

    # 4. Convert to DataFrame
    df = pd.DataFrame(extracted_rows)

    # Optional: Sort by timestamp so the Excel file is chronological
    df = df.sort_values(by='Timestamp_ID')

    # 5. Save to Excel
    output_filename = "energy_data_export.xlsx"
    df.to_excel(output_filename, index=False)
    
    print(f"Success! Extracted {len(df)} records to '{output_filename}'.")

if __name__ == "__main__":
    extract_firebase_to_excel()