"""Structured shapes Gemini must answer in (sent as JSON Schema)."""

from typing import Literal

from pydantic import BaseModel, Field

from wardrobe.constants import CATEGORIES, COLORS, SEASONS, VIBES

Category = Literal[tuple(CATEGORIES)]
Colour = Literal[tuple(COLORS)]
Season = Literal[tuple(SEASONS)]
Vibe = Literal[tuple(VIBES)]


class PieceTags(BaseModel):
    name: str = Field(description='Short shop-style name, e.g. "Sage Linen Shirt". Max 5 words.')
    category: Category
    colors: list[Colour] = Field(description='Main colour first, at most 3.')
    pattern: str = Field(description='e.g. solid, striped, floral, embroidered, checked, denim wash.')
    seasons: list[Season]
    vibes: list[Vibe] = Field(description='Occasions this piece suits, at most 4.')


class OutfitPick(BaseModel):
    item_ids: list[str] = Field(description='IDs copied exactly from the wardrobe list.')
    name: str = Field(description='A catchy 2-4 word name for the look.')
    reasoning: str = Field(description='Two sentences on why these pieces work for the vibe.')
    color_story: str = Field(description='One sentence on the colour coordination.')


class MissingPiece(BaseModel):
    category: Category
    description: str = Field(description='What to add, e.g. "gold hoop earrings".')
    search_query: str = Field(description='A concise shopping search query for this exact piece.')
    why: str = Field(description='One sentence on how it would lift the outfit.')


class Evaluation(BaseModel):
    score: int = Field(ge=1, le=10)
    verdict: str = Field(description='One upbeat sentence summarising the look.')
    color_harmony: str
    vibe_fit: str
    tips: list[str] = Field(description='2-3 short styling tips.')
    missing: list[MissingPiece] = Field(description='0-2 pieces to buy that would enhance the look.')
