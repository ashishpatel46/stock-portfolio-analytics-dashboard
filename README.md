# 📊 Stock Portfolio Analytics Dashboard

A full-stack investment portfolio analytics dashboard built with **Node.js/Express** (backend) and **React.js + Material-UI + Chart.js** (frontend).  
It provides investors with a comprehensive, interactive view of their portfolio using data loaded from a provided Excel file.

---

## 🚀 Features

### Backend (Node.js + Express)
- Reads **Excel dataset** (`Sample-Portfolio-Dataset-for-Assignment.xlsx`) via [`xlsx`](https://www.npmjs.com/package/xlsx).
- REST API endpoints:
  - `/api/portfolio/holdings` → List of holdings with calculated values, gains/losses.
  - `/api/portfolio/allocation` → Sector and market cap allocation.
  - `/api/portfolio/performance` → Historical portfolio performance vs Nifty 50 & Gold.
  - `/api/portfolio/summary` → Key metrics (total value, gain/loss %, top/worst performer, diversification score, risk level).
- Built-in **CORS** for frontend access.
- Clean JSON responses for easy integration.

### Frontend (React + Material-UI + Chart.js + Axios)
- **Dark/Light mode toggle** (persists via `localStorage`).
- **Holdings table**:
  - Interactive sorting on columns.
  - Search filter.
  - Filter by sector and market cap.
  - Drag-and-drop column reordering (using `react-beautiful-dnd`).
- **Charts**:
  - Pie chart: Sector allocation.
  - Line chart: Performance comparison (Portfolio vs Nifty 50 vs Gold).
- **Export holdings** to Excel.
- **Notifications** for significant gains/losses.
- Fully responsive for mobile & desktop.

---

## 📂 Project Structure

stockDashboard/
│
├── backend/
│ ├── api.js # Node.js Express backend server
│ ├── Sample-Portfolio-Dataset-for-Assignment.xlsx # Excel data file
│ ├── package.json
│
├── frontend/
│ ├── src/
│ │ ├── App.js # Main React app
│ │ ├── index.js
│ ├── package.json
│
└── README.md


---

## 🛠 Technology Stack

- **Backend**: Node.js, Express.js, xlsx, cors
- **Frontend**: React.js, Material-UI, Chart.js, react-chartjs-2, Axios, file-saver, react-beautiful-dnd
- **Data**: Excel file containing portfolio holdings, performance, and allocation.

---

## ⚙️ Installation & Setup

### 1. Clone the repository

---

### 2. Backend Setup
Backend will start at:  
`http://localhost:4000`

---

### 3. Frontend Setup
Frontend will run at:  
`http://localhost:3000`

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/portfolio/holdings` | GET | Returns all holdings with calculated values and gains/losses |
| `/api/portfolio/allocation` | GET | Returns sector and market cap allocation |
| `/api/portfolio/performance` | GET | Returns historical performance and calculated returns |
| `/api/portfolio/summary` | GET | Returns portfolio summary metrics |

---

## 🤖 AI Assistance Documentation

This project was partially generated using AI tools (ChatGPT). Specific contributions include:
- Initial backend API structure and calculation logic.
- Frontend layout with Material-UI and Chart.js integration.
- Enhancements such as dark mode, drag-and-drop columns, export functionality.
- Refactoring for responsiveness and interactivity.

Manually written/customized parts:
- Data parsing from Excel columns to match dataset structure.
- Endpoint URL integration in React.
- Custom sorting/filtering logic.
- Styling refinements.

---

## 📸 Screenshots

<img width="848" height="578" alt="image" src="https://github.com/user-attachments/assets/a26c1c2c-da8c-4d91-8f38-218e7763f306" />


---

## 📌 Notes
- Ensure `cors` is enabled in the backend for successful frontend API calls.
- If using another Excel file, keep the **sheet names and column names consistent** or update parsing code in `backend/api.js`.
- For production, consider environment variables for API URLs and deploy backend & frontend separately or as a combined build.

---

## 📄 License
This project is for educational and demonstration purposes.

---
