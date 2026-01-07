// ------------------------------------------------------------------
// 1. IMPORTS (Firebase v9 Modular SDK)
// ------------------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

import { TARIFF_CONFIG } from './tariff_config.js';
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

// ------------------------------------------------------------------
// 3. AUTHENTICATION LOGIC
// ------------------------------------------------------------------
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User detected:", user.displayName || "Anonymous");
        if(document.getElementById("username")) {
            document.getElementById("username").textContent = user.displayName || "User";
        }
    } else {
        console.log("No user logged in. Redirecting...");
        window.location.href = "index.html"; // Enforce login
    }
});

// Logout Logic
document.querySelectorAll(".logoutBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        signOut(auth).then(() => {
            console.log("User logged out.");
            window.location.href = "index.html";
        }).catch((error) => {
            console.error("Logout failed:", error);
            showNotification("Logout failed: " + error.message, "error");
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
// 5. REALTIME DATA LOGIC (PZEM Parameters)
// ------------------------------------------------------------------
const energyRef = ref(database, 'energy_monitor/live');

onValue(energyRef, (snapshot) => {
    const data = snapshot.val();
    
    if (data) {
        // 1. Extract Raw Values
        const voltage = parseFloat(data.voltage_V) || 0;
        const current = parseFloat(data.current_A) || 0;
        const powerW = parseFloat(data.power_W) || 0;
        const energyKWh = parseFloat(data.energy_kWh) || 0;
        const frequency = parseFloat(data.frequency_Hz) || 0;
        const pf = parseFloat(data.power_factor) || 0;

        // 2. Electrical Calculations
        const realPowerKW = powerW / 1000;
        
        // Apparent Power (S = V * I) in kVA
        const apparentPowerKVA = ((voltage * current) / 1000);

        // Reactive Power (Q) - PROTECTED MATH
        const term = Math.pow(apparentPowerKVA, 2) - Math.pow(realPowerKW, 2);
        const reactivePowerKVAR = Math.sqrt(Math.max(0, term));

        // 3. Bill Calculation (Live)
        // Uses the energyKWh from the sensor to estimate bill
        const liveBill = calculateTNBEstimator(energyKWh);
        console.log("💰 Calculated Bill:", liveBill);

        // 4. Update Dashboard Charts & Main Bill Text
        updateDashboard(realPowerKW.toFixed(3), reactivePowerKVAR.toFixed(3), pf.toFixed(2), apparentPowerKVA);
        
        // ** UPDATE THE BILL TEXT HERE **
        if(document.getElementById("currentBill")) {
            document.getElementById("currentBill").innerText = `RM ${liveBill.toFixed(2)}`;
        }

        // 5. Update Simple Cards
        if(document.getElementById("val-voltage")) document.getElementById("val-voltage").innerText = voltage.toFixed(1);
        if(document.getElementById("val-current")) document.getElementById("val-current").innerText = current.toFixed(3);
        if(document.getElementById("val-power")) document.getElementById("val-power").innerText = powerW.toFixed(1);
        if(document.getElementById("val-energy")) document.getElementById("val-energy").innerText = energyKWh.toFixed(3);
        if(document.getElementById("val-freq")) document.getElementById("val-freq").innerText = frequency.toFixed(1);
        if(document.getElementById("val-pf")) document.getElementById("val-pf").innerText = pf.toFixed(2);
        
        if(document.getElementById("last-update")) {
            document.getElementById("last-update").innerText = new Date().toLocaleTimeString();
        }
    }
});

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

    if(typeof updateDailyChart === 'function') updateDailyChart();
}

// Chart Utils (Mock Data)
function updateDailyChart() {
    const dailyValues = [24.5, 31.2, 18.7, 35.4, 37.8, 29.1, 42.3]; 
    for (let i = 0; i < 7; i++) {
        const bar = document.getElementById(`day${i + 1}`);
        const valueSpan = document.getElementById(`day${i + 1}-value`);
        if (bar && valueSpan) {
            const val = dailyValues[i];
            bar.style.height = ((val / 45) * 100) + '%';
            valueSpan.textContent = val.toFixed(1);
        }
    }
}

// Bill Calculator (Updated to use Shared Logic)
// ------------------------------------------------------------------
// MANUAL BILL CALCULATOR (With Breakdown List)
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// MANUAL BILL CALCULATOR (New Domestik Am Tariff)
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

    // --- 1. Determine Rates based on Usage Tier ---
    let energyRate, capacityRate, networkRate;
    
    if (usage <= 1500) {
        energyRate = 0.2703;   // 27.03 sen
        capacityRate = 0.0455; // 4.55 sen
        networkRate = 0.1285;  // 12.85 sen
        breakdown.push(`Tier: Low Usage (≤ 1,500 kWh)`);
    } else {
        energyRate = 0.3703;   // 37.03 sen
        capacityRate = 0.0455; // 4.55 sen
        networkRate = 0.1285;  // 12.85 sen
        breakdown.push(`Tier: High Usage (> 1,500 kWh)`);
    }

    // --- 2. Calculate Components ---
    
    // A. Fixed Retail Charge
    const retailCharge = 10.00;
    totalCost += retailCharge;
    breakdown.push(`Caj Peruncitan (Fixed): RM ${retailCharge.toFixed(2)}`);

    // B. Energy Charge (Caj Tenaga)
    const costEnergy = usage * energyRate;
    totalCost += costEnergy;
    breakdown.push(`Caj Tenaga (${(energyRate*100).toFixed(2)} sen/kWh): RM ${costEnergy.toFixed(2)}`);

    // C. Capacity Charge (Caj Kapasiti)
    const costCapacity = usage * capacityRate;
    totalCost += costCapacity;
    breakdown.push(`Caj Kapasiti (${(capacityRate*100).toFixed(2)} sen/kWh): RM ${costCapacity.toFixed(2)}`);

    // D. Network Charge (Caj Rangkaian)
    const costNetwork = usage * networkRate;
    totalCost += costNetwork;
    breakdown.push(`Caj Rangkaian (${(networkRate*100).toFixed(2)} sen/kWh): RM ${costNetwork.toFixed(2)}`);

    // --- 3. SST Calculation (6%) ---
    const sst = totalCost * 0.06;
    totalCost += sst;
    breakdown.push(`SST (6%): RM ${sst.toFixed(2)}`);

    // ------------------------------------------------------
    // 4. DISPLAY RESULTS
    // ------------------------------------------------------
    
    if(document.getElementById('billBreakdown')) {
        document.getElementById('billBreakdown').innerHTML = breakdown.map(item => {
            const parts = item.split(':');
            // Check if it's a header (no colon) or a value row
            if(parts.length < 2) {
                 return `<div class="font-bold text-blue-600 border-b border-blue-100 py-1 text-sm mt-2">${item}</div>`;
            }
            return `
            <div class="flex justify-between border-b border-gray-100 py-1 text-sm">
                <span class="text-gray-600">${parts[0]}:</span>
                <span class="font-medium text-gray-800">${parts[1]}</span>
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
    actual: [24.5, 31.2, 18.7, 35.4, 37.8, 40.9, 42.3],
    // Mock AI Prediction (Simulated values close to actuals)
    predicted: [26.2, 30.5, 21.0, 33.8, 39.2, 43.5, 40.8]
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

    // 4. Render the Chart
    const ctx = document.getElementById('monthlyTrendChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Energy Usage',
                data: chartData.data,
                backgroundColor: backgroundColors,
                // Keep the sharp bottom corners
                borderRadius: {
                    topLeft: 6,
                    topRight: 6,
                    bottomLeft: 0,
                    bottomRight: 0
                },
                borderSkipped: false,
                barPercentage: 0.6,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 25 // Adds space at the top so numbers aren't cut off
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true },
                
                // --- UPDATED LABELS CONFIGURATION ---
                datalabels: {
                    color: '#4b5563', // Dark gray text (Tailwind gray-600)
                    anchor: 'end',    // Anchor to the top of the bar
                    align: 'end',     // Push it UPWARDS (outside the bar)
                    offset: 4,        // Add a tiny bit of spacing from the bar
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    formatter: function(value) {
                        return value.toLocaleString();
                    }
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
        
        // Error handling: if config doesn't exist, stop
        if (!config) {
            console.error(`Configuration for ${type} not found!`);
            return;
        }

        // Update Text
        const titleEl = document.getElementById('tariffTitle');
        const dateEl = document.getElementById('tariffUpdateDate');
        const fixedEl = document.getElementById('fixedChargeDisplay');
        const sstEl = document.getElementById('sstDisplay');

        if(titleEl) titleEl.textContent = config.title;
        if(dateEl) dateEl.textContent = `[Last Updated ${config.lastUpdated}]`;
        if(fixedEl) fixedEl.textContent = `RM ${config.fixedCharge.toFixed(2)}`;
        if(sstEl) sstEl.textContent = (TARIFF_CONFIG.sstRate * 100);

        // Update Table
        const tbody = document.getElementById('tariffTableBody');
        if (tbody) {
            tbody.innerHTML = ''; // Clear table
            
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
// 7. HOURLY ENERGY USAGE CHART (Firebase Realtime DB)
// ------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const canvasElement = document.getElementById('energyChart');

    if (!canvasElement) {
        console.warn("Skipping Energy Chart: Canvas not found.");
        return;
    }

    // --- FIX 1: AUTO-DESTROY GHOST CHARTS ---
    // This removes any previous chart instance preventing the glitch
    const existingChart = Chart.getChart(canvasElement);
    if (existingChart) {
        existingChart.destroy();
    }

    const ctx_live = canvasElement.getContext('2d');
    
    // Create Gradient
    const gradient = ctx_live.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(15, 0, 145, 0.66)'); 
    gradient.addColorStop(1, 'rgba(14, 0, 145, 0.0)'); 

    // Initialize Chart
    const energyChart = new Chart(ctx_live, {
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
                y: { 
                    beginAtZero: false, // Let chart scale to your data (e.g. 65-67)
                    grid: { color: '#f3f4f6' } 
                },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: (c) => c.raw + ' kwh' }
                }
            }
        }
    });

    // Helper: Format Time
    function formatKeyToTime(key) {
        const hour = parseInt(key.substring(8, 10)); 
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12; 
        return `${displayHour}:00 ${ampm}`;
    }

    // Database Listener
    const hourlyRef = ref(database, 'energy_monitor/energy_hourly');

    onValue(hourlyRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const labels = [];
        const values = [];

        // Sort and Limit
        const sortedKeys = Object.keys(data).sort();
        const recentKeys = sortedKeys.slice(-12); 

        recentKeys.forEach(key => {
            labels.push(formatKeyToTime(key));
            values.push(data[key].kwh); // Make sure this matches your DB property
        });

        // --- FIX 2: DEBUG LOG ---
        // Check console to see if "Values" has numbers like [65, 66, 67]
        console.log("📈 DRAWING CHART WITH VALUES:", values);

        // Update Chart
        energyChart.data.labels = labels;
        energyChart.data.datasets[0].data = values;
        energyChart.update();

        // Update Timestamp
        const updateText = document.getElementById('last-update');
        if(updateText) updateText.innerText = "Last update: " + new Date().toLocaleTimeString();
    });
});
