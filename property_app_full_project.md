# Property Web-App Complete Project File

## 1. Project Requirements (from rough srs.txt)
*   **Data Fields:** The app must track plot no, size, gaj, rate, and amount[cite: 1].
*   **Color Status Coding:** Status colors are mapped as booked (yellow clr), sold out (red clr), villa (green clr), corner (pink clr), and normal (white clr)[cite: 1].
*   **Visuals & Information:** The UI must be interactive and display the logo of colony, contact details, TNC, and benefits of colony[cite: 1].
*   **Management:** It requires an admin panel (handled via Google Sheets in this architecture)[cite: 1].

---

## 2. Architecture & Tech Stack (100% Free)
*   **Database & Admin Panel:** Google Sheets (Published to Web as CSV).
*   **Frontend:** HTML, CSS, JavaScript (Vanilla JS).
*   **Hosting:** GitHub Pages.
*   **Map Interactivity:** ImageMap.net for generating clickable `<area>` coordinates over a static map image.

---

## 3. Core Files

### `index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Property Viewer</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <img id="colony-logo" src="YOUR_LOGO_URL.png" alt="Colony Logo" style="max-height: 50px;">
        <h1 id="colony-name">Select a Colony</h1>
        <select id="colony-selector" onchange="renderGrid(this.value)">
            <option value="Colony_1">Colony 1</option>
            <option value="Colony_2">Colony 2</option>
        </select>
    </header>

    <div class="view-toggles">
        <button onclick="showView('grid')">Grid View</button>
        <button onclick="showView('map')">Map View</button>
    </div>

    <main>
        <!-- Grid View -->
        <div id="grid-view" class="view-section active">
            <div id="plot-grid" class="grid-container"></div>
        </div>

        <!-- Map View -->
        <div id="map-view" class="view-section" style="display: none;">
            <p>Click a plot on the map to see details:</p>
            <div class="map-container">
                <img id="colony-map-img" src="YOUR_MAP_IMAGE.jpg" usemap="#image-map" alt="Colony Map">
                
                <!-- Paste your ImageMap.net generated code here -->
                <map name="image-map" id="image-map-coords">
                    <!-- Example of how your generated tags should be modified with onclick -->
                    <area alt="Plot 12" title="Plot 12" href="#" coords="100,100,200,100,200,200,100,200" shape="poly" onclick="handleMapClick(event, '12')">
                    <area alt="Plot 15" title="Plot 15" href="#" coords="210,100,310,100,310,200,210,200" shape="poly" onclick="handleMapClick(event, '15')">
                </map>
            </div>
        </div>
    </main>

    <!-- Plot Details Pop-up (Modal) -->
    <div id="plot-modal" class="modal">
        <div class="modal-content">
            <span class="close-btn" onclick="closeModal()">&times;</span>
            <div id="modal-details">
                <!-- Data injected by JS -->
            </div>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>
```

### `style.css`
```css
body { font-family: Arial, sans-serif; background: #f4f4f9; padding: 20px; }
.view-toggles { margin: 20px 0; }
.grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.plot-card { 
    padding: 15px; 
    border: 1px solid #ccc; 
    border-radius: 8px;
    text-align: center;
    color: #333;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Status Colors */
.status-booked { background-color: #FFD700; } /* Yellow */
.status-sold { background-color: #FF4136; color: white; } /* Red */
.status-villa { background-color: #2ECC40; color: white; } /* Green */
.status-corner { background-color: #FF69B4; color: white; } /* Pink */
.status-normal { background-color: #FFFFFF; } /* White */

/* Modal (Background) */
.modal {
    display: none; 
    position: fixed; 
    z-index: 1000; 
    left: 0;
    top: 0;
    width: 100%; 
    height: 100%; 
    background-color: rgba(0,0,0,0.6); 
}

/* Modal Content Box */
.modal-content {
    background-color: #fefefe;
    margin: 15% auto; 
    padding: 20px;
    border: 1px solid #888;
    border-radius: 8px;
    width: 80%; 
    max-width: 400px;
    text-align: center;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

/* Close Button */
.close-btn {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
}

.close-btn:hover,
.close-btn:focus {
    color: #000;
    text-decoration: none;
}

.modal-status-badge {
    display: inline-block;
    padding: 5px 15px;
    border-radius: 20px;
    font-weight: bold;
    margin-top: 10px;
}
```

### `app.js`
```javascript
const sheetCSVUrl = 'YOUR_GOOGLE_SHEET_CSV_URL_HERE';
let globalPlots = []; 

async function fetchPlotData() {
    const response = await fetch(sheetCSVUrl);
    const data = await response.text();
    const rows = data.split('\n').slice(1); 
    
    globalPlots = rows.map(row => {
        const cols = row.split(',');
        return {
            colonyId: cols[0],
            plotNo: cols[1],
            size: cols[2],
            gaj: cols[3],
            rate: cols[4],
            amount: cols[5],
            status: cols[6]?.trim().toLowerCase()
        };
    });
    
    renderGrid('Colony_1'); 
}

function renderGrid(colonyId) {
    const grid = document.getElementById('plot-grid');
    grid.innerHTML = ''; 

    const colonyPlots = globalPlots.filter(p => p.colonyId === colonyId);

    colonyPlots.forEach(plot => {
        const card = document.createElement('div');
        let statusClass = getStatusClass(plot.status);

        card.className = `plot-card ${statusClass}`;
        card.innerHTML = `
            <h3>Plot ${plot.plotNo}</h3>
            <p>${plot.gaj} Gaj</p>
            <p>₹${plot.amount}</p>
        `;
        grid.appendChild(card);
    });
}

function getStatusClass(status) {
    if (status === 'booked') return 'status-booked';
    if (status === 'sold' || status === 'sold out') return 'status-sold';
    if (status === 'villa') return 'status-villa';
    if (status === 'corner') return 'status-corner';
    return 'status-normal';
}

function showView(view) {
    document.getElementById('grid-view').style.display = view === 'grid' ? 'block' : 'none';
    document.getElementById('map-view').style.display = view === 'map' ? 'block' : 'none';
}

function handleMapClick(event, plotNumber) {
    event.preventDefault(); 
    const plotData = globalPlots.find(p => p.plotNo === plotNumber);
    
    if (plotData) {
        openModal(plotData);
    } else {
        alert("Plot data not found! Please check if plot number matches the spreadsheet.");
    }
}

function openModal(plot) {
    const modal = document.getElementById('plot-modal');
    const modalDetails = document.getElementById('modal-details');
    const statusClass = getStatusClass(plot.status);
    
    modalDetails.innerHTML = `
        <h2>Plot ${plot.plotNo}</h2>
        <p><strong>Size:</strong> ${plot.size}</p>
        <p><strong>Area:</strong> ${plot.gaj} Gaj</p>
        <p><strong>Rate:</strong> ₹${plot.rate} / Gaj</p>
        <p><strong>Total Amount:</strong> ₹${plot.amount}</p>
        <div class="modal-status-badge ${statusClass}">
            Status: ${plot.status.toUpperCase()}
        </div>
    `;
    
    modal.style.display = "block";
}

function closeModal() {
    document.getElementById('plot-modal').style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById('plot-modal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

fetchPlotData();
```