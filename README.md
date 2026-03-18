# British Auction Procurement Platform

A high-performance real-time Request For Quotation (RFQ) and dynamic auctioning platform explicitly engineered for Freight and Logistics bidding. The platform enables **Buyers** to generate active commodity shipping requests while allowing multiple **Suppliers** to compete against each other in real-time blind and open auction environments. 

## 🏗️ High-Level Design (HLD)

The system operates across a dual-tier Fullstack architecture anchored by a bidirectional WebSocket communication layer for millisecond-level synchronization.

### System Architecture Diagram

```mermaid
graph TD;
    subgraph "Users & Access"
        Buyer([Buyer \n Procures Freight]):::user
        Supplier([Supplier \n Bids on Freight]):::user
    end

    subgraph "Frontend Edge (Vercel)"
        ViteApp((React SPA \n Vite Build)):::frontend
        ViteRouter[React Router \n SPA Fallback]:::frontend
    end

    subgraph "Backend Compute (Node.js Server)"
        API_Gateway{Express API \n Entry Point}:::backend
        AuthMiddleware(JWT Guard \n Role-Based Auth):::backend
        REST_Controllers>CRUD Operations \n Bids/RFQs/Users]:::backend
        CalcEngine[[Ranking & \n Time Ext. Math]]:::backend
        SocketServer((Socket.io \n Real-Time Engine)):::realtime
    end

    subgraph "Persistence Layer (MongoDB Atlas)"
        DB[(Cloud MongoDB)]:::database
        Models[Mongoose Schemas \n Strict Validation]:::database
    end

    Buyer -- HTTP / WSS --> ViteApp
    Supplier -- HTTP / WSS --> ViteApp

    ViteApp -- "Client Routing" --> ViteRouter

    ViteApp -- "REST HTTP (JSON)" --> API_Gateway
    ViteApp -- "WebSocket (WSS)" <--> SocketServer

    API_Gateway -- "Headers Validate" --> AuthMiddleware
    AuthMiddleware -- "Authorized" --> REST_Controllers
    REST_Controllers -- "Triggers computation" --> CalcEngine
    
    REST_Controllers -- "Mongoose ORM" --> Models
    CalcEngine -- "Mongoose ORM" --> Models
    Models -- "Read/Write" --> DB
    
    CalcEngine -- "System Events \n (Rankings/Time Updates)" --> SocketServer
    REST_Controllers -- "Data Events \n (New Bids/RFQs)" --> SocketServer

    classDef user fill:#64748b,color:#fff,stroke-width:2px;
    classDef frontend fill:#3b82f6,color:#fff,stroke-width:2px;
    classDef backend fill:#10b981,color:#fff,stroke-width:2px;
    classDef realtime fill:#f59e0b,color:#fff,stroke-width:2px;
    classDef database fill:#8b5cf6,color:#fff,stroke-width:2px;
```

### Architectural Layers & Subsystems

#### 1. Presentation Layer (Vite + React)
The client-side interface is an immensely responsive Single Page Application (SPA).
- **State Management:** Utilizes React's native Context API and hook-driven local state to manage complex auction forms, decoupled from backend latency.
- **Routing & Fallbacks:** Driven by `react-router-dom`. In production, Vercel Edge rules transparently redirect deep links back to `index.html` to prevent 404s.
- **UI & Animations:** Employs `framer-motion` for fluid modal popups and layout transitions. Real-time system notifications are cleanly handled non-intrusively via `react-toastify`.

#### 2. API & Business Logic Layer (Node.js + Express)
The synchronous backbone handling strict data validation and RESTful operations.
- **Routing Controllers:** Segregated logic paths (`auth.js`, `bid.js`, `rfq.js`) ensuring single-responsibility handlers.
- **Computation Engine:** Calculates bid rankings, dynamically extends auction deadlines based on temporal thresholds (`triggerWindowMinutes`), and processes financial freight aggregations on the fly.
- **Error Handling:** Centralized Express middleware intercepts MongoDB validation failures and structural syntax errors, normalizing them into readable HTTP responses.

#### 3. Real-Time Event Layer (Socket.io)
The asynchronous pipeline completely eliminating standard HTTP polling drag.
- **Bidirectional Duplex:** Maintains persistent TCP connections with active users.
- **Event Broadcasting:** Instantly emits payload triggers like `newRfq`, `bidsUpdated`, and `newLog` the exact millisecond a database transaction commits, ensuring all observing suppliers and buyers see identical synchronized states.

#### 4. Data Persistence Layer (MongoDB + Mongoose)
A flexible but rigidly validated document-store architecture.
- **Relational Integrity:** Implements normalized relationships using arrays of `ObjectId`s (e.g., embedding User IDs inside RFQs and Bids) mapping to strict Mongoose Schemas.
- **Middleware Hooks:** Uses pre-save hooks (like `bcrypt.genSalt` for passwords) ensuring data mutations are sanitized *before* storage mapping.

#### 5. Security & Authentication Layer
- **Stateless Sessions (JWT):** All API payload requests are guarded by custom `protect` middleware that intercepts, decodes, and validates Bearer tokens on the Authorization header.
- **Role-Based Access Control (RBAC):** API endpoints dynamically verify if the requesting Token belongs to a `BUYER` or a `SUPPLIER`, practically rejecting unauthorized mutations (e.g., a Buyer cannot place a Bid, a Supplier cannot create an RFQ).

---

## 🗄️ Database Schema Design (ER Diagram)

The entire platform pivots on normalized strict relations utilizing `ObjectId` arrays for highly scalable relationships.

```mermaid
erDiagram
    USER ||--o{ RFQ : "creates (Buyer)"
    USER ||--o{ BID : "places (Supplier)"
    RFQ ||--o{ BID : "receives"
    RFQ ||--o{ ACTIVITY_LOG : "generates"
    RFQ ||--o| BID : "awards"

    USER {
        ObjectId _id PK
        String name
        String email UK
        String password "hashed"
        Enum role "BUYER | SUPPLIER"
    }

    RFQ {
        ObjectId _id PK
        String rfqId UK
        String name
        Enum status "Active | Closed | Force Closed"
        Date bidStartDate
        Date currentBidCloseDate
        Date initialBidCloseDate
        Date forcedBidCloseDate
        Date pickupDate
        Number triggerWindowMinutes
        Number extensionDurationMinutes
        Object startLocation
        Object destinationLocation
        Object consignmentDetails
        ObjectId buyerId FK
        ObjectId awardedBidId FK "Nullable"
    }

    BID {
        ObjectId _id PK
        ObjectId rfqId FK
        ObjectId supplierId FK
        String supplierName
        String carrierName
        Number freightCharges
        Number originCharges
        Number destinationCharges
        Number totalAmount
        String transitTime
        String validity
        String rank "cached"
    }

    ACTIVITY_LOG {
        ObjectId _id PK
        ObjectId rfqId FK
        Enum type "NEW_BID | TIME_EXTENSION | STATUS_CHANGE | RFQ_CREATED"
        String message
        Date createdAt
    }
```

---

## 🔄 System Workflows & UML Sequence Diagrams

### 1. Dynamic Bidding & Time Extension Workflow

A fundamental mechanic of the British Auction system is dynamic time extensions. If a bid is placed near the closing time (within the `triggerWindowMinutes`), the auction deadline is automatically extended (by `extensionDurationMinutes`), ensuring suppliers always have a fair chance to counter-bid up until the absolute `forcedBidCloseDate`.

```mermaid
sequenceDiagram
    autonumber
    actor Supplier
    participant Frontend (React)
    participant Backend (Express)
    participant Database (MongoDB)
    participant Socket.io
    actor Viewers (Other Suppliers/Buyer)

    Supplier->>Frontend (React): Submits New Bid (Freight Details)
    Frontend (React)->>Backend (Express): POST /api/bids { rfqId, charges... }
    
    Backend (Express)->>Database (MongoDB): Validate Supplier & RFQ State
    Database (MongoDB)-->>Backend (Express): Return RFQ (Active status)
    
    Backend (Express)->>Backend (Express): Calculate totalAmount & Rank cache
    Backend (Express)->>Database (MongoDB): Save new Bid
    
    alt is within Trigger Window? (e.g. < 10 mins left)
        Backend (Express)->>Backend (Express): Calculate new Close Date (+5 mins)
        alt new Close Date > Forced Close Date
            Backend (Express)->>Database (MongoDB): Cap at Forced Close Date
        else
            Backend (Express)->>Database (MongoDB): Update currentBidCloseDate
        end
        Backend (Express)->>Database (MongoDB): Create ActivityLog (TIME_EXTENSION)
        Backend (Express)->>Socket.io: Emit 'rfqUpdated' event
        Backend (Express)->>Socket.io: Emit 'newLog' event
    end
    
    Backend (Express)->>Database (MongoDB): Create ActivityLog (NEW_BID)
    Backend (Express)->>Socket.io: Emit 'bidsUpdated' event
    Backend (Express)->>Socket.io: Emit 'newLog' event
    
    Socket.io-->>Viewers (Other Suppliers/Buyer): Real-time Broadcast (Bids, Timers, Logs)
    Backend (Express)-->>Frontend (React): 201 Created (Bid data)
```

---

## 🚀 Execution & Deployment

### Local Development
```bash
# Terminal 1: Initialize Backend Node Server
cd backend
npm install
npm run dev

# Terminal 2: Initialize Frontend React Application
cd frontend
npm install
npm run dev
```

### Production Deployment Strategy
1. **Frontend**: Vite bundle compiled and dynamically deployed statically to **Vercel** (`vercel --prod`).
2. **Backend**: Express node process deployed to standard Linux compute clusters (Render, Heroku, AWS Elastic Beanstalk). Environment Variables require `MONGO_URI` injection.
