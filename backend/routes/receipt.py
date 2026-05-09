# Receipt scanning endpoints.
# Two-step flow that the React Native app calls in sequence:
#   1. POST /api/receipt/validate  — quick YES/NO check before doing heavy extraction
#   2. POST /api/receipt/extract   — full structured extraction (only called if step 1 passes)

from fastapi import APIRouter, HTTPException

from models.receipt import ValidateRequest, ExtractRequest, ValidationResult, ReceiptExtraction
from services.mistral_service import validate_chain, extract_chain

# All routes in this file are mounted under /api/receipt (see main.py)
router = APIRouter(prefix="/api/receipt", tags=["receipt"])


@router.post("/validate", response_model=ValidationResult)
async def validate_receipt(body: ValidateRequest) -> ValidationResult:
    """
    Checks whether the uploaded image is a receipt.
    The LLM replies with a single word (YES or NO).
    Returns { is_receipt: true/false } to the app.
    If is_receipt is false the app shows an error modal and stops here.
    """
    try:
        # ainvoke runs the LCEL chain asynchronously:
        # validate_prompt | mistral-small-2603 | StrOutputParser
        result: str = await validate_chain.ainvoke({"image_base64": body.image_base64})
        return ValidationResult(is_receipt=result.strip().upper() == "YES")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract", response_model=ReceiptExtraction)
async def extract_receipt(body: ExtractRequest) -> ReceiptExtraction:
    """
    Extracts structured line items from a confirmed receipt image.
    Uses with_structured_output so Mistral returns JSON that maps directly
    to ReceiptExtraction (store_name + list of items with name/price).
    The app uses this to pre-fill the AddItem screen for each item in sequence.
    """
    try:
        # ainvoke runs the LCEL chain asynchronously:
        # extract_prompt | mistral-small-2603.with_structured_output(ReceiptExtraction)
        result: ReceiptExtraction = await extract_chain.ainvoke({"image_base64": body.image_base64})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
