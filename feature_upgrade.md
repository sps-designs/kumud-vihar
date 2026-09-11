# Feature Expansion: Interactive Booking & Status System Guide

This guide provides step-by-step instructions to implement the booking functionality and UI enhancements (based on the reference video) into your existing `index.html`, `app.js`, and `style.css` files.

---

## Step 1: Update the Color Palette & UI Elements (CSS)

We need to enforce the specific color scheme (Booked = Yellow, Sold = Red) and add styling for the new booking form.

**Action:** Open `style.css` and append/update the following code:

```css
/* 1. Update the Status Colors to match the prompt/video */
:root {
    --status-available: #ffffff; /* White card for available */
    --status-booked: #ffd700; /* Solid Yellow */
    --status-sold: #ef4444; /* Solid Red */
    --border-available: #e2e8f0;
}

/* 2. Update the Plot Card Backgrounds based on status */
.plot-card.available { background-color: var(--status-available); border: 1px solid var(--border-available); }
.plot-card.booked { background-color: var(--status-booked); color: #000; border: none; }
.plot-card.sold { background-color: var(--status-sold); color: #fff; border: none; }

/* 3. Booking Form Styles (New) */
.booking-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
}
.form-group {
    display: flex;
    flex-direction: column;
    text-align: left;
}
.form-group label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
}
.form-group input, .form-group select {
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-family: inherit;
}
.btn-primary {
    background-color: var(--brand-primary);
    color: white;
    padding: 1rem;
    border: none;
    border-radius: var(--radius-md);
    font-weight: 600;
    cursor: pointer;
    margin-top: 1rem;
}
.btn-primary:hover {
    background-color: #1e293b;
}
```

---

## Step 2: Build the Booking Interface (HTML)

We need to create the modal form where brokers/users can input customer data (Name, Phone, Aadhar, etc.).

**Action:** Open `index.html`. Scroll to the bottom (just above `<script src="app.js"></script>`) and add this new Booking Modal:

```html
<!-- Booking Form Modal -->
<div id="booking-modal" class="modal">
    <div class="modal-content glass-effect" style="max-height: 90vh; overflow-y: auto;">
        <button class="close-btn" onclick="closeBookingModal()" aria-label="Close modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="modal-body">
            <h2 id="booking-plot-title">Book Plot</h2>
            <form id="plot-booking-form" class="booking-form" onsubmit="submitBooking(event)">
                <input type="hidden" id="book-plot-id">

                <div class="form-group">
                    <label>Applicant Name</label>
                    <input type="text" id="book-name" required placeholder="Enter full name">
                </div>

                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" id="book-phone" required placeholder="+91">
                </div>

                <div class="form-group">
                    <label>Address</label>
                    <input type="text" id="book-address" required placeholder="Full residential address">
                </div>

                <div class="form-group">
                    <label>ID Proof (Aadhar Number)</label>
                    <input type="text" id="book-aadhar" required placeholder="12-digit Aadhar number">
                </div>

                <div class="form-group">
                    <label>Payment Mode</label>
                    <select id="book-payment" required>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Online">Online / UPI</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Booking Amount (₹)</label>
                    <input type="number" id="book-amount" required placeholder="Enter advance amount">
                </div>

                <button type="submit" class="btn-primary">Confirm Booking</button>
            </form>
        </div>
    </div>
</div>
```

---

## Step 3: Implement the Interaction Logic (JavaScript)

We need to connect the existing Plot Details modal to the new Booking Form and write the logic that captures the user input and visually updates the plot's status on the grid.

### Action 1: Update the `openModal` function

Open `app.js`. Find your `openModal` function and modify the `modalDetails.innerHTML` assignment to include a "Book Now" button conditionally.

```javascript
// Add this inside the openModal() function, before generating the innerHTML
let actionButton = '';
if (plot.status.toLowerCase() === 'available') {
    actionButton = `<button class="btn-primary" style="width: 100%; margin-top: 1rem;" onclick="openBookingForm('${plot.plotNo}')">Book Now</button>`;
}

modalDetails.innerHTML = `
    /* ... existing detail rows ... */
    <div class="modal-status-badge ${statusClass}">
        ${plot.status}
    </div>
    ${actionButton}
`;
```

### Action 2: Ensure status classes are applied to cards

In your `app.js`, within the `renderGrid` function, update the `card.className` assignment so the new CSS backgrounds apply properly based on status:

```javascript
// Inside renderGrid(colonyId) where the card element is created:
const statusName = plot.status.toLowerCase().replace(' ', '-');
card.className = `plot-card ${typeClass} ${statusName}`;
```

### Action 3: Add the Booking Form Logic

Paste these functions at the very bottom of `app.js`:

```javascript
// Opens the booking form for a specific plot
function openBookingForm(plotNo) {
    // Close the details modal
    closeModal();

    // Setup and open the booking modal
    document.getElementById('booking-plot-title').innerText = `Book Plot ${plotNo}`;
    document.getElementById('book-plot-id').value = plotNo;
    document.getElementById('booking-modal').classList.add('show');
}

// Closes the booking form
function closeBookingModal() {
    document.getElementById('booking-modal').classList.remove('show');
    document.getElementById('plot-booking-form').reset();
}

// Handles form submission, updates data, and refreshes UI
function submitBooking(event) {
    event.preventDefault(); // Prevent page reload

    // 1. Get user input
    // In a real app, send this to your server/database.
    const plotNo = document.getElementById('book-plot-id').value;
    const customerName = document.getElementById('book-name').value;

    // 2. Find the plot in global data and update its status
    const plotIndex = globalPlots.findIndex(p => p.plotNo === plotNo);
    if (plotIndex !== -1) {
        // Change status to Booked
        globalPlots[plotIndex].status = "Booked";

        // Optionally store the customer data inside the object
        globalPlots[plotIndex].customer = customerName;
    }

    // 3. Close modal, alert user, and re-render grid
    closeBookingModal();
    alert(`Success! Plot ${plotNo} has been successfully booked for ${customerName}.`);

    // Refresh the UI to reflect the new Yellow (Booked) status
    const currentColony = document.getElementById('colony-selector').value;
    renderGrid(currentColony);
}
```

---

## How this works for the User/Broker

1. **Explore:** The user views the grid. Sold plots display as Red, Booked as Yellow, and Available plots as default.
2. **Select:** Clicking an "Available" plot opens the details popup.
3. **Action:** The user clicks the new **"Book Now"** button.
4. **Input:** A form appears to enter the client's Name, Phone, Aadhar, and Payment details.
5. **Update:** Upon clicking **"Confirm Booking"**, the script updates the plot's state from "Available" to "Booked", closes the form, and instantly updates the UI, turning that specific plot card Yellow.

> **Important:** The current JavaScript implementation only updates `globalPlots` in memory. A page refresh will lose the booking unless the data is persisted to a backend, JSON file, database, or another storage mechanism.
