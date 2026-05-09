# LangChain LCEL chains for receipt scanning using Mistral Small vision model.
#
# Two chains are built here and imported by the route handlers:
#   validate_chain  — decides YES/NO whether an image is a receipt
#   extract_chain   — extracts store name + line items as structured JSON
#
# Both follow the same Runnable pipe pattern:
#   prompt | llm | parser
# where prompt = ChatPromptTemplate built from a SystemMessage + HumanMessage,
# and parser is either StrOutputParser (raw text) or with_structured_output
# (Pydantic model) depending on what we need back.

import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_mistralai import ChatMistralAI

from models.receipt import ReceiptExtraction

# Load MISTRAL_API_KEY from backend/.env
load_dotenv()

# Single shared LLM instance reused by both chains to avoid creating
# multiple HTTP clients. mistral-small-2603 supports vision (image input).
_llm = ChatMistralAI(
    model="mistral-small-2603",
    api_key=os.environ["MISTRAL_API_KEY"],
)


# ── Validate chain ────────────────────────────────────────────────────────────
# Asks the model one simple question: is this a receipt?
# Keeping the task minimal (YES/NO only) makes it fast and cheap.

_validate_system = SystemMessagePromptTemplate.from_template(
    "You are a receipt detection assistant. "
    "Your only job is to determine whether an image shows a retail or restaurant receipt. "
    "Reply with exactly one word: YES or NO. No punctuation, no explanation."
)

# HumanMessage carries the image as a base64 data URL so Mistral can see it
_validate_human = HumanMessagePromptTemplate.from_template(
    [
        {
            "type": "image_url",
            "image_url": {"url": "data:image/jpeg;base64,{image_base64}"},
        }
    ]
)

_validate_prompt = ChatPromptTemplate.from_messages([_validate_system, _validate_human])

# StrOutputParser returns the raw string ("YES" or "NO") which the route
# handler compares with == "YES" to produce a bool
validate_chain = _validate_prompt | _llm | StrOutputParser()


# ── Extract chain ─────────────────────────────────────────────────────────────
# Extracts structured line items from a confirmed receipt image.
# with_structured_output makes Mistral return JSON that maps to ReceiptExtraction,
# so no manual parsing is needed — LangChain handles it automatically.

_extract_system = SystemMessagePromptTemplate.from_template(
    "You are a receipt data extraction assistant. "
    "Extract structured data from receipt images with high accuracy. "
    "Never include totals, subtotals, tax lines, tips, discounts, or fees as items. "
    "Each purchased product should appear exactly once regardless of quantity printed. "
    "Item prices must be the per-item unit price as printed on the receipt. "
    "If a price is shown as a rate (e.g. '$2.99/lb', '1.49 lb', '3.50/kg'), "
    "use the final charged amount for that line item, not the rate — strip any unit suffixes like /lb, lb, /kg, kg. "
    "Always return price as a plain number (e.g. 4.37, not '4.37/lb'). "
    "For store_name: use only the short common brand name, maximum 10 characters, "
    "abbreviated if needed (e.g. 'Costco' not 'Costco Wholesale Chicago South Loop', "
    "'Walmart' not 'Walmart Supercenter #1234'). Use an empty string if the store name is unclear."
)

# HumanMessage includes both a text instruction and the image so the model
# knows exactly what to extract and has the visual input to work from
_extract_human = HumanMessagePromptTemplate.from_template(
    [
        {
            "type": "text",
            "text": (
                "Extract the store name and every individual purchased item with its price "
                "from this receipt. Do not include the final total, subtotal, tax, or tip."
            ),
        },
        {
            "type": "image_url",
            "image_url": {"url": "data:image/jpeg;base64,{image_base64}"},
        },
    ]
)

_extract_prompt = ChatPromptTemplate.from_messages([_extract_system, _extract_human])

# with_structured_output binds the ReceiptExtraction Pydantic schema to the
# LLM call so the response is automatically validated and deserialised
extract_chain = _extract_prompt | _llm.with_structured_output(ReceiptExtraction)
