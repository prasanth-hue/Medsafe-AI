from typing import List, Optional

from pydantic import BaseModel, Field


class PatientIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: str = ""
    allergies: List[str] = []
    conditions: List[str] = []
    notes: str = ""
    elder_phone: str = ""
    elder_salutation: str = ""
    elder_lang: str = "en"
    reminder_channel: str = "both"
    elder_enabled: bool = True


class PatientMedicineIn(BaseModel):
    medicine: str = Field(..., min_length=1)


class ScheduleIn(BaseModel):
    medicine: str = Field(..., min_length=1)
    dose: str = ""
    frequency: str = ""
    period: str = "Morning"
    time: str = ""
    food: str = "Not specified"
    instruction: str = ""
    notes: str = ""


class CheckIn(BaseModel):
    medicines: List[str] = Field(..., min_items=1)
    patient_id: Optional[int] = None


class ExplainIn(BaseModel):
    a: str
    b: str
    patient_id: Optional[int] = None


class ChatIn(BaseModel):
    message: str = ""
    patient_id: Optional[int] = None


class LoginIn(BaseModel):
    identifier: str = Field(..., min_length=2)  # accepts email or phone number
    password: str = Field(..., min_length=1)


class RegisterIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=4)
    phone: str = Field(..., min_length=4)
    password: str = Field(..., min_length=4)
    role: str = "Clinician"
    plan: str = "trial"


class SubscriptionIn(BaseModel):
    user_id: int
    plan: str  # 'trial' | 'beginner' | 'pro'


class ElderConfigIn(BaseModel):
    patient_id: int
    elder_phone: str
    elder_salutation: str = ""
    elder_lang: str = "en"
    reminder_channel: str = "both"
    elder_enabled: bool = True


class TriggerReminderIn(BaseModel):
    patient_id: int
    channel: str = "call"  # 'call' | 'sms'
    period: Optional[str] = None
    lang: Optional[str] = None  # 'en' | 'hi' | 'te'
