from typing import List, Literal, Optional, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.limits import MAX_PARAMETER, MAX_PHI, MAX_POINTS, MAX_RADIUS

ParticleType = Literal["massive", "photon"]
MetricType = Literal["schwarzschild"]
RadialSign = Literal["out", "in"]  # out = increasing r, in = decreasing r


class RequestModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)


class VeffRequest(RequestModel):
    metric: MetricType = "schwarzschild"
    particle: ParticleType = Field(..., description="massive particle or photon")
    M: float = Field(1.0, gt=0, le=MAX_PARAMETER, description="black-hole mass in G=c=1 units")
    E: float = Field(1.0, gt=0, le=MAX_PARAMETER, description="specific energy for massive particles, E for photons")
    L: float = Field(..., ge=0, le=MAX_PARAMETER, description="angular momentum. Impact parameter b=L/E.")
    r_min: float = Field(2.05, gt=0, le=MAX_RADIUS)
    r_max: float = Field(50.0, gt=0, le=MAX_RADIUS)
    n: int = Field(2000, ge=10, le=MAX_POINTS)

    @model_validator(mode="after")
    def validate_range(self) -> Self:
        if self.r_max <= self.r_min:
            raise ValueError("r_max must be greater than r_min")
        return self


class VeffResponse(BaseModel):
    r: List[float]
    U_eff: List[float]
    V_eff2: Optional[List[float]] = None
    meta: dict


class SimulateRequest(RequestModel):
    metric: MetricType = "schwarzschild"
    particle: ParticleType = Field("massive")
    M: float = Field(1.0, gt=0, le=MAX_PARAMETER)
    E: float = Field(1.0, gt=0, le=MAX_PARAMETER, description="specific energy for massive particles, E for photons")
    L: float = Field(..., gt=0, le=MAX_PARAMETER, description="angular momentum. Impact parameter b=L/E.")
    r0: float = Field(..., gt=0, le=MAX_RADIUS)
    radial_sign: RadialSign = Field("in", description="'in' falls inward, 'out' starts outward")
    phi_max: float = Field(80.0, gt=0, le=MAX_PHI)
    n: int = Field(4000, ge=100, le=MAX_POINTS)


class SimulateResponse(BaseModel):
    phi: List[float]
    r: List[float]
    x: List[float]
    y: List[float]
    meta: dict


class VeffNCRequest(RequestModel):
    metric: Literal["nc-schwarzschild"] = "nc-schwarzschild"
    particle: ParticleType = Field(..., description="massive particle or photon")
    M: float = Field(1.0, gt=0, le=MAX_PARAMETER, description="black-hole mass in G=c=1 units")
    theta: float = Field(1.0, gt=0, le=MAX_PARAMETER, description="noncommutativity parameter with dimensions L^2")
    E: float = Field(0.3, ge=0, le=MAX_PARAMETER, description="energy in 1/2 rdot^2 + V_eff = E")
    L: float = Field(..., ge=0, le=MAX_PARAMETER, description="angular momentum")
    r_min: float = Field(0.02, gt=0, le=MAX_RADIUS)
    r_max: float = Field(50.0, gt=0, le=MAX_RADIUS)
    n: int = Field(2000, ge=10, le=MAX_POINTS)

    @model_validator(mode="after")
    def validate_range(self) -> Self:
        if self.r_max <= self.r_min:
            raise ValueError("r_max must be greater than r_min")
        return self


class VeffNCResponse(BaseModel):
    r: List[float]
    V_eff: List[float]
    meta: dict


class SimulateNCRequest(RequestModel):
    metric: Literal["nc-schwarzschild"] = "nc-schwarzschild"
    particle: ParticleType = Field("massive")
    M: float = Field(1.0, gt=0, le=MAX_PARAMETER)
    theta: float = Field(1.0, gt=0, le=MAX_PARAMETER, description="noncommutativity parameter with dimensions L^2")
    E: float = Field(0.3, ge=0, le=MAX_PARAMETER, description="energy in 1/2 rdot^2 + V_eff = E")
    L: float = Field(..., gt=0, le=MAX_PARAMETER, description="angular momentum")
    r0: float = Field(..., gt=0, le=MAX_RADIUS)
    r_stop: Optional[float] = Field(
        None,
        gt=0,
        le=MAX_RADIUS,
        description="optional escape-radius cutoff for visualization",
    )
    radial_sign: RadialSign = Field("in", description="'in' falls inward, 'out' starts outward")
    phi_max: float = Field(80.0, gt=0, le=MAX_PHI)
    n: int = Field(4000, ge=100, le=MAX_POINTS)


class SimulateNCResponse(BaseModel):
    phi: List[float]
    r: List[float]
    x: List[float]
    y: List[float]
    meta: dict
