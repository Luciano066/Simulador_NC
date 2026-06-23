# Physical conventions

The simulator uses natural units:

- `G = c = 1`.
- Mass `M`, radius `r`, angular momentum `L`, impact parameter `b`, and affine/proper-time lengths are measured in compatible length units.
- The Schwarzschild event horizon is `r_h = 2M`.
- The Schwarzschild photon sphere is `r_ph = 3M`.
- The impact parameter is `b = L / E` when `E != 0`.

## Classical Schwarzschild mode

For massive particles, the API uses the standard timelike radial equation:

```text
(dr/dtau)^2 + V_eff^2(r) = E^2
V_eff^2(r) = f(r) * (1 + L^2/r^2)
f(r) = 1 - 2M/r
```

`E` is the specific relativistic energy per unit rest mass. The frontend also exposes
an alternate plotting parameter `Ebar = (E^2 - 1) / 2` for the `U_eff` plot.

For photons, the API uses the null equation:

```text
(dr/dlambda)^2 + V_eff^2(r) = E^2
V_eff^2(r) = f(r) * L^2/r^2
b = L/E
```

The orbit integrator evolves `u(phi) = 1/r`:

```text
massive: u'' + u = M/L^2 + 3M u^2
photon:  u'' + u = 3M u^2
```

## Effective-potential outputs

The classical `/veff` endpoint returns two related quantities:

- `V_eff2`: the squared effective potential that is compared directly with `E^2`.
- `U_eff`: the frontend plotting potential in the `u = 1/r` formulation.

Do not compare `U_eff` with `E^2`; compare it with the matching frontend plotting
parameter. Use `V_eff2` when checking whether `E^2 < V_eff^2`.

## Noncommutative Schwarzschild mode

The NC model uses a Lorentzian smeared mass `m(r)` and

```text
f_nc(r) = 1 - 2 m(r) / r
```

The NC orbit and potential use a different energy convention:

```text
1/2 (dr/dlambda)^2 + V_eff(r) = E
V_eff(r) = f_nc(r) * (K + L^2/(2r^2))
K = 1/2 for massive particles
K = 0 for photons
```

The noncommutativity parameter `theta` has dimensions of length squared. In the
limit `theta -> 0`, the outer NC horizon approaches the Schwarzschild value `2M`.

## Maple/TCC approximation mode

The `/simulate_nc_maple` and `/veff_nc_maple` endpoints implement the approximate
timelike equation used to reproduce the Maple plots:

```text
u'' + u * (1 + 16 m sqrt(theta) kappa / (pi L^2))
  = 2 m kappa / L^2 + 3 m u^2 - 16 m sqrt(theta) u^3 / pi
```

The corresponding approximate metric factor and potential are:

```text
f(r) = 1 - 2m/r + 8m sqrt(theta)/(pi r^2)
V(r) = f(r) * (kappa + L^2/(2r^2))
```

The Maple/TCC mode does not receive `E` as an independent input. It computes:

```text
E = 0.5 L^2 (du0)^2 + V(r0)
r0 = 1/u0
```

This is intentionally separate from the full NC Schwarzschild mode, which uses
the Lorentzian smeared mass `m(r)`.

For orbit integration, Maple/TCC uses terminal events:

- `horizon_crossing`: stops when `r` crosses the outer approximate horizon, when it exists.
- `capture_radius`: fallback capture radius, defaulting to `r = 0.1`.
- `r_stop`: outward escape cutoff, defaulting to `r = 3`.
- `u <= 0` or nonfinite state values: stops instead of reflecting or continuing through invalid states.
