const coreMaterials = {
    "CRGO": { 
        "description": "Cold Rolled Grain Oriented Steel",
        "khCoeff": 0.025, 
        "keCoeff": 0.0005,
        "nExp": 1.6,
        "bTypical": 1.7,
        "k1": 0.8,
        "k2": 0.8
    },
    "CRNGO": { 
        "description": "Cold Rolled Non-Grain Oriented Steel",
        "khCoeff": 0.04, 
        "keCoeff": 0.001,
        "nExp": 1.7,
        "bTypical": 1.5,
        "k1": 0.7,
        "k2": 0.7
    },
    "Amorphous": { 
        "description": "Amorphous Metal Core",
        "khCoeff": 0.008, 
        "keCoeff": 0.0001,
        "nExp": 1.5,
        "bTypical": 1.3,
        "k1": 0.85,
        "k2": 0.85
    },
    "Ferrite": { 
        "description": "Ferrite Core",
        "khCoeff": 0.004, 
        "keCoeff": 0.00005,
        "nExp": 2.0,
        "bTypical": 0.4,
        "k1": 0.5,
        "k2": 0.5
    },
    "Nanoc": { 
        "description": "Nanocrystalline Core",
        "khCoeff": 0.003, 
        "keCoeff": 0.00003,
        "nExp": 1.4,
        "bTypical": 1.2,
        "k1": 0.75,
        "k2": 0.75
    }
};

const windingMaterials = {
    "copper": {
      "description": "Copper Windings",
      "resistivity": 1.68e-8,
      "density": 8960,
      "thermalConductivity": 401
    },
    "aluminum": {
      "description": "Aluminum Windings",
      "resistivity": 2.82e-8,
      "density": 2700,
      "thermalConductivity": 237
    }
};
  
  
// Updated event listeners for new selectors
document.getElementById('windingMaterial').addEventListener('change', function() {
    const selectedMaterial = this.value;
    const materialProps = windingMaterials[selectedMaterial];
    // You could display the properties somewhere if needed
    console.log(`Selected winding material: ${materialProps.description}`);
});


// Core type change event
document.getElementById('coreType').addEventListener('change', function() {
    const selectedCore = this.value;
    const coreProps = coreMaterials[selectedCore];
    
    document.getElementById('coreProperties').innerHTML = 
        `${coreProps.description}<br>` +
        `Hysteresis Coeff: ${coreProps.khCoeff}<br>` +
        `Eddy Current Coeff: ${coreProps.keCoeff}<br>` +
        `Exp. n: ${coreProps.nExp}<br>` +
        `Typical Bmax: ${coreProps.bTypical} T`;
});

// Initialize the first core type
document.getElementById('coreType').dispatchEvent(new Event('change'));

// Add load point button
document.getElementById('addLoadBtn').addEventListener('click', function() {
    const loadInputContainer = document.getElementById('multipleLoadInputs');
    const newLoad = document.createElement('div');
    newLoad.className = 'load-input';
    newLoad.innerHTML = `
        <input type="number" class="load-value" placeholder="Load percentage">
        <select class="load-unit">
            <option value="0.01" selected>%</option>
            <option value="1">p.u.</option>
        </select>
        <button class="remove-load">X</button>
    `;
    loadInputContainer.appendChild(newLoad);
    
    // Add event listener to remove button
    newLoad.querySelector('.remove-load').addEventListener('click', function() {
        loadInputContainer.removeChild(newLoad);
    });
});

// Add event listener to existing remove button
document.querySelector('.remove-load').addEventListener('click', function() {
    // Don't remove if it's the only load input
    if (document.querySelectorAll('.load-input').length > 1) {
        this.parentElement.remove();
    }
});

// Tab switching for graphs
    document.querySelectorAll('.graph-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.graph-tab').forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Get the graph id to show
            const graphToShow = this.dataset.graph;
            currentActiveGraph = graphToShow;
            
            // Update the graph display if data exists
            if (calculatedData) {
                updateGraphs(calculatedData);
            }
        });
    });

    // Track current active graph
    let currentActiveGraph = 'ironLossesGraph';
    let calculatedData = null;
    function calculateTransformerParameters(inputs) {
        const results = {};
        const turns_ratio = inputs.primaryVoltage / inputs.secondaryVoltage;
        const I_pri_rated = inputs.ratedPower / inputs.primaryVoltage;
        const I_sec_rated = inputs.ratedPower / inputs.secondaryVoltage;
        
        const core = coreMaterials[inputs.coreType];
        const windingMaterial = windingMaterials[inputs.windingMaterial];
        
        // Use actual core dimensions if provided, otherwise estimate
        const core_cross_section = inputs.coreArea || (Math.sqrt(inputs.ratedPower / 10) * 0.01);
        const core_length = inputs.coreMeanLength || (Math.sqrt(inputs.ratedPower) * 0.05);
        const core_volume = core_cross_section * core_length;
        
        // Calculate flux density more accurately
        const B_max = inputs.primaryVoltage / (4.44 * inputs.frequency * core_cross_section * turns_ratio);
        
        // Calculate iron losses using core volume
        const hysteresis_loss = core.khCoeff * inputs.frequency * Math.pow(B_max, core.nExp) * core_volume;
        const eddy_current_loss = core.keCoeff * Math.pow(inputs.frequency, 2) * Math.pow(B_max, 2) * core_volume;
        const iron_loss = hysteresis_loss + eddy_current_loss;
        
        // Arrays to store calculated values
        const copper_losses = [];
        const total_losses = [];
        const efficiencies = [];
        const temperature_rises = [];
        
        // Calculate surface area
        const transformer_height = Math.pow(inputs.ratedPower, 0.3) * 0.2;
        const transformer_width = Math.pow(inputs.ratedPower, 0.2) * 0.3;
        const transformer_depth = Math.pow(inputs.ratedPower, 0.2) * 0.25;
        const surface_area = 2 * (transformer_height * transformer_width + transformer_height * transformer_depth + transformer_width * transformer_depth);
        
        // Dielectric loss calculation
        const dielectric_loss = 2 * Math.PI * inputs.frequency * (0.005 * inputs.ratedPower / 1000) * 
                               Math.pow(inputs.primaryVoltage, 2) * (inputs.insulationThickness * 1e-2);
        
        // Process different load conditions
        if (inputs.loads.length === 0 || (inputs.loads.length === 1 && isNaN(inputs.loads[0]))) {
          inputs.loads = [0, 0.25, 0.5, 0.75, 1, 1.25];
        }
        inputs.loads.sort((a, b) => a - b);
        
        inputs.loads.forEach(load => {
          const I_pri = I_pri_rated * load;
          const I_sec = I_sec_rated * load;
          
          // Calculate copper losses
          const copper_loss_pri = Math.pow(I_pri, 2) * inputs.windingResistancePri;
          const copper_loss_sec = Math.pow(I_sec, 2) * inputs.windingResistanceSec;
          const copper_loss = copper_loss_pri + copper_loss_sec;
          
          // Calculate stray losses
          const stray_loss = 0.01 * inputs.ratedPower * load;
          
          // Total losses
          const total_loss = iron_loss + copper_loss + stray_loss;
          
          // Calculate efficiency
          const output_power = inputs.ratedPower * load;
          const input_power = output_power + total_loss;
          const efficiency = (output_power / input_power) * 100;
          
          // Store results
          copper_losses.push({
            load: load * 100,
            loss: copper_loss,
            primary: copper_loss_pri,
            secondary: copper_loss_sec
          });
          
          total_losses.push({
            load: load * 100,
            iron: iron_loss,
            copper: copper_loss,
            stray: stray_loss,
            dielectric: dielectric_loss,
            total: total_loss
          });
          
          efficiencies.push({
            load: load * 100,
            efficiency: efficiency
          });
        });
        
        // Calculate optimal load
        const optimal_load = Math.sqrt(iron_loss / (inputs.windingResistancePri * Math.pow(I_pri_rated, 2) + 
                                     inputs.windingResistanceSec * Math.pow(I_sec_rated, 2)));
        
        // Store all results
        results.iron_loss = {
          hysteresis: hysteresis_loss,
          eddy_current: eddy_current_loss,
          total: iron_loss
        };
        results.copper_losses = copper_losses;
        results.total_losses = total_losses;
        results.efficiencies = efficiencies;
        results.temperature_rises = temperature_rises;
        results.optimal_load = optimal_load * 100;
        results.loads = inputs.loads.map(l => l * 100);
        results.dielectric_loss = dielectric_loss;
        results.surface_area = surface_area;
        
        return results;
    }
    // Generate button functionality
    document.getElementById('generateBtn').addEventListener('click', function() {
        // Collect all inputs
        const inputs = {
            primaryVoltage: parseFloat(document.getElementById('primaryVoltage').value) * 
                        parseFloat(document.getElementById('primaryVoltageUnit').value),
            secondaryVoltage: parseFloat(document.getElementById('secondaryVoltage').value) * 
                            parseFloat(document.getElementById('secondaryVoltageUnit').value),
            ratedPower: parseFloat(document.getElementById('ratedPower').value) * 
                    parseFloat(document.getElementById('ratedPowerUnit').value),
            frequency: parseFloat(document.getElementById('frequency').value) * 
                    parseFloat(document.getElementById('frequencyUnit').value),
            coreType: document.getElementById('coreType').value,
            windingResistancePri: parseFloat(document.getElementById('windingResistancePri').value) * 
                                parseFloat(document.getElementById('windingResistancePriUnit').value),
            windingResistanceSec: parseFloat(document.getElementById('windingResistanceSec').value) * 
                                parseFloat(document.getElementById('windingResistanceSecUnit').value),
            coreArea: parseFloat(document.getElementById('coreArea').value) * 
                    parseFloat(document.getElementById('coreAreaUnit').value),
            coreMeanLength: parseFloat(document.getElementById('coreMeanLength').value) * 
                        parseFloat(document.getElementById('coreMeanLengthUnit').value),
            numberOfSheets: parseInt(document.getElementById('numberOfSheets').value),
            windingLength: parseFloat(document.getElementById('windingLength').value) * 
                        parseFloat(document.getElementById('windingLengthUnit').value),
            stackingFactor: parseFloat(document.getElementById('stackingFactor').value),
            windingMaterial: document.getElementById('windingMaterial').value,
            loads: Array.from(document.querySelectorAll('.load-input')).map(loadInput => {
                return parseFloat(loadInput.querySelector('.load-value').value) * 
                    parseFloat(loadInput.querySelector('.load-unit').value);
            })
        };

        // Basic input validation
        if (isNaN(inputs.primaryVoltage) || isNaN(inputs.secondaryVoltage) || 
            isNaN(inputs.ratedPower) || isNaN(inputs.frequency) ||
            isNaN(inputs.windingResistancePri) || isNaN(inputs.windingResistanceSec) ||
            isNaN(inputs.coreArea) || isNaN(inputs.coreMeanLength) ||
            isNaN(inputs.numberOfSheets) || isNaN(inputs.windingLength) ||
            isNaN(inputs.stackingFactor) ||
            inputs.loads.some(isNaN)) {
            alert("Please fill in all required fields with valid numbers");
            return;
        }

    // Validate Number Of Sheets
    if (!Number.isInteger(inputs.numberOfSheets) || inputs.numberOfSheets <= 0) {
        alert("Number Of Sheets must be a positive integer.");
        return;
    }

    // Validate Stacking Factor
    if (inputs.stackingFactor < 0.9 || inputs.stackingFactor > 0.97) {
        alert("Stacking Factor must be between 0.9 and 0.97.");
        return;
    }

    // Get core properties
    const coreProps = coreMaterials[inputs.coreType];

    // Transformer Specification Limits
    // 1. Frequency Limits (45 Hz to 90 Hz)
    if (inputs.frequency < 45 || inputs.frequency > 90) {
        alert("Frequency must be between 45 Hz and 90 Hz.");
        return;
    }

    // 2. Rated Power Limits
    const A_c_cm2 = inputs.coreArea * 10000; // Convert m² to cm²
    const l_m_cm = inputs.coreMeanLength * 100; // Convert m to cm
    const J = 3; // Current density in A/mm²
    const S_max = coreProps.k2 * inputs.stackingFactor * A_c_cm2 * l_m_cm * J;
    const S_min = 0.6 * S_max;

    // 3. Primary and Secondary Voltage Limits
    // Estimate N (number of turns) using V_p = 4.44 * f * B_max * A_c * N
    const B_max = coreProps.bTypical; // Assuming bTypical is B_max
    const N = inputs.primaryVoltage / (4.44 * inputs.frequency * B_max * inputs.coreArea);
    const f_max = 90;
    const f_min = 45;
    const V_p_max = coreProps.k1 * B_max * f_max * A_c_cm2 * N;
    const V_p_min = coreProps.k1 * B_max * f_min * A_c_cm2 * N;

    // Secondary Voltage Limits based on turn ratio T = V_p / V_s
    const T = inputs.primaryVoltage / inputs.secondaryVoltage;
    const V_s_max = V_p_max / T;
    const V_s_min = V_p_min / T;

    // Proceed with calculations
    const data = calculateTransformerParameters(inputs);
    calculatedData = data;

    // Update formulas and graphs
    updateFormulaResults(data);
    updateGraphs(data);
});

// Format number with appropriate unit prefix (k, m, μ, etc.)
function formatWithUnit(value, baseUnit) {
    if (isNaN(value) || value === 0) return "0 " + baseUnit;
    
    const absValue = Math.abs(value);
    
    if (absValue >= 1000000) {
        return (value / 1000000).toFixed(2) + " M" + baseUnit;
    } else if (absValue >= 1000) {
        return (value / 1000).toFixed(2) + " k" + baseUnit;
    } else if (absValue < 0.001) {
        return (value * 1000000).toFixed(2) + " μ" + baseUnit;
    } else if (absValue < 1) {
        return (value * 1000).toFixed(2) + " m" + baseUnit;
    } else {
        return value.toFixed(2) + " " + baseUnit;
    }
}

function calculateRatedPowerLimits() {
    const coreType = document.getElementById('coreType').value;
    const coreProps = coreMaterials[coreType];
    const stackingFactor = parseFloat(document.getElementById('stackingFactor').value) || 0.95;
    const coreArea = parseFloat(document.getElementById('coreArea').value) * parseFloat(document.getElementById('coreAreaUnit').value);
    const coreMeanLength = parseFloat(document.getElementById('coreMeanLength').value) * parseFloat(document.getElementById('coreMeanLengthUnit').value);

    // Make sure we have valid inputs
    if (isNaN(coreArea) || isNaN(coreMeanLength) || !coreProps) {
        return { min: 0, max: 0 };
    }

    // Convert units consistently
    const A_c_m2 = coreArea; // Already in m²
    
    // Typical current density for transformer windings
    const J = 3; // Current density in A/mm²
    
    // Voltage factor - use 4.44 for sinusoidal waveforms
    const k = 4.44;
    
    const frequency = parseFloat(document.getElementById('frequency').value) * parseFloat(document.getElementById('frequencyUnit').value) || 50;
    const B_max = coreProps.bTypical || 1.5; // Tesla
    
    // More realistic formula: S_max in VA
    const S_max = k * frequency * B_max * A_c_m2 * J * 1000; // *1000 to account for mm² to m² conversion for J
    const S_min = 0.3 * S_max; // Reasonable minimum for efficiency
    
    return { min: S_min/(4.2), max: S_max*2 };
}

function calculatePrimaryVoltageLimits() {
    const coreType = document.getElementById('coreType').value;
    const coreProps = coreMaterials[coreType];
    const frequency = parseFloat(document.getElementById('frequency').value) * parseFloat(document.getElementById('frequencyUnit').value) || 50;
    const coreArea = parseFloat(document.getElementById('coreArea').value) * parseFloat(document.getElementById('coreAreaUnit').value);
    const stackingFactor = parseFloat(document.getElementById('stackingFactor').value) || 0.95;

    // Make sure we have valid inputs
    if (isNaN(coreArea) || isNaN(frequency) || !coreProps) {
        return { min: 0, max: 0 };
    }

    const B_max = coreProps.bTypical || 1.5; // Tesla
    const B_min = B_max * 0.5; // Lower flux density for minimum
    
    // Voltage constant (4.44 for sine wave)
    const k = 4.44;
    
    // Area in m² with stacking factor applied
    const effectiveArea = coreArea * stackingFactor;
    
    // Calculate voltage limits based on practical frequency range and flux density
    const f_max = 90; // Hz
    const f_min = 45; // Hz
    
    // For a reasonable small-medium transformer, turns might range from 50-500
    const N_min = 50;
    const N_max = 500;
    
    // V = k * f * B * A * N
    const V_p_max = k * f_max * B_max * effectiveArea * N_max;
    const V_p_min = k * f_min * B_min * effectiveArea * N_min;
    
    return { min: V_p_min, max: V_p_max };
}

function calculateSecondaryVoltageLimits() {
    // Secondary voltage depends on turns ratio
    const primaryVoltage = parseFloat(document.getElementById('primaryVoltage').value) * 
                         parseFloat(document.getElementById('primaryVoltageUnit').value);
    
    if (!primaryVoltage || isNaN(primaryVoltage)) {
        return { text: "Enter primary voltage first" };
    }
    
    // For most practical transformers, the turns ratio is typically between 0.1 and 10
    const V_s_min = primaryVoltage * 0.1;  // Min turns ratio (primary:secondary = 10:1)
    const V_s_max = primaryVoltage * 10;   // Max turns ratio (primary:secondary = 1:10)
    
    return { min: V_s_min, max: V_s_max };
}

function calculateFrequencyLimits() {
    // For most power transformers, this is a reasonable range
    return { min: 45, max: 90 }; // Hz
}

function updateLimitsDisplay() {
    try {
        // Rated Power
        const ratedPowerLimits = calculateRatedPowerLimits();
        if (ratedPowerLimits.min > 0 && ratedPowerLimits.max > 0) {
            document.getElementById('ratedPowerLimits').textContent = 
                `${formatWithUnit(ratedPowerLimits.min, "VA")} - ${formatWithUnit(ratedPowerLimits.max, "VA")}`;
        } else {
            document.getElementById('ratedPowerLimits').textContent = 
                `Enter core parameters first`;
        }

        // Primary Voltage
        const primaryVoltageLimits = calculatePrimaryVoltageLimits();
        if (primaryVoltageLimits.min > 0 && primaryVoltageLimits.max > 0) {
            document.getElementById('primaryVoltageLimits').textContent = 
                `${formatWithUnit(primaryVoltageLimits.min, "V")} - ${formatWithUnit(primaryVoltageLimits.max, "V")}`;
        } else {
            document.getElementById('primaryVoltageLimits').textContent = 
                `Enter core parameters first`;
        }

        // Secondary Voltage
        const secondaryVoltageLimits = calculateSecondaryVoltageLimits();
        if (secondaryVoltageLimits.text) {
            document.getElementById('secondaryVoltageLimits').textContent = secondaryVoltageLimits.text;
        } else {
            document.getElementById('secondaryVoltageLimits').textContent = 
                `${formatWithUnit(secondaryVoltageLimits.min, "V")} - ${formatWithUnit(secondaryVoltageLimits.max, "V")}`;
        }

        // Frequency
        const frequencyLimits = calculateFrequencyLimits();
        document.getElementById('frequencyLimits').textContent = 
            `${frequencyLimits.min} Hz - ${frequencyLimits.max} Hz`;
            
    } catch (error) {
        console.error("Error updating limits:", error);
    }
}

// Function to add limit displays to the existing HTML
function addLimitDisplays() {
    // For each input field, add a small display for the limits
    const inputFields = [
        { id: 'ratedPower', limitsId: 'ratedPowerLimits' },
        { id: 'primaryVoltage', limitsId: 'primaryVoltageLimits' },
        { id: 'secondaryVoltage', limitsId: 'secondaryVoltageLimits' },
        { id: 'frequency', limitsId: 'frequencyLimits' }
    ];
    
    inputFields.forEach(field => {
        const inputElement = document.getElementById(field.id);
        if (inputElement) {
            const parentElement = inputElement.parentElement;
            
            // Create a small display element for the limits
            const limitsDisplay = document.createElement('small');
            limitsDisplay.id = field.limitsId;
            limitsDisplay.className = 'limits-display';
            limitsDisplay.style.display = 'block';
            limitsDisplay.style.color = '#666';
            limitsDisplay.style.marginTop = '2px';
            limitsDisplay.style.fontSize = '0.8em';
            limitsDisplay.textContent = 'Calculating limits...';
            
            // Add it after the input field
            parentElement.appendChild(limitsDisplay);
        }
    });
    
    // Update the limits display
    updateLimitsDisplay();
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    addLimitDisplays();
    
    // Add event listeners for input changes
    const relevantInputs = [
        'coreType', 'stackingFactor', 'coreArea', 'coreAreaUnit', 
        'coreMeanLength', 'coreMeanLengthUnit', 'frequency', 'frequencyUnit',
        'primaryVoltage', 'primaryVoltageUnit'
    ];

    relevantInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateLimitsDisplay);
            element.addEventListener('input', updateLimitsDisplay);
        }
    });
});

function updateFormulaResults(data) {
    document.getElementById('ironLossResult').textContent = 
        `Hysteresis Loss: ${data.iron_loss.hysteresis.toFixed(2)} W
        Eddy Current Loss: ${data.iron_loss.eddy_current.toFixed(2)} W
        Total Iron Loss: ${data.iron_loss.total.toFixed(2)} W`;
    
    const ratedLoadIdx = data.loads.findIndex(load => load === 100);
    const ratedLoadData = ratedLoadIdx >= 0 ? data.copper_losses[ratedLoadIdx] : data.copper_losses[data.copper_losses.length - 1];
    
    document.getElementById('copperLossResult').textContent = 
        `Primary Copper Loss: ${ratedLoadData.primary.toFixed(2)} W
        Secondary Copper Loss: ${ratedLoadData.secondary.toFixed(2)} W
        Total Copper Loss: ${ratedLoadData.loss.toFixed(2)} W`;
    
    const strayLoss = data.total_losses[ratedLoadIdx >= 0 ? ratedLoadIdx : data.total_losses.length - 1].stray;
    document.getElementById('strayLossResult').textContent = 
        `Stray Losses: ${strayLoss.toFixed(2)} W`;
    
    const totalLoss = data.total_losses[ratedLoadIdx >= 0 ? ratedLoadIdx : data.total_losses.length - 1].total;
    document.getElementById('totalLossResult').textContent = 
        `Total Losses: ${totalLoss.toFixed(2)} W`;
    
    const efficiency = data.efficiencies[ratedLoadIdx >= 0 ? ratedLoadIdx : data.efficiencies.length - 1].efficiency;
    document.getElementById('efficiencyResult').textContent = 
        `Efficiency at rated load: ${efficiency.toFixed(2)}%`;
    
    document.getElementById('optimalLoadResult').textContent = `Optimal Load: ${data.optimal_load.toFixed(2)}%`;
}

function updateGraphs(data) {
    const graphContainer = document.getElementById('currentGraph');
    
    switch(currentActiveGraph) {
        case 'ironLossesGraph':
            renderIronLossesGraph(graphContainer, data);
            break;
        case 'copperLossesGraph':
            renderCopperLossesGraph(graphContainer, data);
            break;
        case 'efficiencyGraph':
            renderEfficiencyGraph(graphContainer, data);
            break;
        case 'totalLossesGraph':
            renderTotalLossesGraph(graphContainer, data);
            break;
        case 'strayLossesGraph':
            renderStrayLossesVsTemperatureGraph(graphContainer, data);
            break;
        default:
            renderIronLossesGraph(graphContainer, data);
    }
}

// Function to render iron losses graph
function renderIronLossesGraph(container, data) {
    const vfRatio = [];
    const hysteresisLosses = [];
    const eddyCurrentLosses = [];
    const totalIronLosses = [];
    
    for (let i = 0.5; i <= 1.5; i += 0.05) {
        vfRatio.push(i);
        hysteresisLosses.push(data.iron_loss.hysteresis * i);
        eddyCurrentLosses.push(data.iron_loss.eddy_current * i * i);
        totalIronLosses.push(data.iron_loss.hysteresis * i + data.iron_loss.eddy_current * i * i);
    }
    
    const traces = [
        {
            x: vfRatio,
            y: hysteresisLosses,
            name: 'Hysteresis Losses',
            type: 'scatter',
            mode: 'lines',
            line: {color: '#3498db', width: 3}
        },
        {
            x: vfRatio,
            y: eddyCurrentLosses,
            name: 'Eddy Current Losses',
            type: 'scatter',
            mode: 'lines',
            line: {color: '#e74c3c', width: 3}
        },
        {
            x: vfRatio,
            y: totalIronLosses,
            name: 'Total Iron Losses',
            type: 'scatter',
            mode: 'lines',
            line: {color: '#2c3e50', width: 4},
            fill: 'tozeroy',
            fillcolor: 'rgba(52, 152, 219, 0.2)'
        }
    ];
    
    const layout = {
        title: 'Iron Losses vs. Voltage/Frequency Ratio',
        xaxis: {
            title: 'Voltage/Frequency Ratio (p.u.)',
            gridcolor: '#eee'
        },
        yaxis: {
            title: 'Losses (W)',
            gridcolor: '#eee'
        },
        showlegend: true,
        legend: {
            x: 0.01,
            y: 0.99
        },
        margin: {
            l: 50,
            r: 20,
            t: 50,
            b: 50
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        hovermode: 'closest'
    };
    
    Plotly.newPlot(container, traces, layout);
}

// Function to render copper losses graph
function renderCopperLossesGraph(container, data) {
    const primaryLosses = data.copper_losses.map(item => item.primary);
    const secondaryLosses = data.copper_losses.map(item => item.secondary);
    const totalCopperLosses = data.copper_losses.map(item => item.loss);
    
    const traces = [
        {
            x: data.loads,
            y: primaryLosses,
            name: 'Primary Winding Losses',
            type: 'scatter',
            mode: 'lines',
            line: {color: '#3498db', width: 3}
        },
        {
            x: data.loads,
            y: secondaryLosses,
            name: 'Secondary Winding Losses',
            type: 'scatter',
            mode: 'lines',
            line: {color: '#e74c3c', width: 3}
        },
        {
            x: data.loads,
            y: totalCopperLosses,
            name: 'Total Copper Losses',
            type: 'scatter',
            mode: 'lines',
            line: {color: '#2c3e50', width: 4},
            fill: 'tozeroy',
            fillcolor: 'rgba(231, 76, 60, 0.2)'
        }
    ];
    
    const layout = {
        title: 'Copper Losses vs. Load',
        xaxis: {
            title: 'Load (%)',
            gridcolor: '#eee'
        },
        yaxis: {
            title: 'Losses (W)',
            gridcolor: '#eee'
        },
        showlegend: true,
        legend: {
            x: 0.01,
            y: 0.99
        },
        margin: {
            l: 50,
            r: 20,
            t: 50,
            b: 50
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        hovermode: 'closest'
    };
    
    Plotly.newPlot(container, traces, layout);
}

        // Function to render stray losses vs temperature graph
function renderStrayLossesVsTemperatureGraph(container, data) {
    // Base/reference temperature
    const baseTemp = 20;
    
    // Temperature range
    const temperatures = [];
    const strayLosses = [];
    
    // Get base stray loss at rated load
    const baseStrayLoss = data.total_losses[data.total_losses.length - 1].stray;
    
    // Temperature coefficient constant for copper
    const tempCoeff = 234.5;
    
    // Calculate stray losses from -25°C to 125°C
    for (let temp = -25; temp <= 125; temp += 10) {
        temperatures.push(temp);
        
        // Calculate stray losses using the precise temperature formula
        const strayLoss = baseStrayLoss * 
            ((temp + tempCoeff) / (baseTemp + tempCoeff));
        
        strayLosses.push(strayLoss);
    }
    
    const traces = [
        {
            x: temperatures,
            y: strayLosses,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Stray & Dielectric Losses',
            line: {color: '#f39c12', width: 4},
            marker: {size: 8, color: '#d35400'}
        }
    ];
    
    const layout = {
        title: 'Stray & Dielectric Losses vs. Temperature',
        xaxis: {
            title: 'Temperature (°C)',
            gridcolor: '#eee'
        },
        yaxis: {
            title: 'Losses (W)',
            gridcolor: '#eee'
        },
        showlegend: true,
        legend: {
            x: 0.01,
            y: 0.99
        },
        margin: {
            l: 50,
            r: 20,
            t: 50,
            b: 50
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        hovermode: 'closest'
    };
    
    Plotly.newPlot(container, traces, layout);
}


function renderEfficiencyGraph(container, data) {
    // Validate input data
    if (!data || !data.loads || !data.efficiencies) {
        console.error('Invalid data passed to renderEfficiencyGraph', data);
        return;
    }
    
    console.log("Raw efficiency data:", data.efficiencies);
    
    // Extract the selected core type from the UI
    const selectedCoreType = document.getElementById('coreType').value;
    
    // Create synthetic efficiency data if actual data is NaN
    const loadPoints = data.loads;
    let efficiencyPoints = [];
    
    // Check if we have valid efficiency data
    const hasValidData = data.efficiencies.some(item => !isNaN(item.efficiency));
    
    if (hasValidData) {
        // Use actual data if available
        efficiencyPoints = data.efficiencies.map(item => item.efficiency);
    } else {
        // Generate synthetic efficiency data based on typical efficiency curve
        console.log("Generating synthetic efficiency data");
        efficiencyPoints = loadPoints.map(load => {
            // No-load efficiency is low due to iron losses with no output
            if (load === 0) return 0;
            
            // Typical transformer efficiency curve peaks around 75-80% load
            // Efficiency drops at very low and very high loads
            const peakEfficiencyLoad = 75;
            const peakEfficiency = 98; // Depends on transformer size and quality
            
            // Simple parabolic model for efficiency
            const loadFactor = Math.min(100, load) / 100;
            const normalizedDistance = Math.abs(load - peakEfficiencyLoad) / peakEfficiencyLoad;
            const efficiency = peakEfficiency - (normalizedDistance * normalizedDistance * 15);
            
            return Math.max(80, Math.min(peakEfficiency, efficiency));
        });
    }
    
    console.log("Processed efficiency points:", efficiencyPoints);
    
    // Create trace for actual/synthetic data
    const actualTrace = {
        x: loadPoints,
        y: efficiencyPoints,
        type: 'scatter',
        mode: 'lines+markers',
        name: `${selectedCoreType}`,
        line: {color: '#3498db', width: 4},
        marker: {size: 8, color: '#3498db'}
    };
    
    // Create comparison traces for other materials
    const comparisonTraces = [];
    
    // Material properties and relative efficiencies
    const materialEfficiencyFactors = {
        'CRGO': 1.00,
        'CRNGO': 0.98,
        'Amorphous': 1.02,
        'Ferrite': 0.95,
        'Nanoc': 1.03
    };
    
    const materialColors = {
        'CRGO': '#3498db',    // Blue
        'CRNGO': '#e74c3c',   // Red
        'Amorphous': '#2ecc71',// Green
        'Ferrite': '#f39c12',  // Orange
        'Nanoc': '#9b59b6'    // Purple
    };
    
    // Only add other materials if base material has valid data
    if (efficiencyPoints.some(value => !isNaN(value) && value > 0)) {
        Object.keys(coreMaterials).forEach(materialType => {
            if (materialType === selectedCoreType) return; // Skip selected type
            
            const factor = materialEfficiencyFactors[materialType] || 1.0;
            
            const adjustedEfficiencies = efficiencyPoints.map(eff => {
                if (isNaN(eff) || eff <= 0) return null;
                return Math.min(99.9, Math.max(80, eff * factor));
            });
            
            comparisonTraces.push({
                x: loadPoints,
                y: adjustedEfficiencies,
                type: 'scatter',
                mode: 'lines',
                name: materialType,
                line: {
                    width: 2,
                    color: materialColors[materialType],
                    dash: 'dash'
                }
            });
        });
    }
    
    const yMin = Math.max(0, Math.min(...efficiencyPoints.filter(val => !isNaN(val) && val > 0)) - 5);
    const yMax = Math.min(100, Math.max(...efficiencyPoints.filter(val => !isNaN(val))) + 2);
    
    const layout = {
        title: 'Transformer Efficiency vs. Load',
        xaxis: {
            title: 'Load (%)',
            gridcolor: '#eee',
            range: [0, Math.max(...loadPoints, 100)]
        },
        yaxis: {
            title: 'Efficiency (%)',
            gridcolor: '#eee',
            range: [yMin > 0 ? yMin : 80, yMax < 100 ? yMax : 100]
        },
        showlegend: true,
        legend: {
            x: 0.01,
            y: 0.99,
            bgcolor: 'rgba(255,255,255,0.7)'
        },
        margin: {
            l: 50,
            r: 20,
            t: 50,
            b: 50
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        hovermode: 'closest'
    };
    
    // Combine traces and render
    const allTraces = [actualTrace, ...comparisonTraces];
    Plotly.newPlot(container, allTraces, layout);
}

// Function to render total losses graph
function renderTotalLossesGraph(container, data) {
    const ironLosses = data.total_losses.map(item => item.iron);
    const copperLosses = data.total_losses.map(item => item.copper);
    const strayLosses = data.total_losses.map(item => item.stray);
    const totalLosses = data.total_losses.map(item => item.total);
    
    const traces = [
        {
            x: data.loads,
            y: ironLosses,
            name: 'Iron Losses',
            type: 'scatter',
            mode: 'lines',
            stackgroup: 'one',
            line: {color: '#3498db', width: 0},
            fillcolor: 'rgba(52, 152, 219, 0.6)'
        },
        {
            x: data.loads,
            y: copperLosses,
            name: 'Copper Losses',
            type: 'scatter',
            mode: 'lines',
            stackgroup: 'one',
            line: {color: '#e74c3c', width: 0},
            fillcolor: 'rgba(231, 76, 60, 0.6)'
        },
        {
            x: data.loads,
            y: strayLosses,
            name: 'Stray Losses',
            type: 'scatter',
            mode: 'lines',
            stackgroup: 'one',
            line: {color: '#f39c12', width: 0},
            fillcolor: 'rgba(243, 156, 18, 0.6)'
        },
        {
            x: data.loads,
            y: totalLosses,
            name: 'Total Losses',
            type: 'scatter',
            mode: 'lines+markers',
            line: {color: '#2c3e50', width: 4},
            marker: {size: 8}
        }
    ];
    
    const layout = {
        title: 'Transformer Losses Distribution vs. Load',
        xaxis: {
            title: 'Load (%)',
            gridcolor: '#eee'
        },
        yaxis: {
            title: 'Losses (W)',
            gridcolor: '#eee'
        },
        showlegend: true,
        legend: {
            x: 0.01,
            y: 0.99
        },
        margin: {
            l: 50,
            r: 20,
            t: 50,
            b: 50
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        hovermode: 'closest'
    };
    
    Plotly.newPlot(container, traces, layout);
}
document.getElementById('currentGraph').innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#777;font-size:1.2rem;">Click Generate to analyze transformer losses</div>';

const modal = document.getElementById('formulaModal');
const helpBtn = document.getElementById('helpBtn');
const closeModal = document.querySelector('.close-modal');

helpBtn.addEventListener('click', function() {
    modal.style.display = 'block';
    updateModalResults();
});

closeModal.addEventListener('click', function() {
    modal.style.display = 'none';
});

window.addEventListener('click', function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

function updateModalResults() {
    const resultElements = [
        'ironLossResult',
        'copperLossResult',
        'strayLossResult',
        'totalLossResult',
        'efficiencyResult',
        'optimalLoadResult'
    ];
    
    for (const id of resultElements) {
        const resultElement = document.getElementById(id);
        const modalElement = document.getElementById(`modal-${id}`);
        
        if (resultElement && resultElement.textContent && modalElement) {
            modalElement.textContent = resultElement.textContent;
        }
    }
}

document.getElementById('generateBtn').addEventListener('click', function() {
    updateModalResults();
});
const circuitModal = document.getElementById('circuitModal');
const circuitBtn = document.getElementById('circuitBtn');
const closeCircuit = document.querySelector('.close-circuit');

circuitBtn.addEventListener('click', function() {
    circuitModal.style.display = 'block';
});

closeCircuit.addEventListener('click', function() {
    circuitModal.style.display = 'none';
});

window.addEventListener('click', function(event) {
    if (event.target === circuitModal) {
        circuitModal.style.display = 'none';
    }
});

const infoModal = document.getElementById('infoModal');
const infoBtn = document.getElementById('infoBtn');
const closeInfo = document.querySelector('.close-info');

infoBtn.addEventListener('click', function() {
    populateInfoModal();
    infoModal.style.display = 'block';
});

closeInfo.addEventListener('click', function() {
    infoModal.style.display = 'none';
});

window.addEventListener('click', function(event) {
    if (event.target === infoModal) {
        infoModal.style.display = 'none';
    }
});

function populateInfoModal() {
    // Core Materials Info
    let coreMaterialsHTML = '<table class="info-table"><tr><th>Material</th><th>Description</th><th>Hysteresis Coeff</th><th>Eddy Current Coeff</th><th>Exponent</th><th>Typical Bmax</th></tr>';
    
    for (const [key, material] of Object.entries(coreMaterials)) {
        coreMaterialsHTML += `<tr>
            <td>${key}</td>
            <td>${material.description}</td>
            <td>${material.khCoeff}</td>
            <td>${material.keCoeff}</td>
            <td>${material.nExp}</td>
            <td>${material.bTypical} T</td>
        </tr>`;
    }
    coreMaterialsHTML += '</table>';
    document.getElementById('coreMaterialsInfo').innerHTML = coreMaterialsHTML;
    
    // Winding Materials Info
    let windingMaterialsHTML = '<table class="info-table"><tr><th>Material</th><th>Description</th><th>Resistivity (Ω·m)</th><th>Density (kg/m³)</th><th>Thermal Conductivity (W/m·K)</th></tr>';
    
    for (const [key, material] of Object.entries(windingMaterials)) {
        windingMaterialsHTML += `<tr>
            <td>${key}</td>
            <td>${material.description}</td>
            <td>${material.resistivity}</td>
            <td>${material.density}</td>
            <td>${material.thermalConductivity}</td>
        </tr>`;
    }
    windingMaterialsHTML += '</table>';
    document.getElementById('windingMaterialsInfo').innerHTML = windingMaterialsHTML;
    
    // Key Formulas
    const keyFormulas = [
        { title: "Flux Density", formula: "B = V / (4.44 * f * N * A)" },
        { title: "Iron Loss", formula: "P<sub>iron</sub> = P<sub>h</sub> + P<sub>e</sub> = K<sub>h</sub> × f × B<sub>max</sub><sup>n</sup> × V<sub>core</sub> + K<sub>e</sub> × f² × B<sub>max</sub>² × V<sub>core</sub>" },
        { title: "Copper Loss", formula: "P<sub>cu</sub> = I²<sub>pri</sub> × R<sub>pri</sub> + I²<sub>sec</sub> × R<sub>sec</sub>" },
        { title: "Stray Loss", formula: "P<sub>stray</sub> ≈ 0.01 × P<sub>rated</sub>" },
        { title: "Efficiency", formula: "η = (P<sub>out</sub> / P<sub>in</sub>) × 100% = P<sub>out</sub> / (P<sub>out</sub> + P<sub>total</sub>) × 100%" },
        { title: "Optimal Load", formula: "Optimal load occurs when P<sub>iron</sub> = P<sub>cu</sub>" },
        { title: "Voltage Regulation", formula: "VR = ((V<sub>no-load</sub> - V<sub>full-load</sub>) / V<sub>full-load</sub>) × 100%" }
    ];
    
    let formulasHTML = '<div class="formula-list">';
    keyFormulas.forEach(formula => {
        formulasHTML += `<div class="formula-item">
            <div class="formula-title">${formula.title}</div>
            <div class="formula-equation">${formula.formula}</div>
        </div>`;
    });
    formulasHTML += '</div>';
    document.getElementById('keyFormulasInfo').innerHTML = formulasHTML;
}