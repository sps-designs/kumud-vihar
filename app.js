// --- FIREBASE CLOUD SETUP & IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyC2924sYgBCGnqUS8nBuq7JctARz3dcYwM",
    authDomain: "kumud-vihar.firebaseapp.com",
    projectId: "kumud-vihar",
    storageBucket: "kumud-vihar.firebasestorage.app",
    messagingSenderId: "652514519244",
    appId: "1:652514519244:web:4cd90742c656b7dd027a69",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const ADMIN_EMAIL = "admin@kumudvihar.com";
const auth = getAuth(app);
let currentUser = null;

// Listen for login/logout state changes
onAuthStateChanged(auth, async (user) => {
    // FETCH BROKER DATA
    if (user) {
        try {
            const docRef = doc(db, "brokers", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                user.brokerData = docSnap.data();
            }
        } catch (e) {
            console.error("Failed to fetch broker data", e);
        }
    }
    currentUser = user;
    const authBtn = document.getElementById('auth-btn');
    const userDisplay = document.getElementById('user-display');
    const refBtn = document.getElementById('ref-btn');

    if (authBtn && userDisplay) {
        if (user) {
            authBtn.innerText = "Log Out";
            authBtn.onclick = () => { if (window.handleLogout) window.handleLogout(); else console.error("handleLogout missing"); };
            userDisplay.innerText = user.email;
            userDisplay.style.display = "inline";
            if (refBtn) refBtn.style.display = "inline";
        } else {
            authBtn.innerText = "Broker Login";
            authBtn.onclick = window.showLogin;
            userDisplay.style.display = "none";
            if (refBtn) refBtn.style.display = "none";
        }
    }
});

// Auth UI Functions
window.showLogin = function () {
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-modal').classList.add('show');
}
window.closeLogin = function () {
    document.getElementById('login-modal').classList.remove('show');
    const authForm = document.getElementById('auth-form');
    if(authForm) authForm.reset();
    if (window.switchToLoginView) window.switchToLoginView();
}

let isRegisterMode = false;

// Toggle view to Register New Broker form layout
window.switchToRegisterView = function () {
    isRegisterMode = true;
    document.getElementById('modal-title').innerText = "Register New Broker";

    const container = document.getElementById('form-container');
    container.innerHTML = `
        <form id="auth-form" onsubmit="handleAuthSubmit(event)">
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="reg-name" placeholder="Enter full name" required>
            </div>
            <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" id="reg-phone" placeholder="9876543210" pattern="[0-9]{10}" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="auth-email" placeholder="broker@example.com" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="auth-password" placeholder="Create password (min 6 chars)" required>
            </div>
            
            <button type="submit" class="btn-primary" style="width: 100%; background-color: #dc3545;">Complete Registration</button>
            <button type="button" class="btn-cancel" style="width: 100%; margin-top: 10px;" onclick="switchToLoginView()">Back to Login</button>
        </form>
    `;
}

// Toggle back to normal Login view
window.switchToLoginView = function () {
    isRegisterMode = false;
    document.getElementById('modal-title').innerText = "Broker Login";

    const container = document.getElementById('form-container');
    container.innerHTML = `
        <form id="auth-form" onsubmit="handleAuthSubmit(event)">
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="auth-email" placeholder="broker@example.com" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="auth-password" placeholder="Enter password (min 6 chars)" required>
            </div>
            
            <button type="submit" class="btn-primary" id="main-action-btn" style="width: 100%;">Log In</button>
            <button type="button" class="btn-cancel" style="width: 100%; margin-top: 10px;" onclick="switchToRegisterView()">Register New Broker</button>
        </form>
    `;
}

// Unified Form Handler for Login & Registration
window.handleAuthSubmit = async function (event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorBox = document.getElementById('login-error');
    errorBox.style.display = 'none';

    try {
        if (isRegisterMode) {
            const name = document.getElementById('reg-name').value;
            const phone = document.getElementById('reg-phone').value;

            // 1. Create Firebase Auth account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Save structured record in Firestore under 'brokers' collection
            await setDoc(doc(db, "brokers", user.uid), {
                uid: user.uid,
                name: name,
                phone: phone,
                email: email,
                role: "broker",
                createdAt: new Date().toISOString()
            });

            // 3. Optional: Sync data to Google Sheets via Google Apps Script Webhook URL
            const webhookUrl = "https://script.google.com/macros/s/AKfycbzflUu7nHqVJgezbciB6QPOE5oxaUz5-oLEgejWt7FoxKEmmz1VuNrSBQBK_EN8WFJeww/exec";
            await fetch(webhookUrl, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone, email })
            });

            alert("Registration successful! You are now logged in.");
            window.closeLogin();
        } else {
            // Regular Login
            await signInWithEmailAndPassword(auth, email, password);
            window.closeLogin();
        }
    } catch (err) {
        console.error("Auth Error:", err);
        errorBox.innerText = err.message;
        errorBox.style.display = 'block';
    }
}

// 3. Google Sign-In with Phone/Name Prompt & Sheet Sync
window.handleGoogleLogin = async function () {
    const provider = new GoogleAuthProvider();
    const webhookUrl = "https://script.google.com/macros/s/AKfycbzflUu7nHqVJgezbciB6QPOE5oxaUz5-oLEgejWt7FoxKEmmz1VuNrSBQBK_EN8WFJeww/exec";
    
    // Check if there is an active referral code in the URL (e.g., ?ref=BROKER_UID)
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref') || "Direct";

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userRef = doc(db, "brokers", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Prompt for Name if missing
            let name = user.displayName;
            while (!name || name.trim() === "") {
                name = prompt("Enter your Full Name for Associate Registration:", "");
                if (name === null) return alert("Registration cancelled.");
            }

            // Prompt for 10-digit Phone Number
            let phone = "";
            while (!phone || !/^[0-9]{10}$/.test(phone)) {
                phone = prompt("Enter your 10-digit Phone Number:", "");
                if (phone === null) return alert("Registration cancelled.");
            }

            const brokerData = {
                uid: user.uid,
                name: name,
                phone: phone,
                email: user.email,
                referredBy: refCode, // Tracks the associate chain upline
                totalPlotsSold: 0,
                role: user.email === ADMIN_EMAIL ? "admin" : "broker",
                createdAt: new Date().toISOString()
            };

            // Save to Firestore
            await setDoc(userRef, brokerData);

            // Sync to Google Sheet via Webhook
            await fetch(webhookUrl, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: brokerData.name,
                    phone: brokerData.phone,
                    email: brokerData.email,
                    referredBy: brokerData.referredBy
                })
            });
        }

        console.log("Logged in successfully:", user.email);
        window.closeLogin();
        window.location.reload();
    } catch (err) {
        console.error("Google Auth Error:", err);
        document.getElementById('login-error').innerText = err.message;
        document.getElementById('login-error').style.display = 'block';
    }
}
// Rates configuration
const RATES = {
    "Normal plot": 10000,
    "80ft Main road plot": 15000,
    "60ft corner plot": 11500,
    "30ft corner plot": 11000,
    "Commercial plot": 17000
};

// Mock Data for initial testing using Kumud Vihar format (A-1, etc.)
const initialPlots = [
    {
        "plotNo": "A-1",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30' x 65'",
        "status": "Available",
        "price": "",
        "cx": 1076.19,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "A-2",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30' x 65'",
        "status": "Available",
        "price": "",
        "cx": 1001.13,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "A-3",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30' x 65'",
        "status": "Available",
        "price": "",
        "cx": 937.05,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "A-4",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30\' x 65\'",
        "status": "Available",
        "price": "",
        "cx": 861.99,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "A-5",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30\' x 65\'",
        "status": "Available",
        "price": "",
        "cx": 793.59,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "A-6",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30\' x 65\'",
        "status": "Available",
        "price": "",
        "cx": 718.53,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "A-7",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30' x 65'",
        "status": "Available",
        "price": "",
        "cx": 644.28,
        "cy": 2958.76,
        "w": 24.55,
        "h": 41.59
    },
    {
        "plotNo": "A-8",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30' x 65'",
        "status": "Available",
        "price": "",
        "cx": 569.31,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "A-9",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "80ft Main road plot",
        "gaj": "382.78",
        "size": "382.78",
        "dims": "55' x 62.64'",
        "status": "Available",
        "price": "",
        "cx": 476.61,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "A-10",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "80ft Main road plot",
        "gaj": "286.11",
        "size": "286.11",
        "dims": "50' x 51.5'",
        "status": "Available",
        "price": "",
        "cx": 267.08,
        "cy": 2958.76,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-11",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 287.06,
        "cy": 2854.36,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-12",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 290.84,
        "cy": 2793.34,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-13",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 294.44,
        "cy": 2732.5,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-14",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "30' x 50'",
        "status": "Available",
        "price": "",
        "cx": 298.04,
        "cy": 2671.57,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "A-15",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 302.36,
        "cy": 2598.49,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "A-16",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 305.96,
        "cy": 2537.56,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-17",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 309.56,
        "cy": 2476.72,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-18",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 313.34,
        "cy": 2415.7,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-19",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 316.94,
        "cy": 2354.86,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-20",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 320.54,
        "cy": 2293.84,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-21",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 324.14,
        "cy": 2233.0,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-22",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 327.74,
        "cy": 2172.07,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "A-23",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "50' x 30'",
        "status": "Available",
        "price": "",
        "cx": 331.34,
        "cy": 2111.14,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-24",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "302.50",
        "size": "302.50",
        "dims": "48' x 56.72'",
        "status": "Available",
        "price": "",
        "cx": 481.1,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-25",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 572.54,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-26",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 647.51,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-27",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 721.76,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-28",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 796.82,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-29",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 865.22,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-30",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 940.28,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-31",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 1004.36,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-32",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "55' x 30'",
        "status": "Available",
        "price": "",
        "cx": 1079.42,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-33",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "60ft corner plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1287.68,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-34",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1213.52,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-35",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1153.76,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-36",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1092.02,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-37",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1030.46,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-38",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "30' x 50'",
        "status": "Available",
        "price": "",
        "cx": 969.8,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-39",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "30' x 50'",
        "status": "Available",
        "price": "",
        "cx": 811.22,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-40",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 749.84,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-41",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 690.08,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-42",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 628.16,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-43",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "30' x 50'",
        "status": "Available",
        "price": "",
        "cx": 566.6,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-44",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "219.14",
        "size": "219.14",
        "dims": "41' x 48.1'",
        "status": "Available",
        "price": "",
        "cx": 479.66,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-45",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "230.56",
        "size": "230.56",
        "dims": "50' x 41.5'",
        "status": "Available",
        "price": "",
        "cx": 489.56,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-46",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 566.6,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-47",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 628.16,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-48",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 690.08,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-49",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 749.84,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-50",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "50' x 30'",
        "status": "Available",
        "price": "",
        "cx": 811.22,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-51",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "50' x 30'",
        "status": "Available",
        "price": "",
        "cx": 969.8,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-52",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1030.46,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-53",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1092.02,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-54",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1153.76,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-55",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1213.52,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-56",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "60ft corner plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1287.68,
        "cy": 2452.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-57",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "60ft corner plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1285.52,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-58",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1213.52,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-59",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1153.76,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-60",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1092.02,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-61",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1030.46,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-62",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "30' x 50'",
        "status": "Available",
        "price": "",
        "cx": 971.6,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-63",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "30' x 50'",
        "status": "Available",
        "price": "",
        "cx": 809.42,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-64",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 749.84,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-65",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 690.08,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-66",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 628.16,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-67",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 566.6,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-68",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "202.78",
        "size": "202.78",
        "dims": "38' x 48'",
        "status": "Available",
        "price": "",
        "cx": 495.14,
        "cy": 2280.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-69",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "186.11",
        "size": "186.11",
        "dims": "50' x 33.5'",
        "status": "Available",
        "price": "",
        "cx": 502.88,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-70",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 566.6,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-71",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 628.16,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-72",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 690.08,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-73",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 749.84,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-74",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "50' x 30'",
        "status": "Available",
        "price": "",
        "cx": 809.42,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-75",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "30ft corner plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "50' x 30'",
        "status": "Available",
        "price": "",
        "cx": 970.52,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-76",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1030.46,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-77",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1092.02,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-78",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1153.76,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-79",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1213.52,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "A-80",
        "colonyId": "Colony_1",
        "block": "A",
        "type": "60ft corner plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1285.52,
        "cy": 2135.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-1",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "80ft Main road plot",
        "gaj": "397.22",
        "size": "397.22",
        "dims": "45' x 79.44'",
        "status": "Available",
        "price": "",
        "cx": 2227.29,
        "cy": 2959.48,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "B-2",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30' x 65'",
        "status": "Available",
        "price": "",
        "cx": 2125.77,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "B-3",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30' x 65'",
        "status": "Available",
        "price": "",
        "cx": 2050.71,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "B-4",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30' x 65'",
        "status": "Available",
        "price": "",
        "cx": 1986.63,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "B-5",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30' x 65'",
        "status": "Available",
        "price": "",
        "cx": 1911.57,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "B-6",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30' x 65'",
        "status": "Available",
        "price": "",
        "cx": 1843.17,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "B-7",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "80ft Main road plot",
        "gaj": "216.67",
        "size": "216.67",
        "dims": "30' x 65'",
        "status": "Available",
        "price": "",
        "cx": 1760.19,
        "cy": 2958.76,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "B-8",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "55' x 30'",
        "status": "Available",
        "price": "",
        "cx": 1760.19,
        "cy": 2770.66,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "B-9",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 1843.17,
        "cy": 2770.66,
        "w": 24.37,
        "h": 41.59
    },
    {
        "plotNo": "B-10",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 1914.8,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-11",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 1989.86,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-12",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 2062.76,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-13",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "30' x 55'",
        "status": "Available",
        "price": "",
        "cx": 2139.08,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-14",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "183.33",
        "size": "183.33",
        "dims": "55' x 30'",
        "status": "Available",
        "price": "",
        "cx": 2208.74,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-15",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "OFC",
        "gaj": "213.89",
        "size": "213.89",
        "dims": "55' x 35'",
        "status": "OFC",
        "price": "",
        "cx": 2293.16,
        "cy": 2770.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-16",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "118.06",
        "size": "118.06",
        "dims": "31' x 34.28'",
        "status": "Available",
        "price": "",
        "cx": 2212.61,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-17",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "118.06",
        "size": "118.06",
        "dims": "20' x 53.13'",
        "status": "Available",
        "price": "",
        "cx": 2166.08,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-18",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 2105.06,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-19",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 2044.04,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-20",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1983.02,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-21",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1922.0,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-22",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1860.98,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-23",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1804.46,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-24",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1736.6,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-25",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1674.86,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-26",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1614.2,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-27",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1536.26,
        "cy": 2598.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-28",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1536.26,
        "cy": 2449.45,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-29",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "60ft corner plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1614.2,
        "cy": 2449.45,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-30",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "60ft corner plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1674.86,
        "cy": 2449.45,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-31",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1736.6,
        "cy": 2449.45,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-32",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1804.46,
        "cy": 2449.45,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-33",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "1' x 1250'",
        "status": "Available",
        "price": "",
        "cx": 1860.98,
        "cy": 2449.45,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-34",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1922.0,
        "cy": 2449.45,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-35",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1983.02,
        "cy": 2449.45,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-36",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "20' x 50'",
        "status": "Available",
        "price": "",
        "cx": 2037.2,
        "cy": 2449.45,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-37",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "20' x 50'",
        "status": "Available",
        "price": "",
        "cx": 2085.08,
        "cy": 2449.45,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-38",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "163.89",
        "size": "163.89",
        "dims": "50' x 29.5'",
        "status": "Available",
        "price": "",
        "cx": 2149.52,
        "cy": 2449.45,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-39",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "175.00",
        "size": "175.00",
        "dims": "43' x 36.63'",
        "status": "Available",
        "price": "",
        "cx": 2058.08,
        "cy": 2281.51,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-40",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1981.4,
        "cy": 2281.51,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-41",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1921.64,
        "cy": 2281.51,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-42",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1860.98,
        "cy": 2281.51,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-43",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1804.46,
        "cy": 2281.51,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-44",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1736.6,
        "cy": 2281.51,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-45",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1674.86,
        "cy": 2281.51,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-46",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1614.2,
        "cy": 2281.51,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-47",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1536.26,
        "cy": 2281.51,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "B-48",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1536.26,
        "cy": 2130.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-49",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "60ft corner plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1614.2,
        "cy": 2130.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-50",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "60ft corner plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1674.86,
        "cy": 2130.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-51",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1736.6,
        "cy": 2130.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-52",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1804.46,
        "cy": 2130.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-53",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1860.98,
        "cy": 2130.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-54",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1922.72,
        "cy": 2130.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-55",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "197.22",
        "size": "197.22",
        "dims": "50' x 35.5'",
        "status": "Available",
        "price": "",
        "cx": 2001.74,
        "cy": 2130.22,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-56",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "191.67",
        "size": "191.67",
        "dims": "42' x 41.07'",
        "status": "Available",
        "price": "",
        "cx": 1938.92,
        "cy": 1965.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-57",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1860.98,
        "cy": 1965.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-58",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1804.46,
        "cy": 1965.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-59",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1736.6,
        "cy": 1965.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-60",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1674.86,
        "cy": 1965.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-61",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1614.2,
        "cy": 1965.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-62",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1536.26,
        "cy": 1965.88,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-63",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "60ft corner plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1536.26,
        "cy": 1811.44,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-64",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "60ft corner plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1614.2,
        "cy": 1811.44,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-65",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "3' x 416.67'",
        "status": "Available",
        "price": "",
        "cx": 1674.86,
        "cy": 1811.44,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-66",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1736.6,
        "cy": 1811.44,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-67",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1804.46,
        "cy": 1811.44,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-68",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "20' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1860.98,
        "cy": 1811.44,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-69",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "136.11",
        "size": "136.11",
        "dims": "50' x 24.5'",
        "status": "Available",
        "price": "",
        "cx": 1906.52,
        "cy": 1811.44,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-70",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "130.56",
        "size": "130.56",
        "dims": "30' x 39.17'",
        "status": "Available",
        "price": "",
        "cx": 1860.98,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-71",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "50' x 25'",
        "status": "Available",
        "price": "",
        "cx": 1804.46,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-72",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1736.6,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-73",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1674.86,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-74",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1614.2,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-75",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "212.89",
        "size": "212.89",
        "dims": "40' x 47.9'",
        "status": "Available",
        "price": "",
        "cx": 1536.26,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-76",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "60ft corner plot",
        "gaj": "294.56",
        "size": "294.56",
        "dims": "41' x 64.66'",
        "status": "Available",
        "price": "",
        "cx": 1639.22,
        "cy": 1492.48,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-77",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "60ft corner plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "30' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1736.6,
        "cy": 1492.48,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-78",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "169.44",
        "size": "169.44",
        "dims": "24' x 63.54'",
        "status": "Available",
        "price": "",
        "cx": 1824.08,
        "cy": 1492.48,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-79",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "102.78",
        "size": "102.78",
        "dims": "50' x 18.5'",
        "status": "Available",
        "price": "",
        "cx": 1800.86,
        "cy": 1330.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-80",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1736.6,
        "cy": 1330.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-81",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "294.56",
        "size": "294.56",
        "dims": "41' x 64.66'",
        "status": "Available",
        "price": "",
        "cx": 1639.22,
        "cy": 1330.66,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-82",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "60ft corner plot",
        "gaj": "212.89",
        "size": "212.89",
        "dims": "41' x 46.73'",
        "status": "Available",
        "price": "",
        "cx": 1533.65,
        "cy": 1180.18,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-83",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "60ft corner plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "30' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1624.1,
        "cy": 1180.18,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-84",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "166.67",
        "size": "166.67",
        "dims": "50' x 30'",
        "status": "Available",
        "price": "",
        "cx": 1688.36,
        "cy": 1180.18,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "B-85",
        "colonyId": "Colony_1",
        "block": "B",
        "type": "Normal plot",
        "gaj": "144.44",
        "size": "144.44",
        "dims": "22' x 59.09'",
        "status": "Available",
        "price": "",
        "cx": 1754.06,
        "cy": 1180.18,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-1",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 857.06,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "C-2",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 792.98,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "C-3",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 735.56,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "C-4",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 675.62,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "C-5",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "190.56",
        "size": "190.56",
        "dims": "25' x 68.6'",
        "status": "Available",
        "price": "",
        "cx": 609.74,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "C-6",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "190.56",
        "size": "190.56",
        "dims": "35' x 49'",
        "status": "Available",
        "price": "",
        "cx": 508.22,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "C-7",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "158.33",
        "size": "158.33",
        "dims": "30' x 47.5'",
        "status": "Available",
        "price": "",
        "cx": 508.22,
        "cy": 1882.9,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "C-8",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "178.89",
        "size": "178.89",
        "dims": "35' x 46'",
        "status": "Available",
        "price": "",
        "cx": 508.22,
        "cy": 1810.0,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "C-9",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "178.89",
        "size": "178.89",
        "dims": "25' x 64.4'",
        "status": "Available",
        "price": "",
        "cx": 609.74,
        "cy": 1811.26,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "C-10",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 678.86,
        "cy": 1811.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-11",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 738.8,
        "cy": 1811.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-12",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 796.22,
        "cy": 1811.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-13",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 860.3,
        "cy": 1811.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-14",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 860.3,
        "cy": 1645.03,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-15",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 796.22,
        "cy": 1645.03,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-16",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 738.8,
        "cy": 1645.03,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-17",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 678.86,
        "cy": 1645.03,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-18",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 612.98,
        "cy": 1645.03,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-19",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "230.56",
        "size": "230.56",
        "dims": "43' x 48.26'",
        "status": "Available",
        "price": "",
        "cx": 544.94,
        "cy": 1645.03,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-20",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "213.89",
        "size": "213.89",
        "dims": "37' x 52'",
        "status": "Available",
        "price": "",
        "cx": 547.64,
        "cy": 1493.2,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-21",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 612.98,
        "cy": 1493.2,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-22",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 678.86,
        "cy": 1493.2,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-23",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 738.8,
        "cy": 1493.2,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-24",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 796.22,
        "cy": 1493.2,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-25",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 860.3,
        "cy": 1493.2,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-26",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 860.3,
        "cy": 1325.8,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-27",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 796.22,
        "cy": 1325.8,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-28",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 738.8,
        "cy": 1325.8,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-29",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 678.86,
        "cy": 1325.8,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-30",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 612.98,
        "cy": 1325.8,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-31",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "186.11",
        "size": "186.11",
        "dims": "50' x 33.5'",
        "status": "Available",
        "price": "",
        "cx": 557.9,
        "cy": 1325.8,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-32",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "169.44",
        "size": "169.44",
        "dims": "29' x 52.58'",
        "status": "Available",
        "price": "",
        "cx": 557.27,
        "cy": 1178.47,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-33",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 612.98,
        "cy": 1178.47,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-34",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 678.86,
        "cy": 1178.47,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-35",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 738.8,
        "cy": 1178.47,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-36",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 796.22,
        "cy": 1178.47,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-37",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 860.3,
        "cy": 1178.47,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-38",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 860.3,
        "cy": 1009.54,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-39",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 796.22,
        "cy": 1009.54,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-40",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 738.8,
        "cy": 1009.54,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-41",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "198.33",
        "size": "198.33",
        "dims": "50' x 35.7'",
        "status": "Available",
        "price": "",
        "cx": 678.86,
        "cy": 1009.54,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-42",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "198.33",
        "size": "198.33",
        "dims": "35' x 51'",
        "status": "Available",
        "price": "",
        "cx": 569.42,
        "cy": 1009.54,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-43",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "163.33",
        "size": "163.33",
        "dims": "50' x 29.4'",
        "status": "Available",
        "price": "",
        "cx": 569.42,
        "cy": 931.69,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-44",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "182.78",
        "size": "182.78",
        "dims": "35' x 47'",
        "status": "Available",
        "price": "",
        "cx": 573.92,
        "cy": 857.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-45",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "50' x 25'",
        "status": "Available",
        "price": "",
        "cx": 678.86,
        "cy": 862.84,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-46",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 738.8,
        "cy": 862.84,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-47",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 796.22,
        "cy": 862.84,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-48",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 860.3,
        "cy": 862.84,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-49",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "150.00",
        "size": "150.00",
        "dims": "45' x 30'",
        "status": "Available",
        "price": "",
        "cx": 860.84,
        "cy": 695.08,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-50",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "133.33",
        "size": "133.33",
        "dims": "40' x 30'",
        "status": "Available",
        "price": "",
        "cx": 860.84,
        "cy": 580.96,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-51",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "113.47",
        "size": "113.47",
        "dims": "38' x 26.87'",
        "status": "Available",
        "price": "",
        "cx": 707.84,
        "cy": 594.82,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-52",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "150.00",
        "size": "150.00",
        "dims": "30' x 45'",
        "status": "Available",
        "price": "",
        "cx": 698.12,
        "cy": 697.06,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-53",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "125.00",
        "size": "125.00",
        "dims": "25' x 45'",
        "status": "Available",
        "price": "",
        "cx": 639.8,
        "cy": 697.78,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-54",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "OFC",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "45' x 22.22'",
        "status": "OFC",
        "price": "",
        "cx": 577.88,
        "cy": 693.1,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-55",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "169.44",
        "size": "169.44",
        "dims": "26' x 58.65'",
        "status": "Available",
        "price": "",
        "cx": 414.98,
        "cy": 828.28,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-56",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 411.29,
        "cy": 904.51,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-57",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 407.6,
        "cy": 965.44,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-58",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 404.0,
        "cy": 1026.28,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-59",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 400.4,
        "cy": 1087.3,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-60",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 396.8,
        "cy": 1148.14,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-61",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "194.44",
        "size": "194.44",
        "dims": "35' x 50'",
        "status": "Available",
        "price": "",
        "cx": 390.86,
        "cy": 1210.42,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-62",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "194.44",
        "size": "194.44",
        "dims": "35' x 50'",
        "status": "Available",
        "price": "",
        "cx": 379.16,
        "cy": 1392.49,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-63",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 375.56,
        "cy": 1453.42,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-64",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 371.96,
        "cy": 1514.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-65",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 368.36,
        "cy": 1575.28,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-66",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 364.58,
        "cy": 1637.38,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-67",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 361.16,
        "cy": 1697.14,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-68",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 357.38,
        "cy": 1757.98,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-69",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 353.78,
        "cy": 1818.91,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "C-70",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 350.18,
        "cy": 1879.84,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "C-71",
        "colonyId": "Colony_1",
        "block": "C",
        "type": "30ft corner plot",
        "gaj": "200.00",
        "size": "200.00",
        "dims": "36' x 50'",
        "status": "Available",
        "price": "",
        "cx": 345.86,
        "cy": 1946.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-1",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "20' x 50'",
        "status": "Available",
        "price": "",
        "cx": 909.62,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "D-2",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 967.22,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "D-3",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1028.06,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "D-4",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1086.38,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "D-5",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1150.1,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "D-6",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1209.41,
        "cy": 1963.36,
        "w": 25.0,
        "h": 41.59
    },
    {
        "plotNo": "D-7",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "60ft corner plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1284.38,
        "cy": 1963.36,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "D-8",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "60ft corner plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1284.38,
        "cy": 1811.26,
        "w": 24.82,
        "h": 41.59
    },
    {
        "plotNo": "D-9",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1209.41,
        "cy": 1811.26,
        "w": 25.0,
        "h": 41.59
    },
    {
        "plotNo": "D-10",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1153.34,
        "cy": 1811.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-11",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1089.62,
        "cy": 1811.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-12",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1031.3,
        "cy": 1811.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-13",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 970.46,
        "cy": 1811.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-14",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "20' x 50'",
        "status": "Available",
        "price": "",
        "cx": 912.86,
        "cy": 1811.26,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-15",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "20' x 50'",
        "status": "Available",
        "price": "",
        "cx": 912.86,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-16",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 970.46,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-17",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1031.3,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-18",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1089.62,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-19",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1153.34,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-20",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1212.65,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-21",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "60ft corner plot",
        "gaj": "212.89",
        "size": "212.89",
        "dims": "50' x 38.32'",
        "status": "Available",
        "price": "",
        "cx": 1287.62,
        "cy": 1646.74,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-22",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "60ft corner plot",
        "gaj": "294.56",
        "size": "294.56",
        "dims": "41' x 64.66'",
        "status": "Available",
        "price": "",
        "cx": 1203.2,
        "cy": 1493.56,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-23",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1089.62,
        "cy": 1493.56,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-24",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1031.3,
        "cy": 1493.56,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-25",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 970.46,
        "cy": 1493.56,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-26",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "20' x 50'",
        "status": "Available",
        "price": "",
        "cx": 912.86,
        "cy": 1493.56,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-27",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "20' x 50'",
        "status": "Available",
        "price": "",
        "cx": 912.86,
        "cy": 1327.69,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "D-28",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 970.46,
        "cy": 1327.69,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "D-29",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1031.3,
        "cy": 1327.69,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "D-30",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1089.62,
        "cy": 1327.69,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "D-31",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "60ft corner plot",
        "gaj": "294.56",
        "size": "294.56",
        "dims": "41' x 64.66'",
        "status": "Available",
        "price": "",
        "cx": 1167.2,
        "cy": 1327.69,
        "w": 25.89,
        "h": 41.41
    },
    {
        "plotNo": "D-32",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "60ft corner plot",
        "gaj": "212.89",
        "size": "212.89",
        "dims": "40' x 47.9'",
        "status": "Available",
        "price": "",
        "cx": 1294.82,
        "cy": 1180.18,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-33",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1212.65,
        "cy": 1180.18,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-34",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1153.34,
        "cy": 1180.18,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-35",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1089.62,
        "cy": 1180.18,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-36",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1031.3,
        "cy": 1180.18,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-37",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 970.46,
        "cy": 1180.18,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-38",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "20' x 50'",
        "status": "Available",
        "price": "",
        "cx": 912.86,
        "cy": 1180.18,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-39",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "20' x 50'",
        "status": "Available",
        "price": "",
        "cx": 912.86,
        "cy": 1010.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-40",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 970.46,
        "cy": 1010.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-41",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1031.3,
        "cy": 1010.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-42",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1089.62,
        "cy": 1010.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-43",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1153.34,
        "cy": 1010.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-44",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1212.65,
        "cy": 1010.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-45",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "60ft corner plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1287.62,
        "cy": 1010.62,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-46",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "60ft corner plot",
        "gaj": "222.22",
        "size": "222.22",
        "dims": "40' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1287.62,
        "cy": 864.46,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-47",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1212.65,
        "cy": 864.46,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-48",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1153.34,
        "cy": 864.46,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-49",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1089.62,
        "cy": 864.46,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-50",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 1031.3,
        "cy": 864.46,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-51",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "138.89",
        "size": "138.89",
        "dims": "25' x 50'",
        "status": "Available",
        "price": "",
        "cx": 970.46,
        "cy": 864.46,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-52",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "20' x 50'",
        "status": "Available",
        "price": "",
        "cx": 912.86,
        "cy": 864.46,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-53",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "100.00",
        "size": "100.00",
        "dims": "20' x 45'",
        "status": "Available",
        "price": "",
        "cx": 912.86,
        "cy": 693.82,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-54",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "125.00",
        "size": "125.00",
        "dims": "25' x 45'",
        "status": "Available",
        "price": "",
        "cx": 970.46,
        "cy": 693.82,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-55",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "125.00",
        "size": "125.00",
        "dims": "25' x 45'",
        "status": "Available",
        "price": "",
        "cx": 1031.3,
        "cy": 693.82,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-56",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "125.00",
        "size": "125.00",
        "dims": "25' x 45'",
        "status": "Available",
        "price": "",
        "cx": 1089.62,
        "cy": 693.82,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-57",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "125.00",
        "size": "125.00",
        "dims": "25' x 45'",
        "status": "Available",
        "price": "",
        "cx": 1153.34,
        "cy": 693.82,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-58",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "125.00",
        "size": "125.00",
        "dims": "25' x 45'",
        "status": "Available",
        "price": "",
        "cx": 1212.65,
        "cy": 693.82,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-59",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "60ft corner plot",
        "gaj": "200.00",
        "size": "200.00",
        "dims": "40' x 45'",
        "status": "Available",
        "price": "",
        "cx": 1287.62,
        "cy": 693.82,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-60",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "60ft corner plot",
        "gaj": "177.78",
        "size": "177.78",
        "dims": "40' x 40'",
        "status": "Available",
        "price": "",
        "cx": 1287.62,
        "cy": 580.24,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-61",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "25' x 40'",
        "status": "Available",
        "price": "",
        "cx": 1212.65,
        "cy": 580.24,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-62",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "25' x 40'",
        "status": "Available",
        "price": "",
        "cx": 1153.34,
        "cy": 580.24,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-63",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "25' x 40'",
        "status": "Available",
        "price": "",
        "cx": 1089.62,
        "cy": 580.24,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-64",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "25' x 40'",
        "status": "Available",
        "price": "",
        "cx": 1031.3,
        "cy": 580.24,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-65",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "111.11",
        "size": "111.11",
        "dims": "25' x 40'",
        "status": "Available",
        "price": "",
        "cx": 970.46,
        "cy": 580.24,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-66",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "Normal plot",
        "gaj": "88.89",
        "size": "88.89",
        "dims": "20' x 40'",
        "status": "Available",
        "price": "",
        "cx": 912.86,
        "cy": 580.24,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-67",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "OFC",
        "gaj": "177.78",
        "size": "177.78",
        "dims": "30' x 53.33'",
        "status": "OFC",
        "price": "",
        "cx": 1229.84,
        "cy": 415.54,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-68",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "OFC",
        "gaj": "97.22",
        "size": "97.22",
        "dims": "34' x 25.73'",
        "status": "OFC",
        "price": "",
        "cx": 1297.52,
        "cy": 416.44,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "D-69",
        "colonyId": "Colony_1",
        "block": "D",
        "type": "OFC",
        "gaj": "99.00",
        "size": "99.00",
        "dims": "34' x 26.21'",
        "status": "OFC",
        "price": "",
        "cx": 1347.74,
        "cy": 418.6,
        "w": 25.89,
        "h": 41.59
    },
    {
        "plotNo": "COM-1",
        "colonyId": "Colony_1",
        "block": "COM",
        "type": "Commercial plot",
        "gaj": "1200.00",
        "size": "1200.00",
        "status": "Available",
        "price": "",
        "cx": 1533.6,
        "cy": 2835.0,
        "w": 270.0,
        "h": 360.0,
        "dims": "90' x 120'"
    },
    {
        "plotNo": "COM-2",
        "colonyId": "Colony_1",
        "block": "COM",
        "type": "Commercial plot",
        "gaj": "1066.67",
        "size": "1066.67",
        "status": "Available",
        "price": "",
        "cx": 1159.2,
        "cy": 2835.0,
        "w": 240.0,
        "h": 360.0,
        "dims": "80' x 120'"
    }
];

let globalPlots = [];



// 4. Connect to Cloud - This runs instantly and listens for changes 24/7
const dbRef = doc(db, "projects", "kumud_vihar");


// --- FALLBACK INITIALIZATION ---
const masterPlotTypes = {
    "80ft Main road plot": ["A-1", "A-2", "A-3", "A-4", "A-5", "A-6", "A-7", "A-8", "A-9", "A-10", "B-1", "B-2", "B-3", "B-4", "B-5", "B-6", "B-7"],
    "60ft corner plot": ["A-33", "A-56", "A-57", "A-80", "B-27", "B-28", "B-47", "B-48", "B-62", "B-63", "B-75", "B-76", "B-81", "B-82", "D-7", "D-8", "D-21", "D-22", "D-31", "D-32", "D-45", "D-46", "D-59", "D-60"],
    "30ft corner plot": ["A-38", "A-39", "A-50", "A-51", "A-62", "A-63", "A-74", "A-75", "A-24", "A-44", "A-45", "A-68", "A-69", "A-23", "C-6", "C-8", "C-71", "C-62", "C-19", "C-20", "C-31", "C-32", "C-61", "C-55", "C-42", "C-44", "C-52", "C-49", "C-50"],
    "Commercial plot": ["COM-1", "COM-2"]
};

// Initialize with mock data immediately in case Firebase fails to load or has permission issues
globalPlots = [...initialPlots];



const b23 = globalPlots.find(p => p.plotNo === 'B-23');
if (b23) { b23.dims = "25' x 50'"; b23.size = 138.89; }

const b65 = globalPlots.find(p => p.plotNo === 'B-65');
if (b65) { b65.dims = "25' x 50'"; b65.size = 138.89; }

globalPlots.forEach(plot => {
    if (plot.type === "OFC") return;
    plot.type = "Normal plot";
    for (const [type, plots] of Object.entries(masterPlotTypes)) {
        if (plots.includes(plot.plotNo)) {
            plot.type = type;
        }
    }

    // MATHEMATICAL AUTO-CORRECTOR FOR ALL DIMENSIONS
    if (plot.dims && plot.size) {
        let sizeYds = parseFloat(plot.size);
        let dimsStr = plot.dims.replace(/'/g, '').replace(/"/g, '').replace(/ /g, '').toLowerCase();

        let width = 0;
        if (dimsStr.includes('x')) {
            let parts = dimsStr.split('x');
            width = parseFloat(parts[0]);
            let depth = parseFloat(parts[1]);

            // Allow a small rounding margin
            let expectedSize = (width * depth) / 9.0;
            if (Math.abs(expectedSize - sizeYds) <= 0.5) {
                width = 0; // Skip
            }
        } else {
            width = parseFloat(dimsStr);
        }

        if (width > 0 && sizeYds > 0) {
            let depth = (sizeYds * 9.0) / width;
            if (Math.abs(Math.round(depth) - depth) < 0.05) {
                depth = Math.round(depth);
            } else {
                depth = Math.round(depth * 100) / 100;
            }

            let wStr = Number.isInteger(width) ? width.toString() : width.toFixed(2);
            let dStr = Number.isInteger(depth) ? depth.toString() : depth.toFixed(2);

            plot.dims = `${wStr}' x ${dStr}'`;
        }
    }
});

onSnapshot(dbRef, (docSnap) => {
    if (docSnap.exists()) {
        // If the database has data, download it and render the grid
        globalPlots = docSnap.data().plots;
        window.renderGrid(document.getElementById('colony-selector') ? document.getElementById('colony-selector').value : 'Colony_1');
    } else {
        // First Time Setup: Upload your initial raw data to the cloud
        setDoc(dbRef, { plots: globalPlots });
    }
}, (error) => {
    console.error("Firebase permissions error, falling back to local data:", error);
    // Since we already populated globalPlots above, the grid will still work locally!
});


// 5. Cloud Save Function - This runs anytime a broker clicks Book/Register/Sell
window.saveData = async function () {
    try {
        await setDoc(dbRef, { plots: globalPlots });
        console.log("Saved to Cloud!");
    } catch (e) {
        console.error("Error saving to cloud: ", e);
        alert("Error saving data. Please check your internet connection.");
    }
}







// Formatting helper for currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {

    // Render initial grid for Colony 1
    renderGrid('Colony_1');
    // Removed old getStatusClass since we use type classes now

    // Add applyFilters function
    window.applyFilters = function () {
        renderGrid('Colony_1');
    }
});

function getTypeClass(type) {
    if (type === 'Normal plot') return 'card-normal';
    if (type === '80ft Main road plot') return 'card-main80';
    if (type === '60ft corner plot') return 'card-corner60';
    if (type === '30ft corner plot') return 'card-corner30';
    if (type === 'Commercial plot') return 'card-commercial';
    if (type === 'OFC') return 'card-ofc';
    return 'card-normal';
}

window.renderGrid = function (colonyId) {
    const grid = document.getElementById('plot-grid');
    const sectionFilter = document.getElementById('filter-section') ? document.getElementById('filter-section').value : 'all';
    const typeFilter = document.getElementById('filter-type') ? document.getElementById('filter-type').value : 'all';

    grid.innerHTML = '';

    // Filter plots based on selected colony and filters
    const colonyPlots = globalPlots.filter(p => {
        if (p.colonyId !== colonyId) return false;

        // Filter by section
        if (sectionFilter !== 'all') {
            if (sectionFilter === 'COM') {
                if (!p.plotNo.startsWith('COM-')) return false;
            } else {
                if (!p.plotNo.startsWith(sectionFilter + '-')) return false;
            }
        }

        // Filter by type
        if (typeFilter !== 'all') {
            if (p.type !== typeFilter) return false;
        }

        return true;
    });

    // Sort: A → B → C → D → COM, then numerically within each block
    const BLOCK_ORDER = { A: 0, B: 1, C: 2, D: 3, COM: 4 };
    colonyPlots.sort((a, b) => {
        const [aBlock, aNum] = [a.plotNo.split('-')[0], parseInt(a.plotNo.split('-')[1]) || 999];
        const [bBlock, bNum] = [b.plotNo.split('-')[0], parseInt(b.plotNo.split('-')[1]) || 999];
        const blockDiff = (BLOCK_ORDER[aBlock] ?? 99) - (BLOCK_ORDER[bBlock] ?? 99);
        return blockDiff !== 0 ? blockDiff : aNum - bNum;
    });

    if (colonyPlots.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">No plots match the selected filters.</p>';
        return;
    }

    colonyPlots.forEach(plot => {
        const card = document.createElement('div');
        const typeClass = getTypeClass(plot.type);

        // Calculate amount dynamically based on type and size
        const rate = RATES[plot.type] || 0;
        const amount = rate * parseFloat(plot.gaj);

        const statusName = plot.status.toLowerCase().replace(' ', '-');
        card.className = `plot-card ${typeClass} ${statusName}`;
        // Make the card clickable to open modal
        card.onclick = () => openModal(plot, rate, amount);

        // Map status to badge color directly here
        let badgeColorClass = 'status-available';
        if (plot.status.toLowerCase() === 'booked') badgeColorClass = 'status-booked';
        if (plot.status.toLowerCase() === 'sold' || plot.status.toLowerCase() === 'sold out') badgeColorClass = 'status-sold';

        card.innerHTML = `
            <div class="status-badge ${badgeColorClass}">${plot.status}</div>
            <h3>Plot ${plot.plotNo}</h3>
            <div class="plot-details">
                <span>${plot.gaj} Sq. Yds.</span>
                <span>${plot.dims || plot.size}</span>
            </div>
            <div class="plot-price">${formatCurrency(amount)}</div>
        `;
        grid.appendChild(card);
    });
}

function getModalStatusClass(status) {
    const s = status.toLowerCase();
    if (s === 'booked') return 'modal-booked';
    if (s === 'sold' || s === 'sold out') return 'modal-sold';
    return 'modal-available';
}

window.showView = function (view) {
    // Update active button state
    document.getElementById('btn-grid').classList.toggle('active', view === 'grid');
    document.getElementById('btn-map').classList.toggle('active', view === 'map');

    // Update section visibility
    document.getElementById('grid-view').style.display = view === 'grid' ? 'block' : 'none';
    document.getElementById('map-view').style.display = view === 'map' ? 'block' : 'none';
}

function handleMapClick(event, plotNumber) {
    event.preventDefault();

    // In map view, ensure we look for the plot in the currently selected colony
    const currentColony = document.getElementById('colony-selector').value;
    const plotData = globalPlots.find(p => p.plotNo === plotNumber && p.colonyId === currentColony);

    if (plotData) {
        const rate = RATES[plotData.type] || 0;
        const amount = rate * parseFloat(plotData.gaj);
        openModal(plotData, rate, amount);
    } else {
        alert("Plot data not found! Please check if plot number matches the selected colony.");
    }
}


// Called from <area onclick>
window.handlePlotClick = function (event, plotId) {
    event.preventDefault();
    const plot = globalPlots.find(p => p.plotNo === plotId);
    if (!plot) return;
    const rate = RATES[plot.type] || 0;
    const amount = rate * parseFloat(plot.gaj || plot.size || 150);
    openModal(plot, rate, amount);
}

window.openModal = function (plot, rate, amount) {
    const modal = document.getElementById('plot-modal');
    const modalDetails = document.getElementById('modal-details');
    const statusClass = getModalStatusClass(plot.status);

    // --- 1. Strict Workflow Logic for Buttons ---
    let actionButtons = '';
    const currentStatus = plot.status.toLowerCase();

    if (currentUser) { // ONLY SHOW BUTTONS IF LOGGED IN
        if (currentStatus === 'available') {
            actionButtons = `<button class="btn-primary" style="width: 100%; margin-top: 0.5rem;" onclick="event.stopPropagation(); window.openBookingForm('${plot.plotNo}')">Book Now</button>`;
        } else if (currentStatus === 'booked') {
            actionButtons = `
                <button class="btn-info" style="width: 100%; margin-top: 0.5rem;" onclick="event.stopPropagation(); window.completeRegistry('${plot.plotNo}')">Complete Registry</button>
                <button class="btn-cancel" style="width: 100%; margin-top: 0.5rem;" onclick="event.stopPropagation(); window.cancelBooking('${plot.plotNo}')">Cancel Booking</button>
            `;
        } else if (currentStatus === 'registered') {
            actionButtons = `<button class="btn-danger" style="width: 100%; margin-top: 0.5rem;" onclick="event.stopPropagation(); window.sellPlot('${plot.plotNo}')">Finalize as Sold</button>`;
        } else if (currentStatus === 'sold' && currentUser && currentUser.email === 'admin@kumudvihar.com') {
            // NEW: Admin override button for sold plots
            actionButtons = `<button class="btn-cancel" style="width: 100%; margin-top: 0.5rem; border-color: red; color: red;" onclick="event.stopPropagation(); window.revertSoldPlot('${plot.plotNo}')">⚠️ Admin: Revert Sale</button>`;
        }
    } else {
        // IF NOT LOGGED IN, SHOW A MESSAGE INSTEAD
        actionButtons = `<div class="modal-status-badge" style="background-color: var(--border-color); color: var(--text-secondary); margin-top: 1rem;">BROKER LOGIN REQUIRED</div>`;
    }

    // --- 2. Extract Buyer Details if they exist ---
    let buyerHTML = '';
    if (plot.buyer && currentUser && currentUser.email === 'admin@kumudvihar.com') {
        buyerHTML = `
            <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
                <h3 style="font-size: 0.9rem; margin-bottom: 0.3rem; color: var(--brand-primary);">Buyer Details</h3>
                <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${plot.buyer.name}</span></div>
                <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${plot.buyer.phone}</span></div>
                <div class="detail-row"><span class="detail-label">Aadhar</span><span class="detail-value">${plot.buyer.aadhar}</span></div>
                <div class="detail-row"><span class="detail-label">Booked On</span><span class="detail-value">${plot.buyer.bookingDate}</span></div>
                <div class="detail-row"><span class="detail-label">Advance Paid</span><span class="detail-value price">${formatCurrency(plot.buyer.bookingAmount)}</span></div>
                ${plot.buyer.brokerName ? `<div class="detail-row"><span class="detail-label">Broker Name</span><span class="detail-value" style="font-weight: 500;">${plot.buyer.brokerName}</span></div>` : ''}
                ${plot.buyer.brokerPhone ? `<div class="detail-row"><span class="detail-label">Broker Phone</span><span class="detail-value" style="font-weight: 500;">${plot.buyer.brokerPhone}</span></div>` : ''}
                ${plot.buyer.brokerEmail ? `<div class="detail-row"><span class="detail-label">Broker Email</span><span class="detail-value" style="font-weight: 500;">${plot.buyer.brokerEmail}</span></div>` : ''}
            </div>
        `;
    }

    // --- 3. Render Modal Content ---
    modalDetails.innerHTML = `
        <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; padding-bottom: 0.25rem;">Plot ${plot.plotNo}</h2>
        
        <div class="detail-row">
            <span class="detail-label">Plot Type</span>
            <span class="detail-value">${plot.type}</span>
        </div>
        
        <div class="detail-row">
            <span class="detail-label">Dimensions</span>
            <span class="detail-value">${plot.dims || plot.size + ' Sq.Yds.'}</span>
        </div>
        
        <div class="detail-row">
            <span class="detail-label">Total Area</span>
            <span class="detail-value">${plot.gaj} Sq. Yds.</span>
        </div>
        
        <div class="detail-row">
            <span class="detail-label">Rate / Sq. Yds.</span>
            <span class="detail-value price">${formatCurrency(rate)}</span>
        </div>
        
        <div class="detail-row" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--border-color);">
            <span class="detail-label" style="font-size: 1.25rem;">Total Value</span>
            <span class="detail-value price" style="font-size: 1.5rem;">${formatCurrency(amount)}</span>
        </div>

        ${buyerHTML}

        <div class="modal-status-badge ${statusClass} ${plot.status.toLowerCase().replace(' ', '-')}">
            ${plot.status}
        </div>
        
        ${actionButtons}
    `;

    modal.classList.add('show');
}

window.closeModal = function () {
    const modal = document.getElementById('plot-modal');
    modal.classList.remove('show');
}

// Close modal when clicking outside of it
window.onclick = function (event) {
    const modal = document.getElementById('plot-modal');
    if (event.target === modal) {
        closeModal();
    }
}

// Close modal on Escape key
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});


// Opens the booking form for a specific plot
window.openBookingForm = function (plotNo) {
    // Close the details modal
    closeModal();

    // Setup and open the booking modal
    document.getElementById('booking-plot-title').innerText = `Book Plot ${plotNo}`;
    document.getElementById('book-plot-id').value = plotNo;
    document.getElementById('booking-modal').classList.add('show');
}

// Closes the booking form
window.closeBookingModal = function () {
    document.getElementById('booking-modal').classList.remove('show');
    document.getElementById('plot-booking-form').reset();
}

// Handles form submission, updates data, and refreshes UI
window.submitBooking = function (event) {
    event.preventDefault();

    const plotNo = document.getElementById('book-plot-id').value;

    // Capture all buyer details from the form
    const buyerDetails = {
        name: document.getElementById('book-name').value,
        phone: document.getElementById('book-phone').value,
        address: document.getElementById('book-address').value,
        aadhar: document.getElementById('book-aadhar').value,
        paymentMode: document.getElementById('book-payment').value,
        bookingAmount: document.getElementById('book-amount').value,
        bookingDate: new Date().toLocaleDateString('en-IN'),
        brokerEmail: currentUser ? currentUser.email : 'Unknown Broker',
        brokerUid: currentUser ? currentUser.uid : null,
        brokerName: (currentUser && currentUser.brokerData) ? currentUser.brokerData.name : (currentUser ? currentUser.displayName || 'Unknown' : 'Unknown'),
        brokerPhone: (currentUser && currentUser.brokerData) ? currentUser.brokerData.phone : 'Unknown'
    };

    const plotIndex = globalPlots.findIndex(p => p.plotNo === plotNo);
    if (plotIndex !== -1) {
        globalPlots[plotIndex].status = "Booked";
        globalPlots[plotIndex].buyer = buyerDetails; // Attach buyer to plot
        saveData(); // Save to local storage
    }

    closeBookingModal();
    alert(`Success! Plot ${plotNo} has been successfully booked for ${buyerDetails.name}.`);

    const currentColony = document.getElementById('colony-selector').value;
    renderGrid(currentColony);
}


// Handles direct sales and converts bookings to sales
window.sellPlot = function (plotNo) {
    // 1. Ask for confirmation before marking as sold
    if (confirm(`Are you sure you want to mark Plot ${plotNo} as SOLD? This action cannot be easily undone.`)) {

        // 2. Find the plot and update its status
        const plotIndex = globalPlots.findIndex(p => p.plotNo === plotNo);
        if (plotIndex !== -1) {
            globalPlots[plotIndex].status = "Sold";
        }

        // 3. Close the modal and re-render the grid
        closeModal();
        const currentColony = document.getElementById('colony-selector') ? document.getElementById('colony-selector').value : 'Colony_1';
        renderGrid(currentColony);
    }
}





// Cancels a booking and reverts the plot to Available
window.cancelBooking = function (plotNo) {
    if (confirm(`Are you sure you want to cancel the booking for Plot ${plotNo}?`)) {
        const plotIndex = globalPlots.findIndex(p => p.plotNo === plotNo);
        if (plotIndex !== -1) {
            globalPlots[plotIndex].status = "Available";
            delete globalPlots[plotIndex].buyer; // Erase buyer info
            if (window.saveData) window.saveData(); // Save to cloud
        }
        if (window.closeModal) window.closeModal();
        if (window.renderGrid) {
            const selector = document.getElementById('colony-selector');
            window.renderGrid(selector ? selector.value : 'Colony_1');
        }
    }
}

// Mark as Registered
window.completeRegistry = function (plotNo) {
    if (confirm(`Has the registry process been completed for Plot ${plotNo}?`)) {
        const plotIndex = globalPlots.findIndex(p => p.plotNo === plotNo);
        if (plotIndex !== -1) {
            globalPlots[plotIndex].status = "Registered";
            if (window.saveData) window.saveData(); // Save to cloud
        }
        if (window.closeModal) window.closeModal();
        if (window.renderGrid) {
            const selector = document.getElementById('colony-selector');
            window.renderGrid(selector ? selector.value : 'Colony_1');
        }
    }
}

// Finalize as Sold
window.sellPlot = function (plotNo) {
    if (confirm(`Are you sure you want to finalize the sale of Plot ${plotNo}?`)) {
        const plotIndex = globalPlots.findIndex(p => p.plotNo === plotNo);
        if (plotIndex !== -1) {
            globalPlots[plotIndex].status = "Sold";
            if (window.saveData) window.saveData(); // Save to cloud
        }
        if (window.closeModal) window.closeModal();
        if (window.renderGrid) {
            const selector = document.getElementById('colony-selector');
            window.renderGrid(selector ? selector.value : 'Colony_1');
        }
    }
}


// Developer Override to fix mistaken sales
window.revertSoldPlot = function (plotNo) {
    const pass = prompt("Admin Override: Enter developer passcode to cancel this sale.");
    if (pass === "0000") {
        if (confirm(`CRITICAL WARNING: Are you sure you want to completely erase the sale record for Plot ${plotNo} and make it Available?`)) {
            const plotIndex = globalPlots.findIndex(p => p.plotNo === plotNo);
            if (plotIndex !== -1) {
                globalPlots[plotIndex].status = "Available";
                delete globalPlots[plotIndex].buyer;
                if (window.saveData) window.saveData();
            }
            if (window.closeModal) window.closeModal();
            if (window.renderGrid) {
                const selector = document.getElementById('colony-selector');
                window.renderGrid(selector ? selector.value : 'Colony_1');
            }
        }
    } else if (pass !== null) {
        alert("Incorrect passcode. Sale not reverted.");
    }
};


// forcing a git update.
window.copyReferralLink = function() {
    if (!currentUser) return;
    const referralLink = `https://kumud-vihar.vercel.app/?ref=${currentUser.uid}`;
    navigator.clipboard.writeText(referralLink).then(() => {
        alert("Referral Link copied to clipboard! Share this with your new recruits.");
    }).catch(err => {
        alert("Failed to copy. Here is your link: " + referralLink);
    });
}

// 3. MLM Associate Chain Commission Engine (1 -> 2 -> 3 -> 4 -> 5)
window.processPlotSale = async function (sellerId, chainArray, plotSizeInSqYards) {
    const totalPoolPerSqYard = 1500;
    const totalPool = totalPoolPerSqYard * plotSizeInSqYards;

    // Direct seller takes 30% of the pool
    const directSellerShare = totalPool * 0.30;
    const remainingPool = totalPool * 0.70;

    console.log(`Direct Seller (${sellerId}) earns: ₹${directSellerShare}`);

    // Fetch lifetime sales weights for upline chain
    let totalUplineSales = 0;
    const uplineSalesMap = {};

    for (let associateId of chainArray) {
        if (associateId === sellerId) continue;
        
        const brokerDoc = await getDoc(doc(db, "brokers", associateId));
        const salesCount = brokerDoc.exists() ? (brokerDoc.data().totalPlotsSold || 1) : 1;
        
        uplineSalesMap[associateId] = salesCount;
        totalUplineSales += salesCount;
    }

    // Distribute remaining 70% proportionally upward through the chain
    for (let associateId of chainArray) {
        if (associateId === sellerId) continue;

        const shareWeight = uplineSalesMap[associateId] / totalUplineSales;
        const uplineShare = remainingPool * shareWeight;
        
        console.log(`Upline Associate (${associateId}) earns proportional share: ₹${uplineShare.toFixed(2)}`);
    }
}


// 4. Logout Handler
window.handleLogout = async function () {
    try {
        await signOut(auth);
        alert("You have been logged out.");
        window.location.reload();
    } catch (err) {
        console.error("Logout Error:", err);
        alert("Failed to log out.");
    }
}
