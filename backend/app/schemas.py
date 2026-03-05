from typing import Literal, List, Optional
from pydantic import BaseModel, Field

ParticleType = Literal["massive", "photon"]
MetricType = Literal["schwarzschild"]
RadialSign = Literal["out", "in"]  # out = aumentando r, in = diminuindo r


class VeffRequest(BaseModel):
    metric: MetricType = "schwarzschild"
    particle: ParticleType = Field(..., description="massive (partícula) ou photon (fóton)")
    M: float = Field(1.0, gt=0, description="massa do buraco negro (G=c=1)")
    E: float = Field(1.0, gt=0, description="energia específica (massivo) ou E (fóton). Use 1.0 p/ fóton.")
    L: float = Field(..., ge=0, description="L (massivo) ou L (fóton). O parâmetro de impacto é b=L/E.")
    r_min: float = Field(2.05, gt=0)
    r_max: float = Field(50.0, gt=0)
    n: int = Field(2000, ge=10, le=200000)

    def model_post_init(self, __context):
        if self.r_max <= self.r_min:
            raise ValueError("r_max deve ser maior que r_min")


class VeffResponse(BaseModel):
    r: List[float]
    U_eff: List[float]  # potencial efetivo (energia) na forma U_eff(u)
    V_eff2: Optional[List[float]] = None  # potencial na forma compatível com E^2 (opcional)
    meta: dict


class SimulateRequest(BaseModel):
    metric: MetricType = "schwarzschild"
    particle: ParticleType = Field("massive")
    M: float = Field(1.0, gt=0)
    E: float = Field(1.0, gt=0, description="energia específica (massivo) ou E (fóton). Use 1.0 p/ fóton.")
    L: float = Field(..., gt=0, description="L (massivo) ou L (fóton). b=L/E.")
    r0: float = Field(..., gt=0)
    radial_sign: RadialSign = Field("in", description="'in' cai, 'out' sai")
    phi_max: float = Field(80.0, gt=0)
    n: int = Field(4000, ge=100, le=200000)


class SimulateResponse(BaseModel):
    phi: List[float]
    r: List[float]
    x: List[float]
    y: List[float]
    meta: dict

class VeffNCRequest(BaseModel):
    metric: Literal["nc-schwarzschild"] = "nc-schwarzschild"
    particle: ParticleType = Field(..., description="massive (partícula) ou photon (fóton)")
    M: float = Field(1.0, gt=0, description="massa do buraco negro (G=c=1)")
    theta: float = Field(1.0, gt=0, description="parâmetro de não-comutatividade (L^2)")
    E: float = Field(0.3, ge=0, description="constante de energia na forma 1/2 rdot^2 + Veff = E.")
    L: float = Field(..., ge=0, description="momento angular l.")
    r_min: float = Field(0.02, gt=0)
    r_max: float = Field(50.0, gt=0)
    n: int = Field(2000, ge=10, le=200000)

    def model_post_init(self, __context):
        if self.r_max <= self.r_min:
            raise ValueError("r_max deve ser maior que r_min")


class VeffNCResponse(BaseModel):
    r: List[float]
    V_eff: List[float]
    meta: dict


class SimulateNCRequest(BaseModel):
    metric: Literal["nc-schwarzschild"] = "nc-schwarzschild"
    particle: ParticleType = Field("massive")
    M: float = Field(1.0, gt=0)
    theta: float = Field(1.0, gt=0, description="parâmetro de não-comutatividade (L^2)")
    E: float = Field(0.3, ge=0, description="constante de energia na forma 1/2 rdot^2 + Veff = E.")
    L: float = Field(..., gt=0, description="momento angular l.")
    r0: float = Field(..., gt=0)
    r_stop: Optional[float] = Field(
        None,
        gt=0,
        description="limite opcional de raio para encerrar trajetória de escape (visualização).",
    )
    radial_sign: RadialSign = Field("in", description="'in' cai, 'out' sai")
    phi_max: float = Field(80.0, gt=0)
    n: int = Field(4000, ge=100, le=200000)


class SimulateNCResponse(BaseModel):
    phi: List[float]
    r: List[float]
    x: List[float]
    y: List[float]
    meta: dict
