# Stock.IMS - Inventory Management System

A robust, full-stack Inventory Management System designed to handle complex supply chain operations with a sleek, minimalist user interface inspired by modern editorial designs.

## 🚀 Features

- **Real-Time Dashboard**: Live socket connections provide instant updates on stock movements, order statuses, and system alerts.
- **Role-Based Access Control (RBAC)**: Secure operations with distinct `ADMIN`, `MANAGER`, and `STAFF` roles. Access and actions are strictly enforced on both the frontend UI and backend API.
- **Inventory & Product Management**: Track SKUs across multiple zones and warehouses. Keep tabs on low-stock thresholds and capacity utilization.
- **Order Processing**: Manage Sales and Purchase orders. Line items auto-calculate against stock reserves.
- **Supplier Network**: Maintain supplier records, contact info, lead times, and performance variability metrics.
- **Warehouse Management**: Visualize capacity, storage utilization, and stock distribution across multiple facilities.
- **Reorder Engine**: Predictive analytics and historical demand metrics to auto-suggest or generate critical purchase orders.
- **Editorial UI/UX**: An off-white canvas with warm near-black ink typography (Waldenburg Light and Inter), avoiding noisy saturated colors for a focused, premium workspace.

---

## 📸 Screenshots

*(Add your UI screenshots here!)*

- **Dashboard Overview**
  *(e.g., `![Dashboard Overview](path/to/image.png)`)*
- **Product Management**
- **Supplier Metrics**
- **Order Processing Workflow**

---

## 🛠️ Technology Stack

**Frontend:**
- React 18 + Vite
- React Router DOM for routing
- Chart.js for data visualization
- Socket.io-client for real-time updates
- Lucide React for crisp, scalable iconography
- Context API for state management

**Backend:**
- Node.js + Express
- MongoDB + Mongoose (Data modeling)
- JWT (JSON Web Tokens) & bcryptjs for authentication/authorization
- Socket.io for real-time event broadcasting

---

## 📦 Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB running locally or a MongoDB URI (e.g., MongoDB Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/VedantSinngh/inventory-management.git
   cd inventory-management-system
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory based on `.env.example`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/inventorySystem
   JWT_SECRET=your_super_secret_key
   ```
   *(Optional)* Run the seed script to populate mock data and properly hashed users:
   ```bash
   node fix-passwords.js
   ```
   Start the backend server:
   ```bash
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```
   Start the development server:
   ```bash
   npm run dev
   ```

### Default Login Credentials (if seeded via `fix-passwords.js`)
- **Admin**: `admin@inventory.com` / `admin@123`
- **Manager**: `manager@inventory.com` / `manager@123`
- **Staff**: `staff1@inventory.com` / `staff@123`

---

## 🔒 Security & Roles
The application strictly segregates data modification rights:
- **Staff** can view active inventory, basic supplier info, and process basic order states.
- **Managers** can authorize orders, register facilities, run predictive forecasting, and recalculate supplier metrics.
- **Admins** have unrestricted access, including user management and automated batch-order execution.

---

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
