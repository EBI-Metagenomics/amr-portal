from pydantic import BaseModel, Field

class Release(BaseModel):
    label: str = Field()