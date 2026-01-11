// ------------------------------------------------------------------
// 1. IMPORTS (Firebase v9 Modular SDK)
// ------------------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

import { TARIFF_CONFIG } from './tariff_config.js';

// ------------------------------------------------------------------
// GLOBAL STATE (Add this section)
// ------------------------------------------------------------------
let currentTariffType = 'standard'; // Default selection
let lastKnownEnergyKWh = 0;         // Stores the latest energy reading

// ------------------------------------------------------------------
// 2. CONFIGURATION
// ------------------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyBAspbWVP7wjU_abImLK2e4PAWjI4oacRA",
    authDomain: "p2g08-project.firebaseapp.com",
    databaseURL: "https://p2g08-project-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "p2g08-project",
    storageBucket: "p2g08-project.firebasestorage.app",
    messagingSenderId: "244691428453",
    appId: "1:244691428453:web:6134848f596e99988f528c",
    measurementId: "G-KQP25TE1CV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// 3. AUTHENTICATION & ADMIN REDIRECT LOGIC
// ------------------------------------------------------------------

// 🔴 ADD ALL ADMIN UIDs HERE 
const ADMIN_IDS = [
    "cKxoDng5UGZYiRkwhF3bDwIRsvx1",  // amirul
    "3FPmlAPG0Hg0Nsj61jA2Fea6qVG2",  // jienseng
    "N7fqhvo9KcMxuSOmEpny5cXvaCm1",  // izatt
    "xSyybwIUaFavCpl2jiX6sVyEoq43"   // dr. faizal
]; 

// Listen for login state changes (Google OR Guest)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User Logged In:", user.uid);
        console.log("Is Guest?", user.isAnonymous); // Debug check

        // Update UI Name
        if(document.getElementById("username")) {
            if (user.isAnonymous) {
                 document.getElementById("username").textContent = "Guest (Demo)";
            } else {
                 document.getElementById("username").textContent = user.displayName || "User";
            }
        }

        // --- THE REDIRECT LOGIC ---
        let pathToCheck;

        // 1. Check if user is in Admin List OR is a Guest (Anonymous)
        // ✅ ADDED: "|| user.isAnonymous"
        if (ADMIN_IDS.includes(user.uid) || user.isAnonymous) {
            
            if (user.isAnonymous) {
                console.log("🕵️ Guest detected! Giving access to Admin path...");
            } else {
                console.log("👑 Admin Recognized! Redirecting to 'users/admin' path...");
            }
            
            // Force code to look at the "admin" folder
            pathToCheck = 'users/admin/device_id'; 
        } 
        else {
            // 2. Normal User: Look at their own folder
            console.log("👤 Normal User detected.");
            pathToCheck = `users/${user.uid}/device_id`;
        }

        // --- FETCH THE POINTER ---
        const pointerRef = ref(database, pathToCheck);
        
        onValue(pointerRef, (snapshot) => {
            const deviceId = snapshot.val();
            
            if (deviceId) {
                console.log(`✅ Connection Established to Device: ${deviceId}`);
                
                // Start the charts and data listeners
                startRealtimeDataListener(deviceId);
                startHourlyChartListener(deviceId);
                startWeeklyChartListener(deviceId);
                startMonthlyChartListener(deviceId);
            } else {
                console.warn("⚠️ Access Denied: No device linked to this account path.");
                // Optional: Alert the user if the DB path is empty
                if(user.isAnonymous) alert("Demo data path is empty!");
            }
        });

    } else {
        // Only redirect to login if we are NOT already on the login page
        // (Prevents infinite loops if this script runs on index.html)
        if (!window.location.pathname.endsWith('index.html') && 
            !window.location.pathname.endsWith('/')) {
            console.log("No user logged in. Redirecting...");
            window.location.href = "index.html"; 
        }
    }
});

// ------------------------------------------------------------------
// LOGOUT LOGIC (Fixed to wait for page load)
// ------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // 1. Select buttons by Class (.logoutBtn) OR ID (#logoutBtn)
    const logoutButtons = document.querySelectorAll(".logoutBtn, #logoutBtn");

    if (logoutButtons.length === 0) {
        console.warn("⚠️ Debug: No logout buttons found. Check if your HTML button has class='logoutBtn'");
    }

    // 2. Attach Click Event
    logoutButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault(); // Stop any default link behavior
            console.log("Logout clicked..."); // Debug log

            signOut(auth).then(() => {
                console.log("✅ User logged out.");
                window.location.href = "index.html";
            }).catch((error) => {
                console.error("❌ Logout failed:", error);
                alert("Logout Error: " + error.message);
            });
        });
    });
});

// ------------------------------------------------------------------
// 4. UTILITY: BILL CALCULATION LOGIC (Domestik Am & ToU)
// ------------------------------------------------------------------
function calculateTNBEstimator(usage, tariffType = 'standard') {
    if (!usage || usage < 0) return 0.00;

    let totalCost = 0;
    
    // 1. Fixed Retail Charge (Caj Peruncitan) - Same for both
    totalCost += 10.00; 

    // ---------------------------------------------------------
    // OPTION A: STANDARD TARIFF (Default)
    // ---------------------------------------------------------
    if (tariffType === 'standard') {
        let ratePerKWh = 0;

        if (usage <= 1500) {
            // Low Tier: 27.03 + 4.55 + 12.85 = 44.43 sen
            ratePerKWh = 0.4443;
        } else {
            // High Tier: 37.03 + 4.55 + 12.85 = 54.43 sen
            ratePerKWh = 0.5443;
        }

        totalCost += (usage * ratePerKWh);
    }

    // ---------------------------------------------------------
    // OPTION B: TIME OF USE (ToU) TARIFF
    // ---------------------------------------------------------
    else if (tariffType === 'alternative') {
        // NOTE: Real ToU requires specific Peak/Off-Peak readings.
        // Since we only have total 'usage', we ESTIMATE using a split.
        // Standard assumption: 70% usage during Peak, 30% during Off-Peak.
        
        const peakUsage = usage * 0.70;
        const offPeakUsage = usage * 0.30;

        // --- RATES (Derived from your config) ---
        // Peak (Low): 28.52 + 4.55 + 12.85 = 45.92 sen
        // Off-Peak (Low): 24.43 + 4.55 + 12.85 = 41.83 sen
        // Peak (High): 38.52 + 4.55 + 12.85 = 55.92 sen
        // Off-Peak (High): 34.43 + 4.55 + 12.85 = 51.83 sen

        let peakRate, offPeakRate;

        if (usage <= 1500) {
            peakRate = 0.4592;
            offPeakRate = 0.4183;
        } else {
            peakRate = 0.5592;
            offPeakRate = 0.5183;
        }

        totalCost += (peakUsage * peakRate) + (offPeakUsage * offPeakRate);
    }

    // 3. SST (6%)
    totalCost += (totalCost * 0.06);

    return totalCost;
}
// calculateTNBEstimator(100) Using Standard Tariff
// calculateTNBEstimator(100, 'alternative') Using ToU Tariff

// ------------------------------------------------------------------
// 5. REALTIME DATA LISTENER (Corrected & Restored)
// ------------------------------------------------------------------
function startRealtimeDataListener(deviceId) {
    // Reference to the live data node
    const energyRef = ref(database, `${deviceId}/live`);

    onValue(energyRef, (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // 1. Extract Raw Values (with safety defaults)
            const voltage   = parseFloat(data.voltage_V) || 0;
            const current   = parseFloat(data.current_A) || 0;
            const powerW    = parseFloat(data.power_W) || 0;
            const energyKWh = parseFloat(data.energy_kWh) || 0; 
            const frequency = parseFloat(data.frequency_Hz) || 0;
            const pf        = parseFloat(data.power_factor) || 0;

            // 🔴 GLOBAL STATE UPDATE (For the Tariff Button)
            lastKnownEnergyKWh = energyKWh; 

            // 2. Electrical Calculations
            const realPowerKW = powerW / 1000;
            const apparentPowerKVA = ((voltage * current) / 1000);
            
            // Reactive Power Calculation
            const term = Math.pow(apparentPowerKVA, 2) - Math.pow(realPowerKW, 2);
            const reactivePowerKVAR = Math.sqrt(Math.max(0, term));

            // 3. Bill Calculation (Dynamic based on selected button)
            // Uses the global 'currentTariffType' variable we added earlier
            const liveBill = calculateTNBEstimator(energyKWh, currentTariffType);

            // 4. Update "Power Analysis" & "Dashboard" (Bottom Section)
            updateDashboard(realPowerKW.toFixed(3), reactivePowerKVAR.toFixed(3), pf.toFixed(2), apparentPowerKVA);
            
            // Update Bill Display
            if(document.getElementById("currentBill")) {
                document.getElementById("currentBill").innerText = `RM ${liveBill.toFixed(2)}`;
            }

            // ---------------------------------------------------------
            // 5. UPDATE SIMPLE CARDS (The Missing Part Restored)
            // ---------------------------------------------------------
            // These lines update the top row cards. If they are missing, those values show 0.
            
            if(document.getElementById("val-voltage")) document.getElementById("val-voltage").innerText = voltage.toFixed(1);
            if(document.getElementById("val-current")) document.getElementById("val-current").innerText = current.toFixed(3);
            
            // Real Power (W) Card
            if(document.getElementById("val-power")) document.getElementById("val-power").innerText = powerW.toFixed(1);
            
            // Energy Used (kWh) Card
            if(document.getElementById("val-energy")) document.getElementById("val-energy").innerText = energyKWh.toFixed(3);
            
            // Frequency Card
            if(document.getElementById("val-freq")) document.getElementById("val-freq").innerText = frequency.toFixed(1);
            
            // Power Factor Card
            if(document.getElementById("val-pf")) document.getElementById("val-pf").innerText = pf.toFixed(2);
            
            // Last Update Time
            if(document.getElementById("last-update")) {
                document.getElementById("last-update").innerText = new Date().toLocaleTimeString();
            }

        } else {
             console.log("⚠️ Path exists, but no data found at:", `${deviceId}/live`);
        }
    });
}

// ------------------------------------------------------------------
// 6. DASHBOARD & UTILS
// ------------------------------------------------------------------

// Reading Form Handling
const readingForm = document.getElementById('readingForm');
if(readingForm) {
    if(document.getElementById('readingDate')) {
        document.getElementById('readingDate').valueAsDate = new Date();
    }

    readingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        showNotification('Reading added (Simulation Only)', 'success');
    });
}

function updateDashboard(realPower, reactivePower, powerFactor, apparentPower) {
    const apparentVal = Number(apparentPower);

    // Text Updates
    if(document.getElementById('realPower')) document.getElementById('realPower').textContent = realPower;
    if(document.getElementById('realPowerDetail')) document.getElementById('realPowerDetail').textContent = realPower;
    if(document.getElementById('reactivePower')) document.getElementById('reactivePower').textContent = reactivePower;
    if(document.getElementById('apparentPower')) document.getElementById('apparentPower').textContent = apparentVal.toFixed(1);
    if(document.getElementById('powerFactor')) document.getElementById('powerFactor').textContent = powerFactor;

    // PF Ring Chart Logic
    const pfPercent = Math.min(100, Math.max(0, Math.round(powerFactor * 100))); 
    const circularProgress = document.querySelector('.rounded-full');
    const percentText = document.querySelector('.rounded-full span');
    
    if(percentText) percentText.textContent = pfPercent + '%';

    // Update Status Text
    let pfStatus = 'Poor - Needs attention';
    if (powerFactor >= 0.9) pfStatus = 'Excellent - Very efficient';
    else if (powerFactor >= 0.8) pfStatus = 'Good - Above threshold';
    else if (powerFactor >= 0.7) pfStatus = 'Fair - Consider improvement';
    
    if(document.getElementById('pfStatus')) document.getElementById('pfStatus').textContent = pfStatus;

    // Conic Gradient Update
    if(circularProgress) {
        const degrees = pfPercent * 3.6;
        circularProgress.style.background = `conic-gradient(#0E0091 0deg ${degrees}deg, #e5e7eb ${degrees}deg 360deg)`;
    }
}

// ------------------------------------------------------------------
// WEEKLY ENERGY USAGE CHART (Dynamic & Authenticated)
// ------------------------------------------------------------------
function startWeeklyChartListener(deviceId) {
    // Reference to the weekly data node
    const dbRef = ref(database, `${deviceId}/energy_weekly`);

    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // 1. Define your database keys for the days
            // (Make sure these match your DB spelling: Tues, Weds, etc.)
            const dayKeys = ['Mon', 'Tues', 'Weds', 'Thurs', 'Fri', 'Sat', 'Sun'];
            
            // 2. Arrays to hold our sorted data
            const actualValues = [];
            const predictedValues = [];

            // 3. Loop through days and extract both values
            dayKeys.forEach(day => {
                // Get Actual (e.g., data['Mon'])
                actualValues.push(data[day] ? parseFloat(data[day]) : 0);

                // Get Predicted (e.g., data['Mon_predicted'])
                const predKey = `${day}_predicted`;
                predictedValues.push(data[predKey] ? parseFloat(data[predKey]) : 0);
            });

            console.log("📊 Loaded Weekly Data:", actualValues, predictedValues);

            // 4. Update the Chart.js Instance
            if (window.myUsageChart) {
                // Dataset [0] is Actual Consumption (Blue/Purple area)
                window.myUsageChart.data.datasets[0].data = actualValues;
                
                // Dataset [1] is AI Prediction (Orange dashed line)
                window.myUsageChart.data.datasets[1].data = predictedValues;
                
                // Update the "Total Actual" text display
                const total = actualValues.reduce((a, b) => a + b, 0);
                const totalEl = document.getElementById('total-display');
                if(totalEl) totalEl.innerText = total.toFixed(1) + ' kWh';

                // Refresh the visual chart
                window.myUsageChart.update();
            }
        }
    });
}

// ------------------------------------------------------------------
// MONTHLY CHART LISTENER (Chart + Trend + Cost Breakdown)
// ------------------------------------------------------------------
function startMonthlyChartListener(deviceId) {
    const dbRef = ref(database, `${deviceId}/monthly_usage`);

    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // 1. Sort Data Chronologically
            const monthMap = { 'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12 };
            
            const sortedData = Object.keys(data).map(key => {
                return { label: key, value: parseFloat(data[key]) };
            }).sort((a, b) => monthMap[a.label] - monthMap[b.label]);

            // ------------------------------------------------------
            // PART A: UPDATE BAR CHART
            // ------------------------------------------------------
            if (window.myMonthlyChart) {
                const labels = sortedData.map(item => item.label);
                const values = sortedData.map(item => item.value);

                window.myMonthlyChart.data.labels = labels;
                window.myMonthlyChart.data.datasets[0].data = values;
                
                // Highlight the last bar with Dark Indigo
                const colors = values.map((_, index) => index === values.length - 1 ? '#1500d1ff' : '#005cd4ff');
                window.myMonthlyChart.data.datasets[0].backgroundColor = colors;
                window.myMonthlyChart.update();
                
                // Update "Average" Text on Chart Card
                const totalArr = values.reduce((a, b) => a + b, 0);
                const avg = values.length ? Math.round(totalArr / values.length) : 0;
                if(document.getElementById('averageUsage')) document.getElementById('averageUsage').innerText = `${avg.toLocaleString()} kWh/month`;
            }

            // ------------------------------------------------------
            // PART B: UPDATE TREND WIDGET
            // ------------------------------------------------------
            // Get Current (Last Month) and Previous (2nd to Last)
            const len = sortedData.length;
            const currentItem = len > 0 ? sortedData[len - 1] : { value: 0 };
            const prevItem    = len > 1 ? sortedData[len - 2] : { value: 0 };
            const currentVal  = currentItem.value; // e.g., 1356
            const prevVal     = prevItem.value;    // e.g., 1247

            // Update Main Text (Using the fixed ID)
            const valMonthlyEl = document.getElementById('val-monthly-total');
            if (valMonthlyEl) valMonthlyEl.innerText = currentVal.toLocaleString();

            const benchmarkEl = document.getElementById('trend-benchmark');
            if (benchmarkEl) benchmarkEl.innerText = prevVal.toLocaleString();

            // Calculate Percentage
            let percentChange = 0;
            if (prevVal > 0) percentChange = ((currentVal - prevVal) / prevVal) * 100;
            else if (currentVal > 0) percentChange = 100;

            // Update Pill & Arrow
            const arrowEl = document.getElementById('trend-arrow');
            const percentEl = document.getElementById('trend-percent');
            const pillEl = document.getElementById('trend-pill');
            const gaugeEl = document.getElementById('conciseTrendGauge');

            if (arrowEl && percentEl && pillEl) {
                percentEl.innerText = Math.abs(percentChange).toFixed(1) + '%';
                
                if (percentChange > 0) {
                    // INCREASE (Red)
                    arrowEl.innerText = '▲'; 
                    pillEl.className = "mt-0.5 px-2 py-0.5 rounded-full bg-red-100 flex items-center gap-1";
                    arrowEl.className = "text-xs font-bold text-red-500"; 
                    percentEl.className = "text-xs font-bold text-red-600";
                } else if (percentChange < 0) {
                    // DECREASE (Green)
                    arrowEl.innerText = '▼'; 
                    pillEl.className = "mt-0.5 px-2 py-0.5 rounded-full bg-green-100 flex items-center gap-1";
                    arrowEl.className = "text-xs font-bold text-green-500"; 
                    percentEl.className = "text-xs font-bold text-green-600";
                } else {
                    // NEUTRAL
                    arrowEl.innerText = '-'; 
                    pillEl.className = "mt-0.5 px-2 py-0.5 rounded-full bg-gray-100 flex items-center gap-1";
                    arrowEl.className = "text-xs font-bold text-gray-400"; 
                    percentEl.className = "text-xs font-bold text-gray-500";
                }
            }

            // Update Circular Gauge (Dark Indigo)
            if (gaugeEl) {
                let degrees = (currentVal / 2000) * 360; 
                if (degrees > 360) degrees = 360;
                // Using #0E0091 to match Power Factor widget
                gaugeEl.style.background = `conic-gradient(#0E0091 0deg ${degrees}deg, #f3f4f6 ${degrees}deg 360deg)`;
            }

            // ------------------------------------------------------
            // PART C: MONTHLY COST BREAKDOWN
            // ------------------------------------------------------
            // Calculate Bill based on Current Month Usage
            let energyRate = (currentVal <= 1500) ? 0.4443 : 0.5443; // Simplified Tier Logic
            
            const costEnergy   = currentVal * energyRate; 
            const costService  = 10.00;                   
            const costSubtotal = costEnergy + costService;
            const costSST      = costSubtotal * 0.06;     
            const costTotal    = costSubtotal + costSST;

            // Update Text Elements
            const elCostEnergy  = document.getElementById('cost-energy');
            const elCostService = document.getElementById('cost-service');
            const elCostSST     = document.getElementById('cost-sst');
            const elCostTotal   = document.getElementById('cost-total');

            if(elCostEnergy)  elCostEnergy.innerText  = `RM ${costEnergy.toFixed(2)}`;
            if(elCostService) elCostService.innerText = `RM ${costService.toFixed(2)}`;
            if(elCostSST)     elCostSST.innerText     = `RM ${costSST.toFixed(2)}`;
            if(elCostTotal)   elCostTotal.innerText   = `RM ${costTotal.toFixed(2)}`;

            // Update Progress Bars (Width based on % of Total Bill)
            const elBarEnergy  = document.getElementById('bar-energy');
            const elBarService = document.getElementById('bar-service');
            const elBarSST     = document.getElementById('bar-sst');

            if(costTotal > 0) {
                const pctEnergy  = (costEnergy / costTotal) * 100;
                const pctService = (costService / costTotal) * 100;
                const pctSST     = (costSST / costTotal) * 100;

                if(elBarEnergy)  elBarEnergy.style.width  = `${pctEnergy}%`;
                if(elBarService) elBarService.style.width = `${pctService}%`;
                if(elBarSST)     elBarSST.style.width     = `${pctSST}%`;
            }
        }
    });
}

// ------------------------------------------------------------------
// MANUAL BILL CALCULATOR (Retail RM10 + Always 6% SST)
// ------------------------------------------------------------------
window.calculateBill = function() {
    const usageInput = document.getElementById('calculatorUsage');
    if(!usageInput) return;

    const usage = parseFloat(usageInput.value);
    if (!usage || usage < 0) {
        if(typeof showNotification === 'function') {
            showNotification('Please enter valid usage', 'error');
        } else {
            alert('Please enter valid usage');
        }
        return;
    }

    let totalCost = 0;
    let breakdown = []; 

    // --- CONSTANTS ---
    const RATE_CAPACITY = 0.0455; // 4.55 sen
    const RATE_NETWORK  = 0.1285; // 12.85 sen
    
    // 1. Retail Charge (Caj Peruncitan)
    // Rule: FIXED at RM 10.00
    const retailCharge = 10.00;
    totalCost += retailCharge;
    
    breakdown.push(`Caj Peruncitan: RM ${retailCharge.toFixed(2)}`);

    // 2. Energy Charge Calculation
    let costEnergy = 0;
    
    if (currentTariffType === 'alternative') {
        // --- TYPE B: ToU TARIFF ---
        breakdown.push(`<span class="text-blue-600 font-bold mt-2 block">Tariff: Time of Use (ToU)</span>`);
        breakdown.push(`<span class="text-xs text-gray-500 italic mb-2 block">Est. Split: 70% Peak / 30% Off-Peak</span>`);
        
        const peakUsage = usage * 0.70;
        const offPeakUsage = usage * 0.30;

        const calcToU = (units, rLow, rHigh) => {
            if (usage <= 1500) return units * rLow;
            const ratio = units / usage;
            return ((1500 * ratio) * rLow) + ((usage - 1500) * ratio * rHigh);
        };

        const valPeak = calcToU(peakUsage, 0.2852, 0.3852);
        const valOff  = calcToU(offPeakUsage, 0.2443, 0.3443);
        costEnergy = valPeak + valOff;

        breakdown.push(`Energy (Peak): RM ${valPeak.toFixed(2)}`);
        breakdown.push(`Energy (Off-Peak): RM ${valOff.toFixed(2)}`);

    } else {
        // --- TYPE A: STANDARD TARIFF ---
        breakdown.push(`<span class="text-blue-600 font-bold mt-2 block">Tariff: Standard (Domestik Am)</span>`);
        
        const RATE_E_LOW = 0.2703;  // Tier 1
        const RATE_E_HIGH = 0.3703; // Tier 2

        if (usage <= 1500) {
            costEnergy = usage * RATE_E_LOW;
            breakdown.push(`Energy Charge (Tier 1): RM ${costEnergy.toFixed(2)}`);
        } else {
            const c1 = 1500 * RATE_E_LOW;
            const c2 = (usage - 1500) * RATE_E_HIGH;
            costEnergy = c1 + c2;
            
            breakdown.push(`Energy Tier 1 (First 1,500): RM ${c1.toFixed(2)}`);
            breakdown.push(`Energy Tier 2 (Next ${(usage - 1500).toFixed(0)}): RM ${c2.toFixed(2)}`);
        }
    }
    
    totalCost += costEnergy;

    // 3. Capacity & Network Charges
    const costCapacity = usage * RATE_CAPACITY;
    const costNetwork = usage * RATE_NETWORK;
    
    totalCost += costCapacity;
    totalCost += costNetwork;

    breakdown.push(`Caj Kapasiti (4.55 sen): RM ${costCapacity.toFixed(2)}`);
    breakdown.push(`Caj Rangkaian (12.85 sen): RM ${costNetwork.toFixed(2)}`);

    // 4. SST Calculation (Always 6% on Total)
    // Rule: Always applied (No >600kWh check)
    const sst = totalCost * 0.06;
    totalCost += sst;
    
    breakdown.push(`SST (6%): RM ${sst.toFixed(2)}`);

    // 5. Display Results
    if(document.getElementById('billBreakdown')) {
        document.getElementById('billBreakdown').innerHTML = breakdown.map(item => {
            if(item.includes('<span') || item.includes('Caj Peruncitan')) {
                 if(item.includes('Caj Peruncitan')) {
                     const parts = item.split(':');
                     return `<div class="flex justify-between border-b border-gray-100 py-1 text-sm"><span class="text-gray-600">${parts[0]}:</span><span class="font-medium text-gray-800">${parts[1]}</span></div>`;
                 }
                 return `<div class="border-b border-blue-100 py-1 text-sm">${item}</div>`;
            }
            const parts = item.split(':');
            return `
            <div class="flex justify-between border-b border-gray-100 py-1 text-sm">
                <span class="text-gray-600">${parts[0]}:</span>
                <span class="font-medium text-gray-800">${parts[1] || ''}</span>
            </div>`;
        }).join('');
    }

    if(document.getElementById('totalAmount')) {
        document.getElementById('totalAmount').textContent = `RM ${totalCost.toFixed(2)}`;
    }

    if(document.getElementById('calculationResult')) {
        document.getElementById('calculationResult').classList.remove('hidden');
    }
}

function showNotification(message, type) {
    const notif = document.createElement('div');
    notif.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    notif.innerText = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
}


// ------------------------------------------------------------------
// WEEKLY ENERGY USAGE CHART
// ------------------------------------------------------------------

// 1. The Data (This matches your Python data structure)
const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    actual: [0, 0, 0, 0, 0, 0, 0],    // ✅ Starts empty/flat
    predicted: [0, 0, 0, 0, 0, 0, 0]  // ✅ Starts empty/flat
};

// 2. Calculate Total for the Text Display
const total = chartData.actual.reduce((a, b) => a + b, 0);
document.getElementById('total-display').innerText = total.toFixed(1) + ' kWh';

// 3. Render the Chart
// ------------------------------------------------------------------
// WEEKLY ENERGY USAGE CHART (Updated to Match Hourly Theme)
// ------------------------------------------------------------------
const ctx = document.getElementById('dailyUsageChart').getContext('2d');

// 1. [UPDATED] Dark Blue Gradient (Matches Hourly Chart)
const gradientWeekly = ctx.createLinearGradient(0, 0, 0, 400);
gradientWeekly.addColorStop(0, 'rgba(14, 0, 145, 0.5)'); // Dark Blue/Indigo
gradientWeekly.addColorStop(1, 'rgba(14, 0, 145, 0.0)'); // Transparent

// Destroy existing chart if it exists
if (window.myUsageChart) {
    window.myUsageChart.destroy();
}

window.myUsageChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: chartData.labels, 
        datasets: [
            // DATASET 1: ACTUAL CONSUMPTION
            {
                label: 'Actual Consumption',
                data: chartData.actual,
                
                // [UPDATED] Line Color
                borderColor: '#0E0091', 
                
                // [UPDATED] Gradient Fill
                backgroundColor: gradientWeekly, 
                
                borderWidth: 2,
                
                // [UPDATED] Point Style (White dot with blue border)
                pointBackgroundColor: '#fff',
                pointBorderColor: '#0E0091',
                pointBorderWidth: 2,
                pointRadius: 4,
                
                tension: 0.4, 
                fill: true, 
                order: 2 
            },
            // DATASET 2: AI PREDICTION (Orange - Unchanged)
            {
                label: 'AI Prediction',
                data: chartData.predicted,
                borderColor: '#fa9349ff', 
                backgroundColor: 'rgba(249, 115, 22, 0.0)', 
                borderWidth: 2,
                borderDash: [5, 5], 
                pointBackgroundColor: '#fff', 
                pointBorderColor: '#fa9349ff',
                pointBorderWidth: 2,
                pointRadius: 4,
                tension: 0.4,
                fill: false,
                order: 1 
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: { 
                    usePointStyle: true, 
                    
                    // [UPDATED] Controls the size of the legend circles
                    boxWidth: 6,  
                    boxHeight: 6, 
                    
                    padding: 20 // Adds space between the legend and the graph
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y} kWh`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#f3f4f6' },
                title: { display: true, text: 'kwh' }
            },
            x: {
                grid: { display: false }
            }
        }
    }
});

// ------------------------------------------------------------------
// Monthly Trend Chart (Bar Chart)
// ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
    // 1. Define Data (Matches your original HTML values)
    const chartData = {
        labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        data: [1156, 1203, 987, 1089, 1247, 1356]
    };

    // 2. Calculate and Display Average
    const total = chartData.data.reduce((sum, value) => sum + value, 0);
    const average = Math.round(total / chartData.data.length);
    document.getElementById('averageUsage').innerText = `${average.toLocaleString()} kWh/month`;

    // 3. Configure Chart Colors
    // Use the lighter blue (#0E0091) for past months, darker blue (#1a0f7a) for the current/last month
    const backgroundColors = chartData.data.map((_, index) => 
        index === chartData.data.length - 1 ? '#1500d1ff' : '#005cd4ff'
    );
});

    // ------------------------------------------------------------------
// Monthly Trend Chart (INITIALIZATION)
// ------------------------------------------------------------------
let myMonthlyChart; // Global variable

document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('monthlyTrendChart').getContext('2d');
    
    // Create the chart with EMPTY data initially
    window.myMonthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [], // Empty to start
            datasets: [{
                label: 'Energy Usage',
                data: [], // Empty to start
                backgroundColor: '#005cd4ff', // Default color
                borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                barPercentage: 0.6,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 25 } },
            plugins: {
                legend: { display: false },
                datalabels: {
                    color: '#4b5563',
                    anchor: 'end',
                    align: 'end',
                    offset: 4,
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => value.toLocaleString()
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f3f4f6', drawBorder: false },
                    ticks: { color: '#9ca3af', font: { size: 11 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#6b7280', font: { size: 12 } }
                }
            }
        }
    });
});

function switchTariff(type) {
    const config = TARIFF_CONFIG.types[type];
    if (!config) return;

    // 1. UPDATE GLOBAL STATE
    currentTariffType = type; 

    // 2. Update Tariff Info Visuals (Text & Table)
    const titleEl = document.getElementById('tariffTitle');
    const dateEl = document.getElementById('tariffUpdateDate');
    const fixedEl = document.getElementById('fixedChargeDisplay');
    const sstEl = document.getElementById('sstDisplay');

    if(titleEl) titleEl.textContent = config.title;
    if(dateEl) dateEl.textContent = `[Last Updated ${config.lastUpdated}]`;
    if(fixedEl) fixedEl.textContent = `RM ${config.fixedCharge.toFixed(2)}`;
    if(sstEl) sstEl.textContent = (TARIFF_CONFIG.sstRate * 100);

    // Update Rates Table
    const tbody = document.getElementById('tariffTableBody');
    if (tbody) {
        tbody.innerHTML = ''; 
        config.tiers.forEach(tier => {
            const totalRate = (tier.energy + tier.capacity + tier.network).toFixed(2);
            const tr = `
                <tr class="${tier.rowBgClass}">
                    <td class="px-4 py-3 text-sm text-gray-900 font-medium">
                        ${tier.name}
                        <div class="text-xs font-normal text-gray-500">${tier.subtext}</div>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600">${tier.energy.toFixed(2)}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${tier.capacity.toFixed(2)}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${tier.network.toFixed(2)}</td>
                    <td class="px-4 py-3 text-sm font-bold ${tier.totalColorClass}">${totalRate} sen</td>
                </tr>
            `;
            tbody.innerHTML += tr;
        });
    }

    updateButtonStyles(type);

    // 3. TRIGGER IMMEDIATE RECALCULATION (For Live Dashboard)
    // We keep this running so the dashboard at the top stays accurate
    const newBill = calculateTNBEstimator(lastKnownEnergyKWh, currentTariffType);
    if(document.getElementById("currentBill")) {
        document.getElementById("currentBill").innerText = `RM ${newBill.toFixed(2)}`;
    }

    // ---------------------------------------------------------
    // 4. RESET MANUAL CALCULATOR (The Change You Requested)
    // ---------------------------------------------------------
    // This hides the result table so the user must click "Calculate" again
    const calcResult = document.getElementById('calculationResult');
    if (calcResult) {
        calcResult.classList.add('hidden'); // Adds the 'hidden' class to make it disappear
    }
}

    // 2. Button Styling Helper
    function updateButtonStyles(activeType) {
        const btnStd = document.getElementById('btn-standard');
        const btnAlt = document.getElementById('btn-alternative');
        
        if (!btnStd || !btnAlt) return;

        const activeClass = "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-white text-blue-600 shadow-sm border border-gray-200";
        const inactiveClass = "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 text-gray-500 hover:text-gray-700 border border-transparent";

        if (activeType === 'standard') {
            btnStd.className = activeClass;
            btnAlt.className = inactiveClass;
        } else {
            btnStd.className = inactiveClass;
            btnAlt.className = activeClass;
        }
    }

    // 3. EVENT LISTENERS (This fixes the button issue)
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize with Standard
        switchTariff('standard');

        // Attach clicks manually
        const btnStd = document.getElementById('btn-standard');
        const btnAlt = document.getElementById('btn-alternative');

        if (btnStd) {
            btnStd.addEventListener('click', () => switchTariff('standard'));
        }
        if (btnAlt) {
            btnAlt.addEventListener('click', () => switchTariff('alternative'));
        }
    });

// ------------------------------------------------------------------
// 7. HOURLY ENERGY USAGE CHART (Dynamic Device ID)
// ------------------------------------------------------------------

let globalEnergyChart; // Store chart instance globally so we can update it

// A. Initialize the Chart (Visuals only)
document.addEventListener("DOMContentLoaded", () => {
    const canvasElement = document.getElementById('energyChart');
    if (!canvasElement) return;

    // Destroy ghost charts
    const existingChart = Chart.getChart(canvasElement);
    if (existingChart) existingChart.destroy();

    const ctx_live = canvasElement.getContext('2d');
    
    const gradient = ctx_live.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(15, 0, 145, 0.66)'); 
    gradient.addColorStop(1, 'rgba(14, 0, 145, 0.0)'); 

    globalEnergyChart = new Chart(ctx_live, {
        type: 'line',
        data: {
            labels: [], 
            datasets: [{
                label: 'Energy (kWh)',
                data: [],
                borderColor: '#0E0091', 
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#0E0091',
                pointRadius: 4,
                tension: 0.4, 
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, grid: { color: '#f3f4f6' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => c.raw + ' kwh' } }
            }
        }
    });
});

// ------------------------------------------------------------------
// 7. HOURLY ENERGY USAGE CHART (FIXED PATH)
// ------------------------------------------------------------------
// ... (Your 'A. Initialize the Chart' code stays the same) ...

// B. Function to Listen to Data (Called by Auth)
function startHourlyChartListener(deviceId) {
    if (!globalEnergyChart) return; 

    // OLD BROKEN PATH: ref(database, `${deviceId}/energy_monitor/energy_hourly`);

    // ✅ NEW CORRECT PATH
    const hourlyRef = ref(database, `${deviceId}/energy_hourly`);

    onValue(hourlyRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const labels = [];
        const values = [];

        // Sort and Limit
        const sortedKeys = Object.keys(data).sort();
        const recentKeys = sortedKeys.slice(-12); 

        function formatKeyToTime(key) {
            const hour = parseInt(key.substring(8, 10)); 
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12; 
            return `${displayHour}:00 ${ampm}`;
        }

        recentKeys.forEach(key => {
            labels.push(formatKeyToTime(key));
            values.push(data[key].kwh); 
        });

        console.log("📈 Updating Chart with", values.length, "points");

        // Update Global Chart
        globalEnergyChart.data.labels = labels;
        globalEnergyChart.data.datasets[0].data = values;
        globalEnergyChart.update();

        const updateText = document.getElementById('last-update');
        if(updateText) updateText.innerText = "Last update: " + new Date().toLocaleTimeString();
    });
}
