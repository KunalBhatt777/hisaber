# Entry point for the Centsible Receipt Scanner API.
# Starts a FastAPI app, applies CORS so the React Native app can call it
# from any origin (fine for local dev), then mounts all receipt routes.

import logging

logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.receipt import router as receipt_router

app = FastAPI(title="Centsible Receipt Scanner")

# Allow all origins so the RN dev build on a physical device can reach the
# server running on your laptop over the local WiFi network.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all /api/receipt/* endpoints
app.include_router(receipt_router)


# Simple liveness check — hit GET /health to confirm the server is up
@app.get("/health")
async def health():
    return {"status": "ok"}
