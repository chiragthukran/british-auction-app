# British Auction Procurement Platform

A high-performance real-time Request For Quotation (RFQ) and dynamic auctioning platform explicitly engineered for Freight and Logistics bidding. The platform enables **Buyers** to generate active commodity shipping requests while allowing multiple **Suppliers** to compete against each other in real-time blind and open auction environments. 

## 🏗️ High-Level Design (HLD)

The system operates across a dual-tier Fullstack architecture anchored by a bidirectional WebSocket communication layer for millisecond-level synchronization.

### System Architecture Diagram

```mermaid
graph TD;
    Client((Web Client \n React & Vite)):::frontend
    Gateway{Node.js + Express API}:::backend
    SocketServer((Socket.io Stream)):::realtime
    DB[(MongoDB Atlas)]:::database

    Client -- REST HTTP (CRUD) --> Gateway
    Client -- WebSocket (WSS) <--> SocketServer
    
    Gateway -- Mongoose ORM --> DB
    Gateway -- Event Triggers --> SocketServer
    
    classDef frontend fill:#3b82f6,color:#fff,stroke-width:2px;
    classDef backend fill:#10b981,color:#fff,stroke-width:2px;
    classDef realtime fill:#f59e0b,color:#fff,stroke-width:2px;
    classDef database fill:#8b5cf6,color:#fff,stroke-width:2px;
```

### Core Architecture Subsystems
1. **Frontend**: Vite-compiled React Application executing dynamic component renders. Styled with curated Vanilla CSS and smooth `framer-motion` layout animations. Modals natively handle user warnings, backed by `react-toastify` for absolute non-blocking WebSocket visual popups.
2. **Backend**: Express container governing absolute schema logic, JWT validation, and heavy mathematical time-extension polling. Secure API Endpoints intercept structural updates through strict `protect` middleware logic.
3. **Database Layer**: MongoDB cluster utilizing strict Mongoose typing, schema validation, and populated object references.
4. **Real-time Pipeline**: Event-driven Socket.io state machine perfectly orchestrating live updates across decoupled React interfaces, mitigating standard HTTP polling drag.

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
