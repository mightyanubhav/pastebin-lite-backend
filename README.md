🧠 Pastebin Lite — Distributed, Autoscaling System (From First Principles)

This project is a Pastebin-like application built to deeply understand and demonstrate how real distributed systems work internally, rather than relying on managed platforms like Kubernetes, NGINX, or cloud load balancers.

Instead of using these systems, this project reimplements their core ideas:

Load balancing

Service discovery

Autoscaling

Rate limiting (local + global)

Caching hot data

Health checks & graceful shutdown

Fault tolerance

🎯 What This Project Solves

At a high level, the system supports:

Creating and reading text pastes

Handling traffic spikes automatically

Scaling backend services horizontally

Protecting the system from abuse

Ensuring high availability and stability

But the real goal is to show how this is achieved internally.

🧱 High-Level Architecture
Clients (Browser / curl)
        │
        ▼
┌──────────────────────────────┐
│        Load Balancer         │
│   (Node.js + Express)        │
│                              │
│  - Reverse Proxy             │
│  - Consistent Hashing        │
│  - RPS Measurement           │
│  - Dynamic Backend Routing   │
└───────────────┬──────────────┘
                │
        ┌───────┼──────────┐
        │       │          │
        ▼       ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Backend  │ │ Backend  │ │ Backend  │
│ Docker   │ │ Docker   │ │ Docker   │
│ Stateless│ │ Stateless│ │ Stateless│
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │              │            │
     └──────────────┴────────────┘
                    ▼
             ┌────────────────┐
             │     Redis      │
             │                │
             │ active_backends│
             │ backend:<id>   │
             │ lb:rps         │
             │ hot cache      │
             └───────┬────────┘
                     ▼
             ┌────────────────┐
             │   Autoscaler   │
             │ (Docker API)   │
             │                │
             │ - Reads RPS    │
             │ - Starts Pods  │
             │ - Stops Pods   │
             └────────────────┘

🔄 End-to-End Request Flow
1️⃣ Client → Load Balancer

All traffic goes through the custom load balancer:

http://localhost:8080/api/...


The load balancer:

Acts as a reverse proxy

Is the only public entry point

Knows nothing about MongoDB or paste logic

2️⃣ Load Balancer Responsibilities

For every request, the load balancer:

Increments RPS counter

Selects a backend using consistent hashing

Forwards the request

Never stores state

This ensures:

Horizontal scalability

Stateless routing

Minimal coupling

⚖️ Consistent Hashing (Why & How)

Instead of round-robin, this project uses consistent hashing.

Why?

When backends scale up/down, only a small subset of keys are remapped

Requests for the same paste ID go to the same backend

Improves cache locality

Behavior:

Hash ring rebuilt when backend list changes

Keys mapped deterministically to backends

Scaling causes minimal disruption

🧠 Redis — The System Backbone

Redis is used as a shared coordination layer.

Redis Data Model
Key	Purpose
active_backends (SET)	List of live backend addresses
backend:<id> (TTL)	Heartbeat / liveness
lb:rps	Requests-per-second metric
cache:paste:<id>	Hot paste cache
❤️ Health Checks & Heartbeats

Each backend is considered alive only if:

backend:<id> exists in Redis


Heartbeats use TTL

If a backend crashes:

TTL expires

Load balancer removes it

No manual cleanup required

This mimics:

Kubernetes liveness probes

ECS task health checks

📈 Autoscaling — How It Works
Metrics Source

Load balancer writes RPS to Redis every second:

lb:rps

Autoscaler Loop

Every 5 seconds, autoscaler:

Reads current RPS

Counts running Docker backends

Decides scale up / down

⬆️ Scale-Up Behavior

Triggered when:

RPS > SCALE_UP_THRESHOLD


What happens:

Autoscaler starts one new Docker backend

Docker assigns a host port

Autoscaler registers:

localhost:<port>


Redis heartbeat begins

Load balancer auto-discovers it

Hash ring updates

Important Design Choice

Scale up happens incrementally

Prevents overreaction

Matches Kubernetes HPA behavior

⬇️ Scale-Down Behavior

Triggered when:

RPS < SCALE_DOWN_THRESHOLD


What happens:

Autoscaler stops one backend

Backend shuts down gracefully

Redis TTL expires

Load balancer removes backend

Traffic redistributes safely

🛑 Graceful Shutdown (Critical)

When a backend is stopped:

Stops accepting new requests

Finishes in-flight requests

Deregisters itself cleanly

Prevents dropped traffic

This avoids:

502 errors

Half-written responses

Client retries

⏸️ Cooldown (Thrashing Prevention)

After any scaling action:

Autoscaler waits COOLDOWN_MS

No scaling decisions allowed during cooldown

This prevents:

Rapid scale up/down oscillations

Resource waste

System instability

🚦 Rate Limiting (Two Layers)
1️⃣ Local Rate Limiting (Per Instance)

Implemented using in-memory Map:

Protects individual backend from bursts

Extremely fast

No network call

Used for:

Sudden spikes

Accidental client loops

2️⃣ Global Rate Limiting (Distributed)

Implemented using Redis INCR + TTL:

Shared across all backends

Prevents abuse across instances

Works even during scaling

Example:

rate:read:<ip>:<pasteId>
rate:write:<ip>


If Redis fails:

System fails open

Availability prioritized over strict enforcement

🔥 Hot Data Cache (Redis)

Frequently accessed pastes are cached:

cache:paste:<id>


Behavior:

Read-through cache

TTL-based eviction

Reduces DB load

Improves latency

Cache invalidation:

TTL expiry

Paste expiry

View-limit reached

🧪 Failure Scenarios Handled
Failure	Behavior
Backend crash	TTL expires → removed
Redis down	System continues (degraded)
Traffic spike	Autoscaling absorbs
Backend overload	Rate limiting protects
Scale-down	Graceful termination
🛠 Tech Stack

Node.js / Express

Redis

Docker

MongoDB

Consistent Hashing

Custom Autoscaler

🧠 What This Project Demonstrates

Real distributed systems thinking

Tradeoffs between consistency & availability

Stateless service design

Service discovery without Kubernetes

Autoscaling logic from first principles

Failure handling and resilience


run this for 30 - 40 second , it will create 5-servers to distribute load accordingly 

<!-- while true; do
  for i in {1..100}; do
    curl http://localhost:8080/api/pastes/p/test123 &
  done
  sleep 1
done -->


to clear redis backend cache 
<!-- redis-cli -u redis://default:nV1MPOK1tRSEWIz5Sixszolu5rFSqwtE@redis-19285.crce182.ap-south-1-1.ec2.cloud.redislabs.com:19285 DEL active_backends -->