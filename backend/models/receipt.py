# Pydantic models used for request validation and response serialisation.
# FastAPI uses these to auto-validate incoming JSON bodies and to document
# the API schema. The LangChain structured-output chain also uses
# ReceiptExtraction as its target schema, so field descriptions here feed
# directly into the JSON schema that Mistral receives.

from pydantic import BaseModel, Field
from typing import List


# ── Request bodies ────────────────────────────────────────────────────────────

class ValidateRequest(BaseModel):
    # Base64-encoded JPEG/PNG of the image the user selected
    image_base64: str


class ExtractRequest(BaseModel):
    # Same base64 image, sent after validation confirms it is a receipt
    image_base64: str


# ── Response shapes ───────────────────────────────────────────────────────────

class ValidationResult(BaseModel):
    # True if the image is a receipt, False otherwise
    is_receipt: bool


class ReceiptItem(BaseModel):
    # Human-readable item description as it appears on the receipt
    name: str
    # Final charged amount for this line (plain float, no unit suffixes)
    price: float


class ReceiptExtraction(BaseModel):
    # Short brand name, max 10 chars. The Field description is embedded in
    # the JSON schema passed to Mistral's structured-output call so the model
    # knows to abbreviate long store names (e.g. "Costco" not "Costco Wholesale Chicago South Loop").
    store_name: str = Field(
        description=(
            "Short common name of the store, maximum 10 characters, abbreviated if needed "
            "(e.g. 'Costco', 'Walmart', 'Target'). Empty string if unknown."
        )
    )
    # Ordered list of purchased items — does NOT include totals, taxes, or tips
    items: List[ReceiptItem]
