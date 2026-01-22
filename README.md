# 🦷 DentalCloud

**A Professional Dental Practice Management System for streamlined patient care and clinical record-keeping.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge&logo=netlify)](https://dentalcloudbythuta.netlify.app/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

---

## 📖 Project Overview
**DentalCloud** is a full-stack clinical management platform designed to digitize dental practice workflows. Built with a focus on high-density data storage and real-time synchronization, it allows practitioners to manage patient profiles, track complex dental procedures, and monitor billing through a clean, intuitive interface.

### 🔗 [Launch Live Application](https://dentalcloudbythuta.netlify.app/)

---

## 🛠 Tech Stack

* **Frontend:** React.js (State management, Hooks, Responsive UI)
* **Backend & Auth:** Supabase (Backend-as-a-Service)
* **Database:** PostgreSQL (Relational data modeling & specialized indexing)
* **Hosting:** Netlify (Continuous Deployment)

---

## 🚀 Key Features

* **Clinical Record Management:** Comprehensive tracking of patient visits and history.
* **Tooth-Level Specificity:** Specialized data arrays to track treatments on specific teeth (ISO/FDI standard support).
* **Financial Tracking:** Integrated billing system to manage treatment costs and payments.
* **Data Efficiency:** Engineered for scalability, utilizing an optimized PostgreSQL schema capable of handling ~2.2 million records per 500MB of storage.
* **Real-time Updates:** Instant data persistence and retrieval powered by Supabase.

---

## 🏛 Database Architecture

The system is optimized for relational integrity and storage efficiency. Below is an example of the structured data model used for treatment records:

```json
{
  "idx": 0,
  "id": "15c5057a-a004-4460-9541-77756f5a7add",
  "patient_id": "a1be5090-7af8-4ded-9204-17d5454d12a3",
  "teeth": ["18", "17"],
  "description": "Root Canal Therapy",
  "cost": "850",
  "date": "2026-01-19",
  "created_at": "2026-01-19T14:58:40Z"
}

```markdown
---

## ⚙️ Local Development

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/MinThutaSawNaing/DentalCloud-by-Thuta.git](https://github.com/MinThutaSawNaing/DentalCloud-by-Thuta.git)
    cd DentalCloud-by-Thuta
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    REACT_APP_SUPABASE_URL=your_supabase_url
    REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Launch:**
    ```bash
    npm start
    ```

---

## 👨‍💻 Author
**Min Thuta Saw Naing**
* GitHub: [@MinThutaSawNaing](https://github.com/MinThutaSawNaing)
* Project Link: [DentalCloud](https://dentalcloudbythuta.netlify.app/)

---
*This project was developed as a showcase of full-stack engineering capabilities, focusing on cloud-native architecture and optimized relational database design.*